# SpeechIR — Speech-Based Information Retrieval System

**SpeechIR** is a full-stack Information Retrieval (IR) engine for spoken-word audio. It transcribes lectures, podcasts, and recordings using OpenAI Whisper, then applies a classical IR pipeline — tokenization, stop-word removal, stemming, inverted indexing, and ranking — to make every spoken word instantly searchable.

---

## Architecture

```
MP3 / WAV / M4A
       ↓
Speech-to-Text (faster-whisper)
       ↓
Transcript Segments  ─────────────────────┐
       ↓                                   │
Text Normalization                         │
  • Lowercase                              │
  • Punctuation removal                    │
  • Tokenization (NLTK)                    │
  • Stop-word removal (EN)                 │
  • Porter Stemming                        │
       ↓                                   ↓
Inverted Index (SQLite)         TF-IDF Vectorizer (scikit-learn)
       ↓                                   ↓
BM25Okapi Re-ranking            Cosine Similarity Scoring
       └─────────────────┬─────────────────┘
                         ↓
                    Search API  (/search?scorer=bm25|tfidf)
                         ↓
                    React SPA  (results + audio player)
```

Each uploaded audio file becomes a **document** in the IR sense. The transcript is split into **segments** (Whisper's natural VAD-based chunks, typically 5–30 seconds) which serve as the retrieval unit — enabling precise jump-to-match playback.

---

## IR Pipeline

### 1. Document Representation

Each audio file maps to a set of transcript segments. Segments are the atomic retrieval unit: every segment has a start/end timestamp, making it possible to seek to the exact moment a query term was spoken.

### 2. Text Normalization

`worker/ir_processor.py` runs a full preprocessing pipeline on every segment before indexing:

| Step | Example |
|------|---------|
| Lowercase | `"Networks, Networking!"` → `"networks, networking!"` |
| Punctuation removal | `"networks, networking!"` → `"networks networking"` |
| Tokenization | `→ ["networks", "networking"]` |
| Stop-word removal | removes `the`, `is`, `and`, … |
| Porter Stemming | `connect / connected / connection` → `connect` |

### 3. Inverted Index

After transcription, an inverted index is written into SQLite (`inverted_index` table):

```
term  →  [ { seg_id, file_id, start_s }, … ]
```

Example entry:

```json
{
  "firewall": [
    { "seg_id": 14, "file_id": 1, "start_s": 532.0 },
    { "seg_id": 31, "file_id": 2, "start_s": 118.4 }
  ]
}
```

At query time, candidate segments are retrieved in O(1) per term from this index — no full-corpus scan.

### 4. Ranking

Two ranking algorithms are supported, selectable via `?scorer=`:

#### BM25 (default)

$$\text{BM25}(t, d) = \text{IDF}(t) \cdot \frac{f(t,d) \cdot (k_1 + 1)}{f(t,d) + k_1 \cdot \left(1 - b + b \cdot \frac{|d|}{\text{avgdl}}\right)}$$

Per-file `BM25Okapi` models are pickled after indexing (`data/bm25_{file_id}.pkl`) and loaded on demand at search time.

#### TF-IDF + Cosine Similarity

$$\text{TF-IDF}(t, d) = \text{TF}(t,d) \times \log\left(\frac{N}{\text{DF}(t)}\right)$$

$$\cos(\theta) = \frac{\vec{q} \cdot \vec{d}}{\|\vec{q}\| \cdot \|\vec{d}\|}$$

A `TfidfVectorizer` (sublinear TF, English stop-words) is fit on each file's segment corpus and pickled alongside the BM25 model (`data/tfidf_{file_id}.pkl`). At query time, the query string is transformed into the same vector space and cosine similarity is computed against all candidate segments.

### 5. Query Processing Pipeline

When a user submits a query, the system runs:

1. **Normalize** — lowercase, remove punctuation, tokenize
2. **Stop-word removal** — drop high-frequency terms
3. **Stem** — reduce to root form (Porter)
4. **Inverted index lookup** — retrieve candidate segments
5. **Re-rank** — BM25 or TF-IDF cosine similarity
6. **Snippet generation** — 80-character context window around first query-word hit, with HTML `<b>` highlighting

### 6. Dynamic Snippet Generation

Every result includes a contextual excerpt centered on the first occurrence of any query word in the original (pre-stemmed) text:

> `…intrusion detection systems can identify <b>malicious</b> traffic in real time…`

Window size is ±80 characters around the matched span.

### 7. Evaluation Metrics

The `/evaluate` endpoint and the in-app evaluation panel compute standard IR metrics against user-labeled relevant segments:

$$\text{Precision} = \frac{|R \cap S|}{|S|} \qquad \text{Recall} = \frac{|R \cap S|}{|R|} \qquad F_1 = \frac{2 \cdot P \cdot R}{P + R}$$

where $R$ is the set of relevant segment IDs and $S$ is the set of retrieved segment IDs.

---

## Project Structure

```
SpeechIR/
├── api/
│   ├── main.py               # FastAPI app, CORS, static media mount
│   ├── models.py             # SQLite connection and schema helpers
│   └── routes/
│       ├── upload.py         # POST /upload — streamed file upload, queues task
│       └── search.py         # GET /search, GET /evaluate, GET /status, GET /text
│                             # POST /reindex/{file_id}
├── worker/
│   ├── tasks.py              # Celery task — transcribe → index
│   ├── whisper_runner.py     # faster-whisper integration (VAD, int8)
│   ├── ir_processor.py       # normalize(), build_inverted_index(), make_snippet()
│   └── ir_persist.py         # SQLite index I/O + BM25/TF-IDF pickle storage
├── db/
│   └── schema.sql            # audio_files, segments, inverted_index, segments_fts
├── frontend/
│   ├── src/
│   │   ├── App.jsx           # root — view state, search, playback
│   │   ├── api/              # fetch helpers (relative URLs; Vite proxy in dev)
│   │   ├── components/       # SearchBar, ResultCard, EvalPanel, AudioPlayer, …
│   │   ├── hooks/            # useAudioManager, usePolling
│   │   └── lib/
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── nginx.conf            # production reverse proxy
│   └── Dockerfile.frontend
├── media/                    # uploaded audio files
├── data/                     # SQLite DB + BM25/TF-IDF pickles
├── docker-compose.yml
├── Dockerfile
└── requirements.txt
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Speech-to-Text | `faster-whisper` (OpenAI Whisper, int8, VAD) |
| IR Engine | NLTK (tokenization, Porter stemmer, stop-words) |
| Ranking — BM25 | `rank-bm25` (BM25Okapi) |
| Ranking — TF-IDF | `scikit-learn` TfidfVectorizer + cosine similarity |
| Inverted Index | SQLite (`inverted_index` table) |
| Backend | FastAPI + Celery + Redis |
| Database | SQLite (with FTS5 mirror for optional baseline) |
| Frontend | React 18 + Vite + Tailwind CSS |
| Deployment | Docker Compose + Nginx |

---

## Run with Docker

```bash
docker compose up -d --build
```

- **UI:** <http://localhost:5173>
- **API docs:** <http://localhost:8000/docs>

### Local dev (Vite + Docker backend)

```bash
# Terminal 1 — API, worker, Redis
docker compose up api worker redis

# Terminal 2 — Vite dev server
cd frontend
npm install
npm run dev
```

---

## API Reference

### Upload

```
POST /upload
Content-Type: multipart/form-data  (field: file)
```

```json
{ "file_id": 1, "status": "queued" }
```

### Search

```
GET /search?q=firewall&limit=20&scorer=bm25
GET /search?q=firewall&limit=20&scorer=tfidf
```

Pipeline: normalize query → inverted index lookup (up to 200 candidates) → BM25 or TF-IDF cosine re-ranking → return top `limit`.

```json
[
  {
    "seg_id": 42,
    "file_id": 1,
    "score": 8.5132,
    "scorer": "bm25",
    "ir_hits": 2,
    "filename": "lecture3.mp3",
    "start_s": 532.0,
    "end_s": 545.6,
    "excerpt": "…packet filtering and <b>firewall</b> rules are applied…",
    "playback_url": "/media/abc123_lecture3.mp3#t=532.0"
  }
]
```

### Re-index

```
POST /reindex/{file_id}
```

Rebuilds the inverted index and ranking models for a previously transcribed file without re-running Whisper. Returns immediately; indexing runs in the background.

### Evaluate

```
GET /evaluate?q=firewall&relevant_ids=42,43&limit=10&scorer=bm25
```

Returns `precision`, `recall`, `f1`, `tp`, `retrieved_count`, `relevant_count`, `retrieved_seg_ids`.

### Status / Transcripts

```
GET /status/{file_id}
GET /text?file_id=1
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `REDIS_URL` | `redis://redis:6379/0` | Celery broker |
| `DATABASE_PATH` | `speech_search.db` | SQLite file path |
| `DATA_DIR` | DB parent directory | BM25/TF-IDF pickle directory |
| `MEDIA_DIR` | `media/` | Uploaded audio storage |
| `WHISPER_MODEL` | `tiny` | Whisper model size (`tiny`/`base`/`small`/…) |
| `WHISPER_COMPUTE_TYPE` | `int8` | Quantization (`int8`, `float16`, `float32`) |
| `MAX_UPLOAD_BYTES` | `500000000` | Upload size limit |

---

## Notes

- **Re-indexing:** IR models are built when the worker finishes transcription. Files uploaded before this version have no TF-IDF pickle — call `POST /reindex/{file_id}` to backfill.
- **Empty query after normalization** (e.g. only stop-words): `/search` returns `[]`.
- **NLTK data** is pre-downloaded in the Dockerfile (`punkt`, `punkt_tab`, `stopwords`) for offline-safe container starts.
- **SQLite mount:** use a directory bind (`./data:/app/data`) — not a file bind — to avoid `unable to open database file`.

```bash
# If containers report database errors after remounting:
docker compose down --remove-orphans
docker compose up -d --build --force-recreate
```

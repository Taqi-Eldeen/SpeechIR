# SpeechIR — Speech-Based Information Retrieval System

**SpeechIR** is a full-stack search engine for spoken audio. You upload a
lecture, podcast, or recording; the system transcribes it with OpenAI Whisper
and then runs a classic Information Retrieval (IR) pipeline — tokenization,
stop-word removal, stemming, an inverted index, and ranking — so that every
spoken word becomes searchable. When you click a result, the audio player jumps
straight to the moment that word was said.

---

## How It Works

```
MP3 / WAV / M4A
       ↓
Speech-to-Text  (faster-whisper)
       ↓
Transcript split into timestamped segments
       ↓
Text normalization
  • lowercase
  • remove punctuation
  • tokenize (NLTK)
  • remove English stop-words
  • Porter stemming
       ↓
┌─────────────────────────┬──────────────────────────────┐
Inverted index (SQLite)    TF-IDF vectorizer (scikit-learn)
       ↓                              ↓
BM25 re-ranking            Cosine-similarity scoring
       └────────────┬─────────────────┘
                    ↓
       Search API  (/search?scorer=bm25|tfidf)
                    ↓
       React web app  (results + audio player)
```

Each uploaded audio file is one **document**. Whisper splits its transcript
into **segments** (short 5–30 second chunks). A segment is the smallest unit the
search returns, and because every segment has a start/end timestamp, the player
can seek to the exact second a query word was spoken.

---

## The IR Pipeline (in plain words)

**1. Documents and segments.** One audio file = one document. It is broken into
timestamped transcript segments, which are what search actually returns.

**2. Text normalization.** Before indexing, every segment goes through
`worker/ir_processor.py`:

| Step | Example |
|------|---------|
| Lowercase | `"Networks, Networking!"` → `"networks, networking!"` |
| Remove punctuation | `"networks, networking!"` → `"networks networking"` |
| Tokenize | `→ ["networks", "networking"]` |
| Remove stop-words | drops `the`, `is`, `and`, … |
| Porter stemming | `connect / connected / connection` → `connect` |

**3. Inverted index.** The normalized terms are stored in an SQLite table that
maps each term to the segments it appears in:

```json
{
  "firewall": [
    { "seg_id": 14, "file_id": 1, "start_s": 532.0 },
    { "seg_id": 31, "file_id": 2, "start_s": 118.4 }
  ]
}
```

At search time, candidate segments are looked up directly from this index — no
scanning of the whole transcript.

**4. Ranking.** Two ranking methods are available, chosen with `?scorer=`:

- **BM25** (default): a per-file `BM25Okapi` model is built after indexing and
  saved to `data/bm25_{file_id}.pkl`. It scores stemmed tokens.
- **TF-IDF + cosine similarity**: a per-file scikit-learn `TfidfVectorizer`
  (sublinear TF, English stop-words) is fitted on the raw segment text and
  saved to `data/tfidf_{file_id}.pkl`. The query is projected into the same
  vector space and compared by cosine similarity.

**5. Query processing.** A user query is normalized → stop-words removed →
stemmed → looked up in the inverted index (up to 200 candidates) → re-ranked by
BM25 or TF-IDF → top results returned.

**6. Snippet generation.** Each result includes a short excerpt (±80 characters)
centered on the first query word, with the matched word wrapped in `<b>` tags:

> `…intrusion detection systems can identify <b>malicious</b> traffic in real time…`

**7. Evaluation.** The `/evaluate` endpoint compares search results against
segment IDs you mark as relevant and returns standard IR metrics:

```
Precision = |relevant ∩ retrieved| / |retrieved|
Recall    = |relevant ∩ retrieved| / |relevant|
F1        = 2·P·R / (P + R)
```

---

## Technologies Used

| Area | Technology | Why it is used |
|------|-----------|----------------|
| Speech-to-text | `faster-whisper` (OpenAI Whisper, `int8`, VAD filter) | Converts audio to timestamped text on CPU |
| Text processing | `NLTK` (`punkt`, `stopwords`, Porter stemmer) | Tokenization, stop-words, stemming |
| Ranking — BM25 | `rank-bm25` (`BM25Okapi`) | Default relevance ranking |
| Ranking — TF-IDF | `scikit-learn` `TfidfVectorizer` + cosine similarity | Alternative vector-space ranking |
| Inverted index & storage | `SQLite` | Index, segments, and file metadata |
| Web API | `FastAPI` + `uvicorn` | HTTP endpoints and auto docs |
| Background jobs | `Celery` + `Redis` | Runs transcription off the request thread |
| Frontend | `React 18` + `Vite` + `Tailwind CSS` | Single-page search UI and audio player |
| Deployment | `Docker Compose` + `Nginx` | Containerized build and reverse proxy |

Python deps are listed in [requirements.txt](requirements.txt); frontend deps in
[frontend/package.json](frontend/package.json).

---

## Project Structure — What Each File and Folder Does

### `api/` — FastAPI web server

| Path | What it does |
|------|--------------|
| [api/main.py](api/main.py) | Creates the FastAPI app, sets CORS, initializes the DB on startup, and serves `/media/{file}` with HTTP byte-range streaming (so audio players can seek) plus path-traversal protection. |
| [api/models.py](api/models.py) | SQLite connection helpers. Loads `db/schema.sql`, opens connections, and provides `create_audio_file`, `update_audio_status`, `insert_segment`. |
| [api/routes/upload.py](api/routes/upload.py) | `POST /upload` — saves the uploaded audio file and queues the Celery transcription task. |
| [api/routes/search.py](api/routes/search.py) | The search core. `GET /search` (inverted-index lookup + BM25/TF-IDF re-rank), `POST /reindex/{file_id}`, `GET /evaluate` (precision/recall/F1), `GET /status/{file_id}`, `GET /text`. |

### `worker/` — Celery background worker

| Path | What it does |
|------|--------------|
| [worker/tasks.py](worker/tasks.py) | The Celery task: transcribe an audio file → store segments → build IR models → mark the file `done` (or `error`). |
| [worker/whisper_runner.py](worker/whisper_runner.py) | Wraps `faster-whisper`. Lazily loads the model (cached) and yields `{start, end, text}` segments with VAD filtering. |
| [worker/ir_processor.py](worker/ir_processor.py) | The text pipeline: `normalize()` (lowercase, strip punctuation, tokenize, stop-words, stem), `build_inverted_index()`, and `make_snippet()` for highlighted excerpts. |
| [worker/ir_persist.py](worker/ir_persist.py) | Builds and saves IR artifacts for one file: writes the inverted-index rows and pickles the BM25 and TF-IDF models into `DATA_DIR`. |

### `db/` — Database schema

| Path | What it does |
|------|--------------|
| [db/schema.sql](db/schema.sql) | Defines the tables: `audio_files`, `segments`, `inverted_index`, and the `segments_fts` full-text mirror. |

### `frontend/` — React single-page app

| Path | What it does |
|------|--------------|
| [frontend/src/main.jsx](frontend/src/main.jsx) | React entry point that mounts the app. |
| [frontend/src/App.jsx](frontend/src/App.jsx) | Root component — owns view state, search, and audio playback wiring. |
| [frontend/src/api/](frontend/src/api/) | Thin `fetch` wrappers: `search.js`, `status.js`, `text.js`, `upload.js` (relative URLs, proxied by Vite in dev). |
| [frontend/src/components/](frontend/src/components/) | UI pieces: `Header`, `LandingPage`, `SearchBar`, `ResultsList`, `ResultCard`, `Snippet`, `NoResults`, `AudioPlayer`, `UploadPanel`, `UploadStatus`, `EvalPanel`. |
| [frontend/src/hooks/](frontend/src/hooks/) | `useAudioManager.js` (single shared audio element / seek-to-timestamp) and `usePolling.js` (poll upload status until done). |
| [frontend/src/lib/media.js](frontend/src/lib/media.js) | Helper for building media/playback URLs. |
| [frontend/src/index.css](frontend/src/index.css) | Tailwind directives and global styles. |
| [frontend/vite.config.js](frontend/vite.config.js) | Vite config and the dev proxy to the API. |
| [frontend/tailwind.config.js](frontend/tailwind.config.js) / [postcss.config.js](frontend/postcss.config.js) | Tailwind and PostCSS configuration. |
| [frontend/nginx.conf](frontend/nginx.conf) | Production reverse proxy (serves the built app, forwards API calls). |
| [frontend/Dockerfile.frontend](frontend/Dockerfile.frontend) | Builds the frontend image. |

### Root-level files

| Path | What it does |
|------|--------------|
| [docker-compose.yml](docker-compose.yml) | Orchestrates the `api`, `worker`, `redis`, and `frontend` services. |
| [Dockerfile](Dockerfile) | Builds the Python image (API + worker), pre-downloads NLTK data for offline starts. |
| [requirements.txt](requirements.txt) | Python dependencies. |
| `media/` | Uploaded audio files (created at runtime). |
| `data/` | SQLite database + BM25/TF-IDF pickle files (created at runtime). |

---

## Running the Project

### With Docker (recommended)

```bash
docker compose up -d --build
```

- **Web UI:** <http://localhost:5173>
- **API docs:** <http://localhost:8000/docs>

### Local development (Vite + Docker backend)

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
POST /upload     Content-Type: multipart/form-data  (field: file)
→ { "file_id": 1, "status": "queued" }
```

### Search

```
GET /search?q=firewall&limit=20&scorer=bm25
GET /search?q=firewall&limit=20&scorer=tfidf
```

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

Rebuilds the inverted index and ranking models for an already-transcribed file
without running Whisper again. Runs in the background.

### Evaluate

```
GET /evaluate?q=firewall&relevant_ids=42,43&limit=10&scorer=bm25
```

Returns `precision`, `recall`, `f1`, `tp`, `retrieved_count`,
`relevant_count`, `retrieved_seg_ids`.

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

- **Re-indexing:** IR models are built when the worker finishes transcription.
  Files uploaded before this version may have no TF-IDF pickle — call
  `POST /reindex/{file_id}` to backfill.
- **Empty query after normalization** (only stop-words): `/search` returns `[]`.
- **NLTK data** (`punkt`, `punkt_tab`, `stopwords`) is pre-downloaded in the
  Dockerfile so containers start without internet access.
- **SQLite mount:** bind a directory (`./data:/app/data`), not a single file,
  to avoid `unable to open database file`.

```bash
# If containers report database errors after remounting:
docker compose down --remove-orphans
docker compose up -d --build --force-recreate
```

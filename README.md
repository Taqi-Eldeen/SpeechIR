# SpeechIR — A speech-based information retrieval engine

**SpeechIR** extends the original MVP with a **local IR layer** (no external APIs): stemming, stopword removal, an **inverted index** in SQLite, and **BM25** re-ranking per lecture file. Audio is still transcribed with **faster-whisper**; search is IR-powered, not FTS-primary.

## What was implemented

- FastAPI backend with:
  - `POST /upload` — accept audio uploads and queue transcription
  - `GET /search?q=...` — **inverted index + BM25** over transcript segments
  - `GET /evaluate` — precision / recall / F1 vs. labeled relevant **segment** IDs
  - `GET /status/{file_id}` — transcription status
  - `GET /text` — list segments and full concatenated text (includes `seg_id`)
- Celery + Redis worker: transcribe, then **build inverted index + BM25 pickle**
- SQLite:
  - `segments`, `audio_files`
  - `inverted_index` (term → postings)
  - `segments_fts` + triggers (kept for optional baseline / tooling; **search uses IR**)
- `data/bm25_{file_id}.pkl` — BM25 model + segment order (under `DATA_DIR`)
- **React (Vite) + Tailwind** SPA under `frontend/` — search, upload, BM25 results, player view, optional eval panel

## Project structure

```text
speech-search/
├── api/
│   ├── main.py
│   ├── models.py
│   └── routes/
│       ├── upload.py
│       └── search.py
├── worker/
│   ├── tasks.py
│   ├── whisper_runner.py
│   ├── ir_processor.py    # normalize, inverted index build, snippets
│   └── ir_persist.py      # SQLite inverted index + BM25 pickle I/O
├── db/
│   └── schema.sql
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   ├── index.css
│   │   ├── api/           # fetch helpers (relative URLs; Vite proxy in dev)
│   │   ├── components/
│   │   ├── hooks/
│   │   └── lib/
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── nginx.conf         # production reverse proxy to api:8000
│   └── Dockerfile.frontend
├── media/
├── data/
├── docker-compose.yml
├── Dockerfile
└── requirements.txt
```

## Tech choices

- **Backend:** FastAPI
- **Queue:** Celery + Redis
- **Speech-to-text:** `faster-whisper`
- **IR:** NLTK (tokenize, stopwords, Porter stemmer) + `rank-bm25` (BM25Okapi)
- **Database:** SQLite (inverted index + optional FTS5 mirror)
- **Storage:** local filesystem (`media/`), BM25 pickles in `data/`

## Run with Docker

From the project root:

```bash
docker compose up -d --build
```

Open:

- **UI (SpeechIR SPA):** <http://localhost:5173> — nginx proxies `/search`, `/upload`, `/status`, `/text`, `/evaluate`, `/media` to the API
- **API docs:** <http://localhost:8000/docs>

### Local dev (API + Vite separately)

Terminal 1 — API, worker, Redis (or full `docker compose up` without frontend):

```bash
docker compose up api worker redis
```

Terminal 2 — Vite dev server (proxies API routes to port 8000):

```bash
cd frontend
npm install
npm run dev
```

Then open <http://localhost:5173>. CORS is enabled on the API for `localhost:5173` if you ever call `http://localhost:8000` directly from the browser instead of using the proxy.

Useful logs:

```bash
docker compose logs -f api
docker compose logs -f worker
```

Stop:

```bash
docker compose down
```

## API quick reference

### Upload

`POST /upload` (`multipart/form-data`, field name: `file`)

Response:

```json
{ "file_id": 1, "status": "queued" }
```

### Status

`GET /status/{file_id}`

Response example:

```json
{
  "id": 1,
  "filename": "lecture.mp3",
  "status": "processing",
  "error_message": null,
  "created_at": "2026-05-10 19:00:00"
}
```

### Search (IR)

`GET /search?q=transformer&limit=20`

Pipeline:

1. Normalize query (lowercase, strip punctuation, remove stopwords, stem).
2. Look up terms in `inverted_index`; group by `seg_id`, cap candidates (`200`).
3. For each `file_id`, load `data/bm25_{file_id}.pkl`, run `BM25Okapi.get_scores(query_terms)`.
4. Merge metadata, sort by BM25 score, return top `limit`.

Response example:

```json
[
  {
    "seg_id": 42,
    "file_id": 1,
    "score": 8.51,
    "ir_hits": 2,
    "filename": "lecture.mp3",
    "start_s": 134.4,
    "end_s": 140.2,
    "excerpt": "…about <b>transformer</b> attention…",
    "playback_url": "/media/abc123_lecture.mp3#t=134.4"
  }
]
```

### Evaluation (passage-level)

`GET /evaluate?q=transformer&relevant_ids=42,43&limit=10`

- `relevant_ids` — comma-separated **segment IDs** (ground truth), same IDs as in `/search` or `/text`.

Returns precision, recall, F1, and the retrieved segment id set.

### List all text

`GET /text` or `GET /text?file_id=1`

Each segment includes `seg_id` for labeling and evaluation.

## Environment variables

- `REDIS_URL` (default: `redis://redis:6379/0`)
- `DATABASE_PATH` (default in compose: `/app/data/speech_search.db`)
- `DATA_DIR` (default in compose: `/app/data` — BM25 pickles and DB directory)
- `MEDIA_DIR` (default in compose: `/app/media`)
- `WHISPER_MODEL` (default in compose: `tiny`)
- `WHISPER_COMPUTE_TYPE` (default: `int8`)
- `MAX_UPLOAD_BYTES` (default: `500000000`)

## Notes and gotchas

- **Re-indexing:** IR structures are built when the worker finishes transcription. Files transcribed **before** this IR update have segments but no `inverted_index` rows / BM25 pickle — **upload again** (or add a small “reindex” task) to populate them.
- **Empty query after normalization** (e.g. only stopwords): `/search` returns `[]`.
- **Docker NLTK data:** `Dockerfile` runs `nltk.download` for `punkt`, `punkt_tab`, and `stopwords` so containers start offline-safe.
- Uploads are streamed; playback URLs use stored file paths under `/media/`.

## Docker / SQLite data directory

Use a **directory** bind for SQLite and pickles:

- `./data:/app/data`
- `DATABASE_PATH=/app/data/speech_search.db`
- `DATA_DIR=/app/data`

If you ever see `unable to open database file`, recreate containers after fixing mounts:

```bash
docker compose down --remove-orphans
docker compose up -d --build --force-recreate
```

## Next improvements

- Reindex endpoint for existing `file_id` without re-transcription
- TF–IDF / cosine (scikit-learn) as an additional ranker
- Semantic search (local embeddings + FAISS)
- Tests for `/search` and `/evaluate`

import pickle
from collections import defaultdict
from pathlib import Path

from enum import Enum

from fastapi import APIRouter, BackgroundTasks, HTTPException, Query
from sklearn.metrics.pairwise import cosine_similarity

from api.models import get_db
from worker.ir_persist import bm25_path_for_file, persist_ir_for_file, tfidf_path_for_file
from worker.ir_processor import make_snippet, normalize


class Scorer(str, Enum):
    bm25 = "bm25"
    tfidf = "tfidf"


router = APIRouter()

CANDIDATE_LIMIT = 200


def _bm25_scores(fid: int, cands: list[dict], query_terms: list[str]) -> list[dict]:
    path = bm25_path_for_file(fid)
    if not path.is_file():
        return []
    with path.open("rb") as f:
        payload = pickle.load(f)
    seg_order: list[int] = payload["segment_ids"]
    bm25 = payload["bm25"]
    idx_map = {sid: i for i, sid in enumerate(seg_order)}
    scores = bm25.get_scores(query_terms)
    out = []
    for c in cands:
        i = idx_map.get(c["seg_id"])
        if i is None:
            continue
        out.append({"seg_id": c["seg_id"], "file_id": fid, "score": float(scores[i]), "hits": c["hits"]})
    return out


def _tfidf_scores(fid: int, cands: list[dict], query: str) -> list[dict]:
    path = tfidf_path_for_file(fid)
    if not path.is_file():
        return []
    with path.open("rb") as f:
        payload = pickle.load(f)
    seg_order: list[int] = payload["segment_ids"]
    vectorizer = payload["vectorizer"]
    matrix = payload["matrix"]
    idx_map = {sid: i for i, sid in enumerate(seg_order)}
    query_vec = vectorizer.transform([query])
    scores = cosine_similarity(query_vec, matrix).flatten()
    out = []
    for c in cands:
        i = idx_map.get(c["seg_id"])
        if i is None:
            continue
        out.append({"seg_id": c["seg_id"], "file_id": fid, "score": float(scores[i]), "hits": c["hits"]})
    return out


def run_ir_search(q: str, limit: int, scorer: str = "bm25") -> list[dict]:
    """Inverted-index candidate retrieval, then BM25 or TF-IDF cosine re-ranking per file."""
    query_terms = normalize(q)
    if not query_terms:
        return []

    with get_db() as db:
        placeholders = ",".join("?" * len(query_terms))
        rows = db.execute(
            f"""
            SELECT seg_id, file_id, start_s, COUNT(*) AS hits
            FROM inverted_index
            WHERE term IN ({placeholders})
            GROUP BY seg_id
            ORDER BY hits DESC, seg_id
            LIMIT ?
            """,
            (*query_terms, CANDIDATE_LIMIT),
        ).fetchall()

    if not rows:
        return []

    by_file: dict[int, list[dict]] = defaultdict(list)
    for r in rows:
        by_file[int(r["file_id"])].append(
            {"seg_id": int(r["seg_id"]), "hits": int(r["hits"])}
        )

    scored: list[dict] = []
    for fid, cands in by_file.items():
        if scorer == "tfidf":
            scored.extend(_tfidf_scores(fid, cands, q))
        else:
            scored.extend(_bm25_scores(fid, cands, query_terms))

    if not scored:
        return []

    seg_ids = [s["seg_id"] for s in scored]
    placeholders = ",".join("?" * len(seg_ids))
    with get_db() as db:
        meta_rows = db.execute(
            f"""
            SELECT s.id AS seg_id, s.file_id, s.start_s, s.end_s, s.text,
                   af.filename, af.filepath
            FROM segments s
            JOIN audio_files af ON s.file_id = af.id
            WHERE s.id IN ({placeholders})
            """,
            seg_ids,
        ).fetchall()
    meta = {int(m["seg_id"]): m for m in meta_rows}

    out: list[dict] = []
    for s in scored:
        m = meta.get(s["seg_id"])
        if not m:
            continue
        out.append(
            {
                "seg_id": s["seg_id"],
                "file_id": s["file_id"],
                "score": s["score"],
                "scorer": scorer,
                "ir_hits": s["hits"],
                "filename": m["filename"],
                "start_s": m["start_s"],
                "end_s": m["end_s"],
                "excerpt": make_snippet(m["text"], q),
                "playback_url": f"/media/{Path(m['filepath']).name}#t={float(m['start_s']):.1f}",
            }
        )

    out.sort(key=lambda x: x["score"], reverse=True)
    return out[:limit]


@router.get("/search")
def search(
    q: str = Query(..., min_length=1),
    limit: int = Query(20, ge=1, le=100),
    scorer: Scorer = Scorer.bm25,
):
    return run_ir_search(q, limit, scorer.value)


@router.post("/reindex/{file_id}")
def reindex(file_id: int, background_tasks: BackgroundTasks):
    """Rebuild inverted index and ranking models for a file without re-transcribing."""
    with get_db() as db:
        row = db.execute(
            "SELECT id, status FROM audio_files WHERE id = ?", (file_id,)
        ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="file_id not found")
    if row["status"] != "done":
        raise HTTPException(status_code=409, detail=f"file not ready (status: {row['status']})")
    background_tasks.add_task(persist_ir_for_file, file_id)
    return {"file_id": file_id, "status": "reindexing"}


@router.get("/evaluate")
def evaluate(
    q: str = Query(..., min_length=1),
    relevant_ids: str = Query(
        ...,
        description="Comma-separated relevant segment IDs (passage-level ground truth).",
    ),
    limit: int = Query(10, ge=1, le=100),
    scorer: Scorer = Scorer.bm25,
):
    """
    Precision / recall / F1 over segment IDs returned by /search vs. your labeled relevant set.
    `relevant_ids` are segment ids (see /search results or /text).
    """
    relevant = {int(x.strip()) for x in relevant_ids.split(",") if x.strip()}
    results = run_ir_search(q, limit=limit, scorer=scorer.value)
    retrieved = {int(r["seg_id"]) for r in results}
    tp = len(relevant & retrieved)
    precision = tp / len(retrieved) if retrieved else 0.0
    recall = tp / len(relevant) if relevant else 0.0
    f1 = (2 * precision * recall / (precision + recall)) if (precision + recall) > 0 else 0.0
    return {
        "precision": precision,
        "recall": recall,
        "f1": f1,
        "tp": tp,
        "retrieved_count": len(retrieved),
        "relevant_count": len(relevant),
        "retrieved_seg_ids": sorted(retrieved),
        "scorer": scorer.value,
    }


@router.get("/status/{file_id}")
def status(file_id: int):
    with get_db() as db:
        row = db.execute(
            "SELECT id, filename, status, error_message, created_at FROM audio_files WHERE id = ?",
            (file_id,),
        ).fetchone()
    if not row:
        return {"error": "not_found"}
    return dict(row)


@router.get("/text")
def list_text(file_id: int | None = None):
    with get_db() as db:
        if file_id is None:
            rows = db.execute(
                """
                SELECT
                  s.id AS seg_id,
                  af.id AS file_id,
                  af.filename AS filename,
                  s.start_s AS start_s,
                  s.end_s AS end_s,
                  s.text AS text
                FROM segments s
                JOIN audio_files af ON s.file_id = af.id
                ORDER BY af.id, s.start_s
                """
            ).fetchall()
        else:
            rows = db.execute(
                """
                SELECT
                  s.id AS seg_id,
                  af.id AS file_id,
                  af.filename AS filename,
                  s.start_s AS start_s,
                  s.end_s AS end_s,
                  s.text AS text
                FROM segments s
                JOIN audio_files af ON s.file_id = af.id
                WHERE af.id = ?
                ORDER BY s.start_s
                """,
                (file_id,),
            ).fetchall()

    segments = [dict(row) for row in rows]
    full_text = " ".join(seg["text"] for seg in segments).strip()
    return {"count": len(segments), "full_text": full_text, "segments": segments}

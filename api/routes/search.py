import pickle
from collections import defaultdict
from pathlib import Path

from fastapi import APIRouter, Query

from api.models import get_db
from worker.ir_persist import bm25_path_for_file
from worker.ir_processor import make_snippet, normalize


router = APIRouter()

CANDIDATE_LIMIT = 200


def run_ir_search(q: str, limit: int) -> list[dict]:
    """Inverted-index candidates, then BM25 re-ranking per file (local IR, no external APIs)."""
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
        path = bm25_path_for_file(fid)
        if not path.is_file():
            continue
        with path.open("rb") as f:
            payload = pickle.load(f)
        seg_order: list[int] = payload["segment_ids"]
        bm25 = payload["bm25"]
        idx_map = {sid: i for i, sid in enumerate(seg_order)}
        scores = bm25.get_scores(query_terms)

        for c in cands:
            seg_id = c["seg_id"]
            i = idx_map.get(seg_id)
            if i is None:
                continue
            scored.append(
                {
                    "seg_id": seg_id,
                    "file_id": fid,
                    "score": float(scores[i]),
                    "hits": c["hits"],
                }
            )

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
def search(q: str = Query(..., min_length=1), limit: int = Query(20, ge=1, le=100)):
    return run_ir_search(q, limit)


@router.get("/evaluate")
def evaluate(
    q: str = Query(..., min_length=1),
    relevant_ids: str = Query(
        ...,
        description="Comma-separated relevant segment IDs (passage-level ground truth).",
    ),
    limit: int = Query(10, ge=1, le=100),
):
    """
    Precision / recall / F1 over segment IDs returned by /search vs. your labeled relevant set.
    `relevant_ids` are **segment** ids (see /search results or /text).
    """
    relevant = {int(x.strip()) for x in relevant_ids.split(",") if x.strip()}
    results = run_ir_search(q, limit=limit)
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

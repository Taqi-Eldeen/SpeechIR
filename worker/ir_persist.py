import os
import pickle
from pathlib import Path

from rank_bm25 import BM25Okapi

from api.models import get_db
from worker.ir_processor import build_inverted_index, normalize


def data_dir() -> Path:
    explicit = os.getenv("DATA_DIR")
    if explicit:
        p = Path(explicit)
    else:
        db = Path(os.getenv("DATABASE_PATH", "speech_search.db"))
        p = db.parent
    p.mkdir(parents=True, exist_ok=True)
    return p


def bm25_path_for_file(file_id: int) -> Path:
    return data_dir() / f"bm25_{file_id}.pkl"


def persist_ir_for_file(file_id: int) -> None:
    """Build inverted index rows and BM25 pickle for one audio file after segments exist."""
    ddir = data_dir()
    with get_db() as db:
        db.execute("DELETE FROM inverted_index WHERE file_id = ?", (file_id,))
        db.commit()
        rows = db.execute(
            """
            SELECT id, file_id, start_s, text
            FROM segments
            WHERE file_id = ?
            ORDER BY id
            """,
            (file_id,),
        ).fetchall()

    segments = [
        {"id": int(r["id"]), "file_id": int(r["file_id"]), "start_s": float(r["start_s"]), "text": r["text"]}
        for r in rows
    ]

    inv = build_inverted_index(segments)
    with get_db() as db:
        for term, postings in inv.items():
            for p in postings:
                db.execute(
                    "INSERT INTO inverted_index(term, seg_id, file_id, start_s) VALUES (?,?,?,?)",
                    (term, p["seg_id"], p["file_id"], p["start_s"]),
                )
        db.commit()

    corpus = [normalize(s["text"]) for s in segments]
    path = bm25_path_for_file(file_id)
    if not corpus or not any(corpus):
        path.unlink(missing_ok=True)
        return

    bm25 = BM25Okapi(corpus)
    payload = {"segment_ids": [s["id"] for s in segments], "bm25": bm25}
    with path.open("wb") as f:
        pickle.dump(payload, f)

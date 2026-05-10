import os

from celery import Celery

from api.models import get_db, init_db, update_audio_status
from worker.ir_persist import persist_ir_for_file
from worker.whisper_runner import transcribe


redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
celery_app = Celery("speech_search", broker=redis_url, backend=redis_url)


@celery_app.task(name="worker.tasks.transcribe_audio")
def transcribe_audio(file_id: int, filepath: str):
    init_db()
    update_audio_status(file_id, "processing")
    try:
        with get_db() as db:
            for seg in transcribe(filepath):
                if seg["text"]:
                    db.execute(
                        "INSERT INTO segments(file_id, start_s, end_s, text) VALUES (?, ?, ?, ?)",
                        (file_id, seg["start"], seg["end"], seg["text"]),
                    )
            db.commit()
        persist_ir_for_file(file_id)
        update_audio_status(file_id, "done")
    except Exception as exc:  # noqa: BLE001
        update_audio_status(file_id, "error", str(exc))
        raise

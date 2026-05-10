import os
import uuid
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile

from api.models import create_audio_file
from worker.tasks import transcribe_audio


router = APIRouter()
MEDIA_DIR = Path(os.getenv("MEDIA_DIR", "media"))
MAX_UPLOAD_BYTES = int(os.getenv("MAX_UPLOAD_BYTES", str(500_000_000)))


@router.post("/upload")
async def upload(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename is required")

    MEDIA_DIR.mkdir(parents=True, exist_ok=True)
    safe_name = f"{uuid.uuid4().hex}_{Path(file.filename).name}"
    destination = MEDIA_DIR / safe_name

    total = 0
    with destination.open("wb") as out:
        while True:
            chunk = await file.read(1024 * 1024)
            if not chunk:
                break
            total += len(chunk)
            if total > MAX_UPLOAD_BYTES:
                out.close()
                destination.unlink(missing_ok=True)
                raise HTTPException(status_code=413, detail="File exceeds max upload size")
            out.write(chunk)

    file_id = create_audio_file(file.filename, str(destination))
    transcribe_audio.delay(file_id, str(destination))

    return {"file_id": file_id, "status": "queued"}

import mimetypes
import os
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from api.models import init_db
from api.routes.search import router as search_router
from api.routes.upload import router as upload_router

app = FastAPI(title="SpeechIR API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*", "Range"],
    expose_headers=["Content-Range", "Accept-Ranges", "Content-Length"],
)

media_dir = Path(os.getenv("MEDIA_DIR", "media"))
media_dir.mkdir(parents=True, exist_ok=True)

CHUNK_SIZE = 1024 * 256


@app.get("/media/{filename:path}")
async def serve_media(filename: str, range: Optional[str] = Header(None)):
    file_path = media_dir / filename

    try:
        file_path = file_path.resolve()
        file_path.relative_to(media_dir.resolve())
    except (ValueError, RuntimeError):
        raise HTTPException(status_code=403, detail="Forbidden")

    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="File not found")

    file_size = file_path.stat().st_size
    mime_type, _ = mimetypes.guess_type(str(file_path))
    mime_type = mime_type or "application/octet-stream"

    if range and range.startswith("bytes="):
        try:
            raw = range[6:]
            start_str, end_str = raw.split("-")
            start = int(start_str) if start_str else 0
            end = int(end_str) if end_str else file_size - 1
        except (ValueError, TypeError):
            raise HTTPException(status_code=416, detail="Invalid Range header")

        if start >= file_size or end >= file_size or start > end:
            raise HTTPException(
                status_code=416,
                detail="Range Not Satisfiable",
                headers={"Content-Range": f"bytes */{file_size}"},
            )

        length = end - start + 1

        def ranged_iter():
            with open(file_path, "rb") as f:
                f.seek(start)
                remaining = length
                while remaining > 0:
                    chunk = f.read(min(CHUNK_SIZE, remaining))
                    if not chunk:
                        break
                    remaining -= len(chunk)
                    yield chunk

        return StreamingResponse(
            ranged_iter(),
            status_code=206,
            media_type=mime_type,
            headers={
                "Content-Range": f"bytes {start}-{end}/{file_size}",
                "Accept-Ranges": "bytes",
                "Content-Length": str(length),
                "Cache-Control": "no-cache",
            },
        )

    def full_iter():
        with open(file_path, "rb") as f:
            while chunk := f.read(CHUNK_SIZE):
                yield chunk

    return StreamingResponse(
        full_iter(),
        media_type=mime_type,
        headers={
            "Accept-Ranges": "bytes",
            "Content-Length": str(file_size),
            "Cache-Control": "no-cache",
        },
    )


@app.on_event("startup")
def startup() -> None:
    init_db()


@app.get("/")
def root():
    return {
        "service": "SpeechIR API",
        "docs": "/docs",
        "frontend_dev": "http://localhost:5173",
    }


app.include_router(upload_router)
app.include_router(search_router)

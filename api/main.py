import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

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
    allow_headers=["*"],
)

media_dir = Path(os.getenv("MEDIA_DIR", "media"))
media_dir.mkdir(parents=True, exist_ok=True)

app.mount("/media", StaticFiles(directory=media_dir), name="media")


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

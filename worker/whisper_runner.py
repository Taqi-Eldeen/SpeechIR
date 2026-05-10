import os
from functools import lru_cache

from faster_whisper import WhisperModel


@lru_cache(maxsize=1)
def get_model() -> WhisperModel:
    model_name = os.getenv("WHISPER_MODEL", "tiny")
    # int8 provides a large CPU speedup for MVP usage.
    return WhisperModel(model_name, compute_type=os.getenv("WHISPER_COMPUTE_TYPE", "int8"))


def transcribe(filepath: str):
    model = get_model()
    segments, _info = model.transcribe(filepath, vad_filter=True)
    for segment in segments:
        yield {
            "start": float(segment.start),
            "end": float(segment.end),
            "text": segment.text.strip(),
        }

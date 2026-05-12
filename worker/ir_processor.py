import re
from collections import defaultdict

import nltk
from nltk.corpus import stopwords
from nltk.stem import PorterStemmer
from nltk.tokenize import word_tokenize

stemmer = PorterStemmer()
_STOPWORDS: set[str] | None = None


def _ensure_nltk() -> None:
    try:
        nltk.data.find("tokenizers/punkt")
    except LookupError:
        nltk.download("punkt", quiet=True)
    try:
        nltk.data.find("tokenizers/punkt_tab")
    except LookupError:
        nltk.download("punkt_tab", quiet=True)
    try:
        nltk.data.find("corpora/stopwords")
    except LookupError:
        nltk.download("stopwords", quiet=True)


def _stop_en() -> set[str]:
    global _STOPWORDS
    _ensure_nltk()
    if _STOPWORDS is None:
        _STOPWORDS = set(stopwords.words("english"))
    return _STOPWORDS


def normalize(text: str) -> list[str]:
    _ensure_nltk()
    text = text.lower()
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    tokens = word_tokenize(text)
    stop = _stop_en()
    tokens = [t for t in tokens if t not in stop and len(t) > 1]
    return [stemmer.stem(t) for t in tokens]


def build_inverted_index(segments: list[dict]) -> dict[str, list[dict]]:
    """
    segments: [{"id": int, "file_id": int, "start_s": float, "text": str}]
    returns: {"term": [{"seg_id": int, "file_id": int, "start_s": float}]}
    """
    index: dict[str, list[dict]] = defaultdict(list)
    for seg in segments:
        terms = normalize(seg["text"])
        seen: set[str] = set()
        for term in terms:
            if term not in seen:
                index[term].append(
                    {
                        "seg_id": seg["id"],
                        "file_id": seg["file_id"],
                        "start_s": seg["start_s"],
                    }
                )
                seen.add(term)
    return dict(index)


def query_highlight_words(query: str) -> list[str]:
    """Lowercased content words from raw query for snippet highlighting (not stems)."""
    _ensure_nltk()
    q = query.lower()
    q = re.sub(r"[^a-z0-9\s]", " ", q)
    tokens = word_tokenize(q)
    stop = _stop_en()
    return [t for t in tokens if t not in stop and len(t) > 1]


def make_snippet(text: str, query: str, window: int = 80) -> str:
    """Context window around first match of any query word; bold that span in original casing."""
    if not text:
        return ""
    words = query_highlight_words(query)
    lower = text.lower()
    for w in words:
        idx = lower.find(w)
        if idx != -1:
            start = max(0, idx - window)
            end = min(len(text), idx + len(w) + window)
            prefix = "…" if start > 0 else ""
            suffix = "…" if end < len(text) else ""
            chunk = text[start:end]
            rel = idx - start
            highlighted = (
                chunk[:rel] + "<b>" + chunk[rel : rel + len(w)] + "</b>" + chunk[rel + len(w) :]
            )
            return prefix + highlighted + suffix
    return (text[:80] + "…") if len(text) > 80 else text

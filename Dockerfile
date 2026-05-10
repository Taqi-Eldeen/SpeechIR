FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN python -c "import nltk; nltk.download('punkt'); nltk.download('stopwords')"
# NLTK 3.9+ uses punkt_tab for word_tokenize; ignore failure on older NLTK.
RUN python -c "import nltk; nltk.download('punkt_tab')" || true

COPY . .

RUN mkdir -p /app/media

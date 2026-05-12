export const searchSegments = (q, limit = 20, scorer = "bm25") =>
  fetch(`/search?q=${encodeURIComponent(q)}&limit=${limit}&scorer=${scorer}`).then((r) => {
    if (!r.ok) throw new Error(`Search failed: ${r.status}`);
    return r.json();
  });

export const searchSegments = (q, limit = 20) =>
  fetch(`/search?q=${encodeURIComponent(q)}&limit=${limit}`).then((r) => {
    if (!r.ok) throw new Error(`Search failed: ${r.status}`);
    return r.json();
  });

export const fetchFullText = (fileId) =>
  fetch(`/text?file_id=${fileId}`).then((r) => {
    if (!r.ok) throw new Error(`Text fetch failed: ${r.status}`);
    return r.json();
  });

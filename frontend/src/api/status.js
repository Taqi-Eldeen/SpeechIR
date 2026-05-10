export const pollStatus = (fileId) =>
  fetch(`/status/${fileId}`).then((r) => {
    if (!r.ok) throw new Error(`Status failed: ${r.status}`);
    return r.json();
  });

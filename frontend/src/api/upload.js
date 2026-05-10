export const uploadFile = (file) => {
  const form = new FormData();
  form.append("file", file);
  return fetch("/upload", { method: "POST", body: form }).then(async (r) => {
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.detail || `Upload failed: ${r.status}`);
    return data;
  });
};

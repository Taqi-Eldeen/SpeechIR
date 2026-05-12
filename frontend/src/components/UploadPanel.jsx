import { useCallback, useRef, useState } from "react";
import { uploadFile } from "../api/upload.js";
import UploadStatus from "./UploadStatus.jsx";

export default function UploadPanel({ uploads, setUploads }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);

  const onUpdate = useCallback(
    (fileId, patch) =>
      setUploads((prev) => prev.map((u) => (u.file_id === fileId ? { ...u, ...patch } : u))),
    [setUploads]
  );

  const handleFiles = async (files) => {
    const file = files?.[0];
    if (!file || busy) return;
    setBusy(true);
    try {
      const data = await uploadFile(file);
      setUploads((prev) => [{ file_id: data.file_id, filename: file.name, status: "pending" }, ...prev]);
    } catch (e) {
      setUploads((prev) => [
        { file_id: `err-${Date.now()}`, filename: file.name, status: "error", error_message: e.message || "Upload failed" },
        ...prev,
      ]);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <section className="neu p-5 space-y-4">
      <h2 className="text-sm font-bold text-neu-ink tracking-wide uppercase">Upload Audio</h2>

      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click(); }}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); void handleFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        className={`neu-inset cursor-pointer px-6 py-10 text-center text-sm transition select-none ${
          drag ? "text-neu-accent" : "text-neu-muted"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".mp3,.wav,.m4a,.mp4,.webm,audio/*"
          className="hidden"
          onChange={(e) => void handleFiles(e.target.files)}
        />
        <div className="flex flex-col items-center gap-2 pointer-events-none">
          <span className="text-3xl">{busy ? "⏳" : drag ? "🎯" : "🎙️"}</span>
          <span>{busy ? "Uploading…" : "Drop an audio file here, or click to choose"}</span>
          <span className="text-xs opacity-60">MP3 · WAV · M4A · MP4 · WebM</span>
        </div>
      </div>

      {/* Upload list */}
      {uploads.length ? (
        <ul className="space-y-2">
          {uploads.map((u) =>
            typeof u.file_id === "number" ? (
              <UploadStatus key={u.file_id} item={u} onUpdate={onUpdate} />
            ) : (
              <li key={u.file_id} className="neu-sm px-4 py-3 text-sm text-neu-danger">
                <span className="font-semibold">{u.filename}</span>: {u.error_message}
              </li>
            )
          )}
        </ul>
      ) : null}
    </section>
  );
}

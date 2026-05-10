import { useCallback, useRef, useState } from "react";
import { uploadFile } from "../api/upload.js";
import UploadStatus from "./UploadStatus.jsx";

export default function UploadPanel({ uploads, setUploads }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);

  const onUpdate = useCallback(
    (fileId, patch) => {
      setUploads((prev) =>
        prev.map((u) => (u.file_id === fileId ? { ...u, ...patch } : u))
      );
    },
    [setUploads]
  );

  const handleFiles = async (files) => {
    const file = files?.[0];
    if (!file || busy) return;
    setBusy(true);
    try {
      const data = await uploadFile(file);
      setUploads((prev) => [
        {
          file_id: data.file_id,
          filename: file.name,
          status: "pending",
        },
        ...prev,
      ]);
    } catch (e) {
      setUploads((prev) => [
        {
          file_id: `err-${Date.now()}`,
          filename: file.name,
          status: "error",
          error_message: e.message || "Upload failed",
        },
        ...prev,
      ]);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <section className="rounded-xl border border-dashed border-slate-300 bg-white/60 p-4 shadow-sm">
      <h2 className="mb-2 text-sm font-semibold text-speech-ink">Upload audio</h2>
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          void handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-lg border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-speech-muted transition ${
          drag ? "border-speech-accent bg-blue-50/50" : "hover:border-slate-300"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".mp3,.wav,.m4a,.mp4,.webm,audio/*"
          className="hidden"
          onChange={(e) => void handleFiles(e.target.files)}
        />
        {busy ? "Uploading…" : "Drop an audio file here, or click to choose"}
      </div>
      {uploads.length ? (
        <ul className="mt-4 space-y-2">
          {uploads.map((u) =>
            typeof u.file_id === "number" ? (
              <UploadStatus key={u.file_id} item={u} onUpdate={onUpdate} />
            ) : (
              <li
                key={u.file_id}
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
              >
                {u.filename}: {u.error_message}
              </li>
            )
          )}
        </ul>
      ) : null}
    </section>
  );
}

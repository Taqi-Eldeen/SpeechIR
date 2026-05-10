import { usePolling } from "../hooks/usePolling.js";

export default function UploadStatus({ item, onUpdate }) {
  const terminal = item.status === "done" || item.status === "error";

  usePolling(
    terminal ? null : item.file_id,
    (data) => {
      onUpdate(item.file_id, {
        status: data.status ?? item.status,
        error_message: data.error_message,
        filename: data.filename ?? item.filename,
      });
    },
    (data) => {
      onUpdate(item.file_id, {
        status: data.status ?? "error",
        error_message: data.error_message,
        filename: data.filename ?? item.filename,
      });
    },
    2000
  );

  const label =
    item.status === "done"
      ? "Transcription complete"
      : item.status === "error"
        ? "Error"
        : item.status === "processing"
          ? "Processing…"
          : "Queued…";

  return (
    <li className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm">
      <div className="min-w-0">
        <p className="truncate font-medium text-speech-ink">{item.filename}</p>
        <p className="text-xs text-speech-muted">
          file #{item.file_id} · {label}
        </p>
        {item.error_message ? (
          <p className="mt-1 text-xs text-red-600">{item.error_message}</p>
        ) : null}
      </div>
      <div className="shrink-0 pt-0.5">
        {item.status === "processing" || item.status === "pending" ? (
          <span
            className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-speech-accent border-t-transparent"
            aria-hidden
          />
        ) : item.status === "done" ? (
          <span className="text-lg text-emerald-600" title="Done">
            ✓
          </span>
        ) : item.status === "error" ? (
          <span className="text-lg text-red-600" title="Failed">
            ✕
          </span>
        ) : null}
      </div>
    </li>
  );
}

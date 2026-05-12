import { usePolling } from "../hooks/usePolling.js";

const STATUS_ICON = {
  done:       <span className="text-lg" style={{ color: "var(--neu-ok)" }} title="Done">✓</span>,
  error:      <span className="text-lg" style={{ color: "var(--neu-danger)" }} title="Failed">✕</span>,
  processing: <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: "var(--neu-accent)", borderTopColor: "transparent" }} aria-hidden />,
  pending:    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: "var(--neu-accent)", borderTopColor: "transparent" }} aria-hidden />,
};

const STATUS_LABEL = {
  done:       "Transcription complete — ready to search",
  error:      "Error",
  processing: "Transcribing…",
  pending:    "Queued…",
};

export default function UploadStatus({ item, onUpdate }) {
  const terminal = item.status === "done" || item.status === "error";

  usePolling(
    terminal ? null : item.file_id,
    (data) => onUpdate(item.file_id, { status: data.status ?? item.status, error_message: data.error_message, filename: data.filename ?? item.filename }),
    (data) => onUpdate(item.file_id, { status: data.status ?? "error", error_message: data.error_message, filename: data.filename ?? item.filename }),
    2000
  );

  return (
    <li className="neu-sm flex items-start justify-between gap-3 px-4 py-3">
      <div className="min-w-0 space-y-0.5">
        <p className="truncate text-sm font-semibold text-neu-ink">{item.filename}</p>
        <p className="text-xs text-neu-muted">
          file #{item.file_id} · {STATUS_LABEL[item.status] ?? item.status}
        </p>
        {item.error_message ? (
          <p className="text-xs" style={{ color: "var(--neu-danger)" }}>{item.error_message}</p>
        ) : null}
      </div>
      <div className="shrink-0 pt-0.5">{STATUS_ICON[item.status] ?? null}</div>
    </li>
  );
}

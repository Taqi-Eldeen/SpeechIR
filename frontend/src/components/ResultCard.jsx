import AudioPlayer from "./AudioPlayer.jsx";
import Snippet from "./Snippet.jsx";

function fmtTime(s) {
  const sec = Math.floor(Number(s) || 0);
  const m = Math.floor(sec / 60);
  const r = sec % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

export default function ResultCard({ result, playing, onPlay, relevant, onToggleRelevant }) {
  const score = Number(result.score);
  const start = Number(result.start_s);
  const scorerLabel = (result.scorer ?? "bm25").toUpperCase();

  return (
    <article className="neu p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="neu-badge px-3 py-0.5 text-xs font-semibold">
              {scorerLabel} {Number.isFinite(score) ? score.toFixed(4) : "—"}
            </span>
            {result.ir_hits != null ? (
              <span className="text-xs text-neu-muted">{result.ir_hits} term hit{result.ir_hits !== 1 ? "s" : ""}</span>
            ) : null}
          </div>
          <h3 className="truncate text-sm font-semibold text-neu-ink">{result.filename}</h3>
          <p className="text-xs text-neu-muted">
            seg #{result.seg_id} · {fmtTime(start)} – {fmtTime(result.end_s)}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <AudioPlayer playing={playing} />
          <button
            type="button"
            onClick={() => onPlay(result)}
            className="neu-btn-accent px-4 py-1.5 text-xs font-semibold"
          >
            ▶ Play
          </button>
        </div>
      </div>

      <div className="neu-inset px-4 py-3 rounded-[0.875rem]">
        <Snippet html={result.excerpt} />
      </div>

      {onToggleRelevant ? (
        <button
          type="button"
          onClick={() => onToggleRelevant(result.seg_id)}
          className={`relevant-toggle w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all select-none ${
            relevant ? "relevant-toggle--active" : ""
          }`}
          aria-pressed={!!relevant}
        >
          <span
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition-all ${
              relevant ? "border-transparent text-white" : "border-neu-muted text-transparent"
            }`}
            style={{
              background: relevant ? "var(--neu-accent)" : "transparent",
              boxShadow: relevant
                ? "0 0 0 3px rgba(78,110,242,0.25)"
                : "inset 2px 2px 4px var(--neu-dark), inset -2px -2px 4px var(--neu-light)",
            }}
          >
            <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
              <path d="M1 5l3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span style={{ color: relevant ? "var(--neu-accent)" : "var(--neu-muted)" }}>
            {relevant ? "✓ Marked as relevant" : "Mark as relevant"}
          </span>
          <span
            className="ml-auto text-xs px-2 py-0.5 rounded-full"
            style={{
              background: relevant ? "rgba(78,110,242,0.12)" : "transparent",
              color: relevant ? "var(--neu-accent)" : "transparent",
            }}
          >
            for evaluation
          </span>
        </button>
      ) : null}
    </article>
  );
}

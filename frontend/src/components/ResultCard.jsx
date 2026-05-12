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
      {/* Top row */}
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

        {/* Play controls */}
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

      {/* Snippet */}
      <div className="neu-inset px-4 py-3 rounded-[0.875rem]">
        <Snippet html={result.excerpt} />
      </div>

      {/* Relevance checkbox */}
      {onToggleRelevant ? (
        <label className="flex cursor-pointer items-center gap-2 text-xs text-neu-muted select-none">
          <span
            onClick={() => onToggleRelevant(result.seg_id)}
            className={`neu-btn flex h-5 w-5 items-center justify-center rounded text-xs font-bold transition-colors ${
              relevant ? "text-neu-accent" : "text-transparent"
            }`}
            style={{ boxShadow: relevant
              ? "inset 3px 3px 6px var(--neu-dark), inset -3px -3px 6px var(--neu-light)"
              : "4px 4px 8px var(--neu-dark), -4px -4px 8px var(--neu-light)"
            }}
          >
            ✓
          </span>
          <input
            type="checkbox"
            checked={!!relevant}
            onChange={() => onToggleRelevant(result.seg_id)}
            className="hidden"
          />
          Mark as relevant (for evaluation)
        </label>
      ) : null}
    </article>
  );
}

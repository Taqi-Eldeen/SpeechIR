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

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-slate-900 px-2 py-0.5 text-xs font-medium text-white">
              BM25 {Number.isFinite(score) ? score.toFixed(2) : "—"}
            </span>
            {result.ir_hits != null ? (
              <span className="text-xs text-speech-muted">{result.ir_hits} term hits</span>
            ) : null}
          </div>
          <h3 className="mt-2 truncate text-sm font-semibold text-speech-ink">
            {result.filename}
          </h3>
          <p className="text-xs text-speech-muted">
            seg #{result.seg_id} · {fmtTime(start)} – {fmtTime(result.end_s)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AudioPlayer playing={playing} />
          <button
            type="button"
            onClick={() => onPlay(result)}
            className="rounded-lg bg-speech-accent px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-blue-600"
          >
            Play
          </button>
        </div>
      </div>
      <div className="mt-3 border-t border-slate-100 pt-3">
        <Snippet html={result.excerpt} />
      </div>
      {onToggleRelevant ? (
        <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs text-speech-muted">
          <input
            type="checkbox"
            checked={!!relevant}
            onChange={() => onToggleRelevant(result.seg_id)}
            className="rounded border-slate-300"
          />
          Mark as relevant (for evaluation)
        </label>
      ) : null}
    </article>
  );
}

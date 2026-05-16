export default function NoResults({ query, onHome, onClear }) {
  return (
    <div className="neu p-8 text-center space-y-5">
      <div className="text-5xl">🔇</div>
      <div className="space-y-2">
        <h2 className="text-lg font-bold text-neu-ink">No results found</h2>
        <p className="text-sm text-neu-muted">
          No transcribed segments matched{" "}
          <span className="font-semibold text-neu-ink">"{query}"</span>
        </p>
      </div>
      <div className="text-xs text-neu-muted space-y-1 leading-relaxed max-w-xs mx-auto">
        <p>Try a different word or phrase, switch the ranking algorithm,</p>
        <p>or upload and transcribe more audio files.</p>
      </div>
      <div className="flex flex-wrap justify-center gap-3 pt-1">
        <button
          type="button"
          onClick={onClear}
          className="neu-btn-accent px-5 py-2.5 text-sm font-semibold"
        >
          Try another query
        </button>
        <button
          type="button"
          onClick={onHome}
          className="neu-btn px-5 py-2.5 text-sm font-medium text-neu-ink"
        >
          ← Home
        </button>
      </div>
    </div>
  );
}

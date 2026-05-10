export default function Header({ onLogoClick }) {
  return (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-4">
        <button
          type="button"
          onClick={onLogoClick}
          className="flex items-center gap-2 rounded-lg text-left transition hover:opacity-80"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-speech-accent text-lg font-bold text-white shadow-sm">
            S
          </span>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-speech-ink">SpeechIR</h1>
            <p className="text-xs text-speech-muted">Speech-based information retrieval</p>
          </div>
        </button>
      </div>
    </header>
  );
}

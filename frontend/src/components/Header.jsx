export default function Header({ onLogoClick }) {
  return (
    <header className="w-full" style={{ background: "var(--neu-bg)" }}>
      <div className="mx-auto flex max-w-3xl items-center gap-4 px-5 py-5">
        <button
          type="button"
          onClick={onLogoClick}
          className="flex items-center gap-3 rounded-neu text-left transition hover:opacity-90"
        >
          <span className="neu-logo flex h-11 w-11 items-center justify-center text-xl font-black text-white select-none">
            S
          </span>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-neu-ink leading-tight">
              SpeechIR
            </h1>
            <p className="text-xs text-neu-muted">Speech-based information retrieval</p>
          </div>
        </button>
      </div>
    </header>
  );
}

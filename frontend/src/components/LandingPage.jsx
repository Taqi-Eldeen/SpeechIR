export default function LandingPage({ onUpload }) {
  return (
    <div className="space-y-8 py-2">

      {/* ── Hero ── */}
      <div className="neu p-8 text-center space-y-4">
        {/* Arrow pointing up at the search bar */}
        <p className="text-xs text-neu-muted flex items-center justify-center gap-1.5">
          <span className="text-base">↑</span>
          Type a query above to search existing transcripts
        </p>

        <div className="border-t border-neu-dark/20 pt-5 space-y-3">
          <h2 className="text-2xl font-black text-neu-ink leading-tight">
            Search What Was{" "}
            <span style={{ color: "var(--neu-accent)" }}>Said</span>,<br />
            Not Just What Was Written
          </h2>
          <p className="text-neu-muted text-sm max-w-sm mx-auto leading-relaxed">
            Upload any audio — lecture, podcast, meeting, voice note — and every
            spoken word becomes instantly searchable with BM25 or TF-IDF ranking.
          </p>
          <div className="pt-1">
            <button
              type="button"
              onClick={onUpload}
              className="neu-btn-accent px-7 py-3 text-sm font-bold"
            >
              🎙️  Upload New Audio
            </button>
          </div>
        </div>
      </div>

      {/* ── How it works ── */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-neu-muted text-center mb-4">
          How It Works
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              step: "01", icon: "📤", title: "Upload",
              desc: "Drag & drop MP3, WAV, M4A, MP4 or WebM. Files up to 500 MB.",
            },
            {
              step: "02", icon: "🤖", title: "Transcribe",
              desc: "OpenAI Whisper converts speech to timestamped text segments automatically.",
            },
            {
              step: "03", icon: "🔍", title: "Search",
              desc: "Query with BM25 or TF-IDF. Click any result to jump to that exact moment.",
            },
          ].map(({ step, icon, title, desc }) => (
            <div key={step} className="neu p-5 space-y-3">
              <div className="flex items-center gap-3">
                <span
                  className="neu-inset flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-black"
                  style={{ color: "var(--neu-accent)" }}
                >
                  {step}
                </span>
                <span className="text-xl">{icon}</span>
              </div>
              <h3 className="font-bold text-neu-ink">{title}</h3>
              <p className="text-xs text-neu-muted leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Feature grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: "⚡", label: "BM25 Ranking",    sub: "Best-match retrieval" },
          { icon: "📐", label: "TF-IDF",           sub: "Cosine similarity" },
          { icon: "🎯", label: "Timestamps",       sub: "Jump to any moment" },
          { icon: "📊", label: "Precision / F1",   sub: "Built-in evaluation" },
        ].map(({ icon, label, sub }) => (
          <div key={label} className="neu-sm p-4 text-center space-y-1">
            <div className="text-2xl">{icon}</div>
            <p className="text-xs font-bold text-neu-ink">{label}</p>
            <p className="text-xs text-neu-muted">{sub}</p>
          </div>
        ))}
      </div>

      {/* ── Stats strip ── */}
      <div className="neu p-5">
        <div className="grid grid-cols-3">
          {[
            { val: "Whisper",      sub: "OpenAI ASR engine" },
            { val: "BM25 + TF-IDF", sub: "Dual ranking modes" },
            { val: "< 200 ms",    sub: "Typical search latency" },
          ].map(({ val, sub }, i) => (
            <div
              key={i}
              className={`px-4 text-center space-y-0.5 ${i > 0 ? "border-l" : ""}`}
              style={{ borderColor: "var(--neu-dark)" }}
            >
              <p className="text-sm font-black text-neu-ink">{val}</p>
              <p className="text-xs text-neu-muted">{sub}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

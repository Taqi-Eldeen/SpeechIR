export default function AudioPlayer({ playing }) {
  if (!playing) {
    return (
      <div className="flex h-8 items-end gap-0.5 opacity-30">
        <span className="inline-block h-2 w-1.5 rounded-sm" style={{ background: "var(--neu-muted)" }} />
        <span className="inline-block h-4 w-1.5 rounded-sm" style={{ background: "var(--neu-muted)" }} />
        <span className="inline-block h-2 w-1.5 rounded-sm" style={{ background: "var(--neu-muted)" }} />
      </div>
    );
  }

  return (
    <div className="flex h-8 items-end gap-0.5" aria-hidden>
      <span className="wave-bar inline-block h-6 w-1.5 origin-bottom rounded-sm" style={{ background: "var(--neu-accent)" }} />
      <span className="wave-bar inline-block h-6 w-1.5 origin-bottom rounded-sm" style={{ background: "var(--neu-accent)" }} />
      <span className="wave-bar inline-block h-6 w-1.5 origin-bottom rounded-sm" style={{ background: "var(--neu-accent)" }} />
    </div>
  );
}

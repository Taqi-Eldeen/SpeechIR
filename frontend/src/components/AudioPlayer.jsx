export default function AudioPlayer({ playing }) {
  if (!playing) {
    return (
      <div className="flex h-8 items-end gap-0.5 opacity-40">
        <span className="inline-block h-2 w-1 rounded-sm bg-slate-400" />
        <span className="inline-block h-3 w-1 rounded-sm bg-slate-400" />
        <span className="inline-block h-2 w-1 rounded-sm bg-slate-400" />
      </div>
    );
  }

  return (
    <div className="flex h-8 items-end gap-0.5" aria-hidden>
      <span className="wave-bar inline-block h-6 w-1 origin-bottom rounded-sm bg-speech-accent" />
      <span className="wave-bar inline-block h-6 w-1 origin-bottom rounded-sm bg-speech-accent" />
      <span className="wave-bar inline-block h-6 w-1 origin-bottom rounded-sm bg-speech-accent" />
    </div>
  );
}

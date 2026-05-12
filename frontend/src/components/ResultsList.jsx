import { useEffect, useMemo, useState } from "react";
import { fetchFullText } from "../api/text.js";
import { audioSrcFromPlaybackUrl } from "../lib/media.js";
import ResultCard from "./ResultCard.jsx";

export default function ResultsList({ results, playingKey, onPlay, relevantSet, onToggleRelevant, showEvalControls }) {
  const fileIds = useMemo(() => [...new Set(results.map((r) => r.file_id))], [results]);
  const [fullByFile, setFullByFile] = useState(() => new Map());

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const entries = await Promise.all(
        fileIds.map(async (id) => {
          try {
            const data = await fetchFullText(id);
            return [id, data.full_text ?? ""];
          } catch {
            return [id, ""];
          }
        })
      );
      if (!cancelled) setFullByFile(new Map(entries));
    };
    void run();
    return () => { cancelled = true; };
  }, [fileIds]);

  const grouped = useMemo(() => {
    const map = new Map();
    for (const r of results) {
      if (!map.has(r.file_id)) map.set(r.file_id, []);
      map.get(r.file_id).push(r);
    }
    return fileIds.map((id) => ({ file_id: id, filename: map.get(id)[0]?.filename ?? "", hits: map.get(id) }));
  }, [results, fileIds]);

  if (!results.length) return null;

  return (
    <div className="space-y-8">
      {grouped.map((g) => (
        <section key={g.file_id}>
          <h2 className="mb-3 text-sm font-bold text-neu-ink px-1">
            {g.filename}{" "}
            <span className="font-normal text-neu-muted">(file #{g.file_id})</span>
          </h2>
          <div className="space-y-4">
            {g.hits.map((r) => (
              <ResultCard
                key={r.seg_id}
                result={r}
                playing={playingKey === playKeyFor(r)}
                onPlay={onPlay}
                relevant={relevantSet.has(r.seg_id)}
                onToggleRelevant={showEvalControls ? onToggleRelevant : undefined}
              />
            ))}
          </div>

          {/* Full transcript */}
          <details className="neu mt-4 overflow-hidden">
            <summary className="neu-btn cursor-pointer px-5 py-3 text-sm font-semibold text-neu-ink flex items-center justify-between">
              <span>Full transcript (entire file)</span>
              <span className="text-neu-muted">▾</span>
            </summary>
            <div className="neu-inset mx-4 mb-4 mt-1 px-4 py-3 rounded-[0.875rem]">
              <pre className="max-h-[50vh] overflow-auto whitespace-pre-wrap break-words text-xs text-neu-ink leading-relaxed">
                {fullByFile.get(g.file_id) ?? "Loading…"}
              </pre>
            </div>
          </details>
        </section>
      ))}
    </div>
  );
}

function playKeyFor(r) {
  const base = audioSrcFromPlaybackUrl(r.playback_url);
  const start = Number(r.start_s) || 0;
  return `${base}@${start.toFixed(1)}`;
}

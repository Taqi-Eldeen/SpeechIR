import { useEffect, useMemo, useState } from "react";
import { fetchFullText } from "../api/text.js";
import { audioSrcFromPlaybackUrl } from "../lib/media.js";
import ResultCard from "./ResultCard.jsx";

export default function ResultsList({
  results,
  playingKey,
  onPlay,
  relevantSet,
  onToggleRelevant,
  showEvalControls,
}) {
  const fileIds = useMemo(() => {
    const ids = [...new Set(results.map((r) => r.file_id))];
    return ids;
  }, [results]);

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
      if (cancelled) return;
      setFullByFile(new Map(entries));
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [fileIds]);

  const grouped = useMemo(() => {
    const map = new Map();
    for (const r of results) {
      if (!map.has(r.file_id)) map.set(r.file_id, []);
      map.get(r.file_id).push(r);
    }
    return fileIds.map((id) => ({
      file_id: id,
      filename: map.get(id)[0]?.filename ?? "",
      hits: map.get(id),
    }));
  }, [results, fileIds]);

  if (!results.length) return null;

  return (
    <div className="space-y-8">
      {grouped.map((g) => (
        <section key={g.file_id}>
          <h2 className="mb-3 text-sm font-semibold text-speech-ink">
            {g.filename}{" "}
            <span className="font-normal text-speech-muted">(file #{g.file_id})</span>
          </h2>
          <div className="space-y-3">
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
          <details className="mt-4 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2">
            <summary className="cursor-pointer text-sm font-medium text-speech-ink">
              Full transcript (entire file)
            </summary>
            <pre className="mt-2 max-h-[50vh] overflow-auto whitespace-pre-wrap break-words rounded-md bg-white p-3 text-xs text-slate-800">
              {fullByFile.get(g.file_id) ?? "Loading…"}
            </pre>
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

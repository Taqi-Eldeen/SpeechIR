import { useMemo, useState } from "react";

export default function EvalPanel({ results, relevantSet, setRelevantSet }) {
  const [open, setOpen] = useState(false);
  const [totalRelevantCorpus, setTotalRelevantCorpus] = useState("");

  const metrics = useMemo(() => {
    const retrieved = results.length;
    const tp = results.filter((r) => relevantSet.has(r.seg_id)).length;
    const precision = retrieved ? tp / retrieved : 0;
    const denom = Number(totalRelevantCorpus);
    const recall =
      Number.isFinite(denom) && denom > 0 ? tp / denom : null;
    const f1 =
      recall != null && precision + recall > 0
        ? (2 * precision * recall) / (precision + recall)
        : null;

    return { retrieved, tp, precision, recall, f1 };
  }, [results, relevantSet, totalRelevantCorpus]);

  if (!results.length) return null;

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-speech-ink"
      >
        Evaluation (precision / recall)
        <span className="text-speech-muted">{open ? "−" : "+"}</span>
      </button>
      {open ? (
        <div className="space-y-3 border-t border-slate-100 px-4 py-3 text-sm">
          <p className="text-xs text-speech-muted">
            Mark relevant hits on each card. Precision = (marked relevant ∩ retrieved) /
            retrieved. Optionally set total relevant segments in the corpus for this query to
            estimate recall.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                setRelevantSet(new Set(results.map((r) => r.seg_id)))
              }
              className="rounded border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50"
            >
              Select all retrieved
            </button>
            <button
              type="button"
              onClick={() => setRelevantSet(new Set())}
              className="rounded border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50"
            >
              Clear selection
            </button>
          </div>
          <label className="flex flex-col gap-1 text-xs">
            <span className="font-medium text-speech-ink">
              Total relevant in collection for this query (optional)
            </span>
            <input
              type="number"
              min={0}
              value={totalRelevantCorpus}
              onChange={(e) => setTotalRelevantCorpus(e.target.value)}
              placeholder="e.g. 5"
              className="max-w-xs rounded border border-slate-200 px-2 py-1"
            />
          </label>
          <div className="rounded-lg bg-slate-50 px-3 py-2 font-mono text-xs text-speech-ink">
            <div>Retrieved: {metrics.retrieved}</div>
            <div>Marked relevant (TP): {metrics.tp}</div>
            <div>Precision: {metrics.precision.toFixed(3)}</div>
            <div>
              Recall: {metrics.recall == null ? "—" : metrics.recall.toFixed(3)}
            </div>
            <div>F1: {metrics.f1 == null ? "—" : metrics.f1.toFixed(3)}</div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

import { useMemo, useState } from "react";

function Metric({ label, value }) {
  return (
    <div className="neu-inset flex flex-col items-center justify-center px-4 py-3 rounded-[0.875rem] gap-1">
      <span className="text-xs text-neu-muted font-medium uppercase tracking-wide">{label}</span>
      <span className="text-xl font-bold text-neu-ink">
        {value == null ? "—" : typeof value === "number" ? value.toFixed(3) : value}
      </span>
    </div>
  );
}

export default function EvalPanel({ results, relevantSet, setRelevantSet }) {
  const [open, setOpen] = useState(false);
  const [totalRelevantCorpus, setTotalRelevantCorpus] = useState("");

  const metrics = useMemo(() => {
    const retrieved = results.length;
    const tp = results.filter((r) => relevantSet.has(r.seg_id)).length;
    const precision = retrieved ? tp / retrieved : 0;
    const denom = Number(totalRelevantCorpus);
    const recall = Number.isFinite(denom) && denom > 0 ? tp / denom : null;
    const f1 =
      recall != null && precision + recall > 0
        ? (2 * precision * recall) / (precision + recall)
        : null;
    return { retrieved, tp, precision, recall, f1 };
  }, [results, relevantSet, totalRelevantCorpus]);

  if (!results.length) return null;

  return (
    <div className="neu p-1">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="neu-btn w-full flex items-center justify-between px-5 py-3 text-sm font-semibold text-neu-ink"
      >
        <span>Evaluation — Precision / Recall / F1</span>
        <span className="text-neu-muted text-lg leading-none">{open ? "−" : "+"}</span>
      </button>

      {open ? (
        <div className="px-5 pb-5 pt-2 space-y-4">
          <p className="text-xs text-neu-muted leading-relaxed">
            Mark relevant hits on cards below. Precision = TP / retrieved.
            Set the total relevant count to estimate recall over the full collection.
          </p>

          {/* Quick select buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setRelevantSet(new Set(results.map((r) => r.seg_id)))}
              className="neu-btn px-3 py-1.5 text-xs font-medium text-neu-ink"
            >
              Select all retrieved
            </button>
            <button
              type="button"
              onClick={() => setRelevantSet(new Set())}
              className="neu-btn px-3 py-1.5 text-xs font-medium text-neu-ink"
            >
              Clear selection
            </button>
          </div>

          {/* Total relevant input */}
          <label className="flex flex-col gap-1.5 text-xs">
            <span className="font-semibold text-neu-ink">Total relevant in collection (optional)</span>
            <input
              type="number"
              min={0}
              value={totalRelevantCorpus}
              onChange={(e) => setTotalRelevantCorpus(e.target.value)}
              placeholder="e.g. 5"
              className="neu-inset w-32 px-3 py-2 text-sm text-neu-ink outline-none"
              style={{ background: "var(--neu-bg)" }}
            />
          </label>

          {/* Metric cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Metric label="Retrieved" value={metrics.retrieved} />
            <Metric label="TP" value={metrics.tp} />
            <Metric label="Precision" value={metrics.precision} />
            <Metric label="Recall" value={metrics.recall} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Metric label="F1" value={metrics.f1} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

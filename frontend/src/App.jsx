import { useCallback, useState } from "react";
import { searchSegments } from "./api/search.js";
import { fetchFullText } from "./api/text.js";
import EvalPanel from "./components/EvalPanel.jsx";
import Header from "./components/Header.jsx";
import ResultsList from "./components/ResultsList.jsx";
import SearchBar from "./components/SearchBar.jsx";
import Snippet from "./components/Snippet.jsx";
import UploadPanel from "./components/UploadPanel.jsx";
import { useAudioManager } from "./hooks/useAudioManager.js";
import { audioSrcFromPlaybackUrl } from "./lib/media.js";

function fmtTime(s) {
  const sec = Math.floor(Number(s) || 0);
  const m = Math.floor(sec / 60);
  const r = sec % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

export default function App() {
  const [view, setView] = useState("home");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploads, setUploads] = useState([]);
  const [activeAudio, setActiveAudio] = useState(null);
  const [playerTranscript, setPlayerTranscript] = useState("");
  const [relevantSet, setRelevantSet] = useState(() => new Set());

  const { play, stop, playingKey } = useAudioManager();

  const goHome = useCallback(() => {
    setView("home");
    stop();
    setActiveAudio(null);
  }, [stop]);

  const goResults = useCallback(() => {
    setView("results");
    setActiveAudio(null);
  }, []);

  const runSearch = useCallback(async () => {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setRelevantSet(new Set());
    try {
      const data = await searchSegments(q, 20);
      const list = Array.isArray(data) ? data : [];
      list.sort((a, b) => Number(b.score) - Number(a.score));
      setResults(list);
      setView(list.length ? "results" : "home");
    } catch {
      setResults([]);
      setView("home");
    } finally {
      setLoading(false);
    }
  }, [query]);

  const handlePlay = useCallback(
    async (result) => {
      const src = audioSrcFromPlaybackUrl(result.playback_url);
      const start = Number(result.start_s) || 0;
      play(src, start);
      setActiveAudio(result);
      setView("player");
      try {
        const t = await fetchFullText(result.file_id);
        setPlayerTranscript(t.full_text ?? "");
      } catch {
        setPlayerTranscript("");
      }
    },
    [play]
  );

  const toggleRelevant = useCallback((segId) => {
    setRelevantSet((prev) => {
      const next = new Set(prev);
      if (next.has(segId)) next.delete(segId);
      else next.add(segId);
      return next;
    });
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-speech-surface">
      <Header
        onLogoClick={() => {
          goHome();
          setResults([]);
          setQuery("");
        }}
      />

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        {view !== "player" ? (
          <SearchBar
            query={query}
            setQuery={setQuery}
            onSearch={runSearch}
            loading={loading}
          />
        ) : null}
        {view === "home" ? <UploadPanel uploads={uploads} setUploads={setUploads} /> : null}

        {view === "results" && results.length > 0 ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={goHome}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-speech-ink shadow-sm hover:bg-slate-50"
              >
                ← Back to home
              </button>
              <span className="text-sm text-speech-muted">
                {results.length} hit{results.length === 1 ? "" : "s"} for &ldquo;
                {query}&rdquo;
              </span>
            </div>
            <ResultsList
              results={results}
              playingKey={playingKey}
              onPlay={handlePlay}
              relevantSet={relevantSet}
              onToggleRelevant={toggleRelevant}
              showEvalControls
            />
            <EvalPanel
              results={results}
              relevantSet={relevantSet}
              setRelevantSet={setRelevantSet}
            />
          </div>
        ) : null}

        {view === "player" && activeAudio ? (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setView("results");
                  setActiveAudio(null);
                }}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm shadow-sm hover:bg-slate-50"
              >
                ← Back to results
              </button>
              <button
                type="button"
                onClick={goHome}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm shadow-sm hover:bg-slate-50"
              >
                Home
              </button>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-md">
              <p className="text-xs font-medium uppercase tracking-wide text-speech-muted">
                Now playing
              </p>
              <h2 className="mt-1 text-lg font-semibold text-speech-ink">
                {activeAudio.filename}
              </h2>
              <p className="text-sm text-speech-muted">
                From {fmtTime(activeAudio.start_s)} · BM25{" "}
                {Number(activeAudio.score).toFixed(2)}
              </p>
              <div className="mt-4 flex items-center gap-3">
                <div className="flex h-10 items-end gap-0.5" aria-hidden>
                  {playingKey ? (
                    <>
                      <span className="wave-bar inline-block h-8 w-1.5 origin-bottom rounded-sm bg-speech-accent" />
                      <span className="wave-bar inline-block h-8 w-1.5 origin-bottom rounded-sm bg-speech-accent" />
                      <span className="wave-bar inline-block h-8 w-1.5 origin-bottom rounded-sm bg-speech-accent" />
                    </>
                  ) : (
                    <>
                      <span className="inline-block h-3 w-1.5 rounded-sm bg-slate-300" />
                      <span className="inline-block h-5 w-1.5 rounded-sm bg-slate-300" />
                      <span className="inline-block h-3 w-1.5 rounded-sm bg-slate-300" />
                    </>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    play(
                      audioSrcFromPlaybackUrl(activeAudio.playback_url),
                      Number(activeAudio.start_s) || 0
                    )
                  }
                  className="rounded-xl bg-speech-accent px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-600"
                >
                  Play from match
                </button>
                <button
                  type="button"
                  onClick={() => stop()}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50"
                >
                  Stop
                </button>
              </div>
              <div className="mt-6 border-t border-slate-100 pt-4">
                <p className="text-xs font-medium text-speech-muted">Match snippet</p>
                <div className="mt-2">
                  <Snippet html={activeAudio.excerpt} />
                </div>
              </div>
              <details className="mt-4 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2">
                <summary className="cursor-pointer text-sm font-medium text-speech-ink">
                  Full transcript (entire file)
                </summary>
                <pre className="mt-2 max-h-[40vh] overflow-auto whitespace-pre-wrap break-words text-xs text-slate-800">
                  {playerTranscript || "Loading…"}
                </pre>
              </details>
            </div>
          </div>
        ) : null}

        {view === "home" && !loading && results.length === 0 ? (
          <p className="text-center text-sm text-speech-muted">
            Search transcribed lectures or upload a new audio file. Results open in a dedicated
            view; use Play to open the focused player.
          </p>
        ) : null}
      </main>
    </div>
  );
}

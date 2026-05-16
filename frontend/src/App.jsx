import { useCallback, useRef, useState } from "react";
import { searchSegments } from "./api/search.js";
import { fetchFullText } from "./api/text.js";
import EvalPanel from "./components/EvalPanel.jsx";
import Header from "./components/Header.jsx";
import LandingPage from "./components/LandingPage.jsx";
import NoResults from "./components/NoResults.jsx";
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
  // "landing" | "home" | "results" | "no-results" | "player"
  const [view, setView] = useState("landing");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploads, setUploads] = useState([]);
  const [activeAudio, setActiveAudio] = useState(null);
  const [playerTranscript, setPlayerTranscript] = useState("");
  const [relevantSet, setRelevantSet] = useState(() => new Set());
  const [scorer, setScorer] = useState("bm25");
  // shake the search bar on empty-submit attempt
  const [shake, setShake] = useState(false);
  const uploadRef = useRef(null);

  const { play, stop, playingKey } = useAudioManager();

  // Bug fix #6: logo goes home but KEEPS the query so user can see what they searched
  const goHome = useCallback(() => {
    setView("home");
    stop();
    setActiveAudio(null);
  }, [stop]);

  const goLanding = useCallback(() => {
    setView("landing");
    stop();
    setActiveAudio(null);
    setResults([]);
    setQuery("");
  }, [stop]);

  const goResults = useCallback(() => {
    setView("results");
    setActiveAudio(null);
  }, []);

  const runSearch = useCallback(async () => {
    const q = query.trim();
    // Bug fix #3: shake + stay put on empty query
    if (!q) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }
    setLoading(true);
    setRelevantSet(new Set());
    try {
      const data = await searchSegments(q, 20, scorer);
      const list = Array.isArray(data) ? data : [];
      list.sort((a, b) => Number(b.score) - Number(a.score));
      setResults(list);
      // Bug fix #1 & #5: show no-results view instead of silent home fallback
      // Also transitions away from landing when user searches
      setView(list.length ? "results" : "no-results");
    } catch {
      setResults([]);
      setView("no-results");
    } finally {
      setLoading(false);
    }
  }, [query, scorer]);

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
    <div className="min-h-screen" style={{ background: "var(--neu-bg)" }}>
      <Header
        onLogoClick={goLanding}
        showUploadButton={view !== "landing" && view !== "home"}
        onUploadClick={goHome}
      />

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">

        {/* Search bar — always visible except in player */}
        {view !== "player" ? (
          <SearchBar
            query={query}
            setQuery={setQuery}
            onSearch={runSearch}
            loading={loading}
            scorer={scorer}
            setScorer={setScorer}
            shake={shake}
          />
        ) : null}

        {/* ── Landing (shown until first interaction) ── */}
        {view === "landing" ? (
          <LandingPage
            onUpload={() => {
              setView("home");
              setTimeout(() => uploadRef.current?.click(), 100);
            }}
          />
        ) : null}

        {/* ── Home (upload panel) ── */}
        {view === "home" ? (
          <UploadPanel uploads={uploads} setUploads={setUploads} uploadRef={uploadRef} />
        ) : null}

        {/* ── No Results ── */}
        {view === "no-results" ? (
          <NoResults
            query={query}
            onHome={goHome}
            onClear={() => { setQuery(""); setView("home"); }}
          />
        ) : null}

        {/* ── Results ── */}
        {view === "results" && results.length > 0 ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={goHome}
                className="neu-btn px-4 py-2 text-sm font-medium text-neu-ink"
              >
                ← Home
              </button>
              <span className="text-sm text-neu-muted">
                {results.length} hit{results.length === 1 ? "" : "s"} for &ldquo;{query}&rdquo;
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

        {/* ── Player ── */}
        {view === "player" && activeAudio ? (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={goResults}
                className="neu-btn px-4 py-2 text-sm font-medium text-neu-ink"
              >
                ← Results
              </button>
              <button
                type="button"
                onClick={goHome}
                className="neu-btn px-4 py-2 text-sm font-medium text-neu-ink"
              >
                Home
              </button>
            </div>

            <div className="neu p-6 space-y-5">
              {/* Now playing header */}
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-neu-muted">Now Playing</p>
                <h2 className="mt-1 text-lg font-bold text-neu-ink">{activeAudio.filename}</h2>
                <p className="text-sm text-neu-muted">
                  From {fmtTime(activeAudio.start_s)} · {(activeAudio.scorer ?? "bm25").toUpperCase()}{" "}
                  {Number(activeAudio.score).toFixed(4)}
                </p>
              </div>

              {/* Waveform + controls */}
              <div className="flex items-center gap-4">
                <div className="neu-inset flex h-12 items-end gap-0.5 px-4 py-2 rounded-[0.875rem]" aria-hidden>
                  {playingKey ? (
                    <>
                      <span className="wave-bar inline-block h-6 w-1.5 origin-bottom rounded-sm" style={{ background: "var(--neu-accent)" }} />
                      <span className="wave-bar inline-block h-6 w-1.5 origin-bottom rounded-sm" style={{ background: "var(--neu-accent)" }} />
                      <span className="wave-bar inline-block h-6 w-1.5 origin-bottom rounded-sm" style={{ background: "var(--neu-accent)" }} />
                    </>
                  ) : (
                    <>
                      <span className="inline-block h-2 w-1.5 rounded-sm opacity-30" style={{ background: "var(--neu-muted)" }} />
                      <span className="inline-block h-4 w-1.5 rounded-sm opacity-30" style={{ background: "var(--neu-muted)" }} />
                      <span className="inline-block h-2 w-1.5 rounded-sm opacity-30" style={{ background: "var(--neu-muted)" }} />
                    </>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => play(audioSrcFromPlaybackUrl(activeAudio.playback_url), Number(activeAudio.start_s) || 0)}
                  className="neu-btn-accent px-5 py-2.5 text-sm font-semibold"
                >
                  ▶ Play from match
                </button>
                <button
                  type="button"
                  onClick={() => stop()}
                  className="neu-btn px-5 py-2.5 text-sm font-medium text-neu-ink"
                >
                  ■ Stop
                </button>
              </div>

              {/* Snippet */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-neu-muted mb-2">Match snippet</p>
                <div className="neu-inset px-4 py-3 rounded-[0.875rem]">
                  <Snippet html={activeAudio.excerpt} />
                </div>
              </div>

              {/* Full transcript */}
              <details className="neu overflow-hidden">
                <summary className="neu-btn cursor-pointer px-5 py-3 text-sm font-semibold text-neu-ink flex items-center justify-between">
                  <span>Full transcript</span>
                  <span className="text-neu-muted">▾</span>
                </summary>
                <div className="neu-inset mx-4 mb-4 mt-1 px-4 py-3 rounded-[0.875rem]">
                  <pre className="max-h-[40vh] overflow-auto whitespace-pre-wrap break-words text-xs text-neu-ink leading-relaxed">
                    {playerTranscript || "Loading…"}
                  </pre>
                </div>
              </details>
            </div>
          </div>
        ) : null}

      </main>
    </div>
  );
}

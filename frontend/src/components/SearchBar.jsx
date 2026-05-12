export default function SearchBar({ query, setQuery, onSearch, loading, scorer, setScorer }) {
  const submit = (e) => {
    e.preventDefault();
    onSearch();
  };

  return (
    <form onSubmit={submit} className="neu p-4 flex flex-col gap-3 sm:flex-row sm:items-center">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search transcripts…"
        disabled={loading}
        className="neu-inset min-w-0 flex-1 px-4 py-2.5 text-sm text-neu-ink placeholder:text-neu-muted outline-none"
        style={{ background: "var(--neu-bg)" }}
      />
      <select
        value={scorer}
        onChange={(e) => setScorer(e.target.value)}
        disabled={loading}
        className="neu-inset px-3 py-2.5 text-sm text-neu-ink outline-none"
        style={{ background: "var(--neu-bg)" }}
        title="Ranking algorithm"
      >
        <option value="bm25">BM25</option>
        <option value="tfidf">TF-IDF</option>
      </select>
      <button
        type="submit"
        disabled={loading || !query.trim()}
        className="neu-btn-accent px-5 py-2.5 text-sm font-semibold"
      >
        {loading ? "Searching…" : "Search"}
      </button>
    </form>
  );
}

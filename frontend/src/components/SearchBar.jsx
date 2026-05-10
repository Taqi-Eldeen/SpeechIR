export default function SearchBar({ query, setQuery, onSearch, loading }) {
  const submit = (e) => {
    e.preventDefault();
    onSearch();
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search transcripts…"
        className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none ring-speech-accent/30 placeholder:text-slate-400 focus:ring-2"
        disabled={loading}
      />
      <button
        type="submit"
        disabled={loading || !query.trim()}
        className="rounded-lg bg-speech-accent px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Searching…" : "Search"}
      </button>
    </form>
  );
}

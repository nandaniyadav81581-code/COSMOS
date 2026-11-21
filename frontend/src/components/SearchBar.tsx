import { useState } from "react";
import { useNavigate } from "react-router-dom";

/** Big rounded search box. Submitting opens /search?q=... */
export function SearchBar({ initial = "" }: { initial?: string }) {
  const [q, setQ] = useState(initial);
  const navigate = useNavigate();

  return (
    <form role="search" className="relative w-full"
      onSubmit={(e) => {
        e.preventDefault();
        if (q.trim()) navigate(`/search?q=${encodeURIComponent(q.trim())}`);
      }}>
      <label htmlFor="cosmos-search" className="sr-only">Search the research corpus</label>
      <input id="cosmos-search" value={q} onChange={(e) => setQ(e.target.value)}
        placeholder="Ask the research universe…"
        className="glass h-14 w-full rounded-full pl-6 pr-28 text-lg placeholder:text-navy-500/60 focus:outline-none focus:ring-4 focus:ring-lavender-200/70" />
      <button type="submit"
        className="absolute right-2 top-1/2 h-10 -translate-y-1/2 rounded-full bg-violet-500 px-5 font-medium text-white hover:bg-violet-600">
        Search
      </button>
    </form>
  );
}

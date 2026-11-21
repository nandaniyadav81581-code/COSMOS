import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { AsyncView } from "../components/AsyncView";
import { EmptyState, GlassCard, SectionHeader } from "../components/ui";
import { useAsync } from "../hooks/useAsync";
import type { PaperSort } from "../types";

const PAGE_SIZE = 10;

export function PapersPage() {
  const [q, setQ] = useState("");
  const [topic, setTopic] = useState("");
  const [country, setCountry] = useState("");
  const [sort, setSort] = useState<PaperSort>("newest");
  const [page, setPage] = useState(1);

  const papers = useAsync(
    () =>
      api.queryPapers({
        q: q || undefined,
        topic: topic || undefined,
        country: country || undefined,
        sort,
        page,
        page_size: PAGE_SIZE,
      }),
    [q, topic, country, sort, page]
  );

  const facets = useAsync(() => api.getFacets(), []);

  return (
    <main className="container-cosmos space-y-8 py-10">
      <SectionHeader
        eyebrow="Research library"
        title="Explore research papers"
        description="Search, filter and explore research from across the COSMOS corpus."
      />

      <GlassCard className="p-5">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <label className="space-y-2">
            <span className="text-sm font-semibold">Search papers</span>
            <input
              type="search"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Search title or keyword..."
              className="w-full rounded-xl border border-white/60 bg-white/70 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-400"
            />
          </label>

          <AsyncView state={facets} loading="Loading filters...">
            {(f) => (
              <>
                <label className="space-y-2">
                  <span className="text-sm font-semibold">Topic</span>
                  <select
                    value={topic}
                    onChange={(e) => {
                      setTopic(e.target.value);
                      setPage(1);
                    }}
                    className="w-full rounded-xl border border-white/60 bg-white/70 px-3 py-2 text-sm"
                  >
                    <option value="">All topics</option>
                    {f.topics.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.value} ({item.count})
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold">Country</span>
                  <select
                    value={country}
                    onChange={(e) => {
                      setCountry(e.target.value);
                      setPage(1);
                    }}
                    className="w-full rounded-xl border border-white/60 bg-white/70 px-3 py-2 text-sm"
                  >
                    <option value="">All countries</option>
                    {f.countries.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.value} ({item.count})
                      </option>
                    ))}
                  </select>
                </label>
              </>
            )}
          </AsyncView>

          <label className="space-y-2">
            <span className="text-sm font-semibold">Sort by</span>
            <select
              value={sort}
              onChange={(e) => {
                setSort(e.target.value as PaperSort);
                setPage(1);
              }}
              className="w-full rounded-xl border border-white/60 bg-white/70 px-3 py-2 text-sm"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="title">Title A–Z</option>
            </select>
          </label>
        </div>
      </GlassCard>

      <AsyncView state={papers} loading="Searching research papers...">
        {(result) => {
          const totalPages = Math.max(
            1,
            Math.ceil(result.total / result.page_size)
          );

          return (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-navy-500">
                  Showing {result.items.length} of {result.total} papers
                </p>

                <button
                  type="button"
                  onClick={() => {
                    setQ("");
                    setTopic("");
                    setCountry("");
                    setSort("newest");
                    setPage(1);
                  }}
                  className="text-sm font-semibold text-violet-600 hover:text-violet-800"
                >
                  Clear filters
                </button>
              </div>

              {result.items.length === 0 ? (
                <EmptyState
                  title="No papers found."
                  hint="Try changing your search or removing some filters."
                />
              ) : (
                <div className="space-y-4">
                  {result.items.map((paper) => (
                    <GlassCard key={paper.paper_id} className="p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <Link
                            to={`/papers/${paper.paper_id}`}
                            className="text-lg font-semibold leading-snug hover:text-violet-600"
                          >
                            {paper.title}
                          </Link>

                          <p className="mt-2 text-sm text-navy-500">
                            {paper.publication_year} ·{" "}
                            {paper.country ?? "Country unknown"} ·{" "}
                            {paper.journal ?? paper.conference ?? "Unknown venue"}
                          </p>
                        </div>

                        {paper.is_synthetic && (
                          <span className="rounded-full bg-blush-100 px-3 py-1 text-xs font-semibold">
                            Synthetic demo
                          </span>
                        )}
                      </div>

                      <p className="mt-3 text-sm leading-relaxed text-navy-700">
                        {paper.abstract.length > 300
                          ? `${paper.abstract.slice(0, 300)}…`
                          : paper.abstract}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {paper.derived.topics.slice(0, 4).map((item) => (
                          <span
                            key={item}
                            className="rounded-full bg-lavender-100 px-3 py-1 text-xs text-violet-700"
                          >
                            {item}
                          </span>
                        ))}
                      </div>

                      <div className="mt-4">
                        <Link
                          to={`/papers/${paper.paper_id}`}
                          className="text-sm font-semibold text-violet-600 hover:text-violet-800"
                        >
                          Read paper details →
                        </Link>
                      </div>
                    </GlassCard>
                  ))}
                </div>
              )}

              {result.total > 0 && (
                <div className="flex items-center justify-center gap-4 pt-4">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((current) => current - 1)}
                    className="rounded-xl bg-white/70 px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Previous
                  </button>

                  <span className="text-sm text-navy-600">
                    Page {page} of {totalPages}
                  </span>

                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((current) => current + 1)}
                    className="rounded-xl bg-white/70 px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          );
        }}
      </AsyncView>
    </main>
  );
}
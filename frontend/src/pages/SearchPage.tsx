import { useSearchParams } from "react-router-dom";
import { searchPapers } from "../api/search";
import { AsyncView } from "../components/AsyncView";
import { NeedsApi } from "../components/NeedsApi";
import { PaperCard } from "../components/PaperCard";
import { RelevanceBadge } from "../components/RelevanceBadge";
import { SearchBar } from "../components/SearchBar";
import { Chip, EmptyState } from "../components/ui";
import { useAsync } from "../hooks/useAsync";

function Results({ q }: { q: string }) {
  const state = useAsync(() => searchPapers(q), [q]);
  return (
    <AsyncView state={state} loading="Searching the research universe…">
      {(r) => (
        <>
          <div className="mt-8">
            <p className="eyebrow">Search results</p>
            <h1 className="mt-1 text-2xl font-semibold">“{r.query}”</h1>
            {r.interpretation.length > 0 && (
              <p className="mt-3 flex flex-wrap items-center gap-1.5 text-sm text-navy-500">
                Interpreted as: {r.interpretation.map((t) => <Chip key={t}>{t}</Chip>)}
              </p>
            )}
            <p className="mt-2 text-sm tabular-nums text-navy-500">{r.total.toLocaleString()} matching papers</p>
          </div>
          <div className="mt-6 space-y-4">
            {r.results.length === 0
              ? <EmptyState title="No strong semantic connection found." hint="Try broader wording." />
              : r.results.map((x) => (
                <div key={x.paper.paper_id}>
                  <PaperCard paper={x.paper} aside={<RelevanceBadge r={x.relevance} />} />
                  {x.relevance.matched_concepts.length > 0 && (
                    <p className="ml-5 mt-1 text-xs text-navy-500">Why matched: {x.relevance.matched_concepts.join(" · ")}</p>
                  )}
                </div>
              ))}
          </div>
        </>
      )}
    </AsyncView>
  );
}

export function SearchPage() {
  const [params] = useSearchParams();
  const q = params.get("q") ?? "";
  return (
    <div className="container-cosmos py-10">
      <div className="max-w-2xl"><SearchBar key={q} initial={q} /></div>
      <NeedsApi feature="Semantic search">
        {q ? <Results q={q} /> : <EmptyState title="Ask a question to search the corpus." />}
      </NeedsApi>
    </div>
  );
}

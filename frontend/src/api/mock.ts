import type {
  CorpusStats,
  CountValue,
  CountrySummary,
  DomainSummary,
  Facets,
  Paper,
  PaperPage,
  Taxonomy,
} from "../types";

import type { DataSource } from "./dataSource";

type Corpus = { papers: Paper[]; taxonomy: Taxonomy };

let loading: Promise<Corpus> | null = null;

/** Download demo files once and reuse them. */
function load(): Promise<Corpus> {
  if (!loading) {
    loading = Promise.all([
      fetch("/data/papers.json").then((r) => r.json() as Promise<Paper[]>),
      fetch("/data/taxonomy.json").then((r) => r.json() as Promise<Taxonomy>),
    ]).then(([papers, taxonomy]) => ({ papers, taxonomy }));
  }
  return loading;
}

/** Count how often each value appears. */
export function countValues(values: string[]): CountValue[] {
  const counts = new Map<string, number>();

  for (const v of values) {
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }

  return [...counts]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count);
}

/** Answers questions from the demo files. */
export const mockSource: DataSource = {
  async getStats(): Promise<CorpusStats> {
    const { papers } = await load();
    const years = papers.map((p) => p.publication_year);

    return {
      papers: papers.length,
      countries: new Set(papers.map((p) => p.country).filter(Boolean)).size,
      topics: new Set(papers.flatMap((p) => p.derived.topics)).size,
      organizations: new Set(papers.flatMap((p) => p.organizations)).size,
      year_from: Math.min(...years),
      year_to: Math.max(...years),
      synthetic: papers.some((p) => p.is_synthetic),
    };
  },

  async getTaxonomy() {
    return (await load()).taxonomy;
  },

  async getDomains(): Promise<DomainSummary[]> {
    const { papers, taxonomy } = await load();

    return taxonomy.domains.map((d) => ({
      ...d,
      paper_count: papers.filter((p) =>
        p.derived.topics.some((t) => d.topics.includes(t))
      ).length,
    }));
  },

  async getCountries(): Promise<CountrySummary[]> {
    const { papers, taxonomy } = await load();

    return taxonomy.countries
      .map((c) => {
        const mine = papers.filter((p) => p.country === c.name);
        const topTopics = countValues(
          mine.flatMap((p) => p.derived.topics)
        ).slice(0, 3);

        return {
          ...c,
          paper_count: mine.length,
          top_topics: topTopics.map((t) => t.value),
        };
      })
      .sort((a, b) => b.paper_count - a.paper_count);
  },

  async getRecentPapers(limit) {
    const { papers } = await load();

    return [...papers]
      .sort((a, b) =>
        b.publication_date.localeCompare(a.publication_date)
      )
      .slice(0, limit);
  },

  async getPaper(id) {
    const { papers } = await load();

    return papers.find((p) => p.paper_id === id) ?? null;
  },

  async queryPapers(q): Promise<PaperPage> {
    const { papers } = await load();

    const words = (q.q ?? "").toLowerCase().split(/\s+/).filter(Boolean);

    const matches = papers.filter((p) =>
      (!q.topic || p.derived.topics.includes(q.topic)) &&
      (!q.country || p.country === q.country) &&
      words.every((w) =>
        `${p.title} ${p.abstract}`.toLowerCase().includes(w)
      )
    );

    const sort = q.sort ?? "newest";

    matches.sort((a, b) =>
      sort === "title"
        ? a.title.localeCompare(b.title)
        : sort === "oldest"
          ? a.publication_date.localeCompare(b.publication_date)
          : b.publication_date.localeCompare(a.publication_date)
    );

    const page = Math.max(1, q.page ?? 1);
    const size = q.page_size ?? 25;

    return {
      items: matches.slice((page - 1) * size, page * size),
      total: matches.length,
      page,
      page_size: size,
    };
  },

  async getFacets(): Promise<Facets> {
    const { papers } = await load();

    return {
      topics: countValues(papers.flatMap((p) => p.derived.topics)),
      countries: countValues(
        papers.flatMap((p) => (p.country ? [p.country] : []))
      ),
    };
  },
};
import type {
  CorpusStats,
  CountrySummary,
  DomainSummary,
  Facets,
  Paper,
  PaperPage,
  PaperQuery,
  Taxonomy,
} from "../types";

/**
 * Everything the pages may ask for.
 * Pages never fetch data themselves.
 */
export interface DataSource {
  getStats(): Promise<CorpusStats>;
  getTaxonomy(): Promise<Taxonomy>;
  getDomains(): Promise<DomainSummary[]>;
  getCountries(): Promise<CountrySummary[]>;
  getRecentPapers(limit: number): Promise<Paper[]>;
  getPaper(id: string): Promise<Paper | null>;
  queryPapers(query: PaperQuery): Promise<PaperPage>;
  getFacets(): Promise<Facets>;
}
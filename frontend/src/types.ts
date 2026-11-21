/** One research paper. Original metadata first; NLP-derived fields live in `derived`. */
export interface Paper {
  paper_id: string;
  title: string;
  abstract: string;
  authors: string[];
  publication_date: string;
  publication_year: number;
  journal: string | null;
  conference: string | null;
  doi: string | null;
  /** Country of the authors' affiliation. Never guessed from the text. */
  country: string | null;
  organizations: string[];
  research_type: string;
  /** Output of the NLP pipeline, kept apart from the original metadata. */
  derived: {
    topics: string[];
    methods: string[];
    technologies: string[];
    missions: string[];
    keywords: string[];
  };
  /** true for demo records: these are not real research. */
  is_synthetic: boolean;
}

export interface TaxonomyDomain { id: string; name: string; icon?: string | null; topics: string[] }
export interface TaxonomyCountry { id: string; name: string; flag: string }
export interface Taxonomy { domains: TaxonomyDomain[]; countries: TaxonomyCountry[] }

/** Headline numbers about the whole corpus. */
export interface CorpusStats {
  papers: number;
  countries: number;
  topics: number;
  organizations: number;
  year_from: number;
  year_to: number;
  synthetic: boolean;
}

export interface DomainSummary extends TaxonomyDomain { paper_count: number }
export interface CountrySummary extends TaxonomyCountry { paper_count: number; top_topics: string[] }

/** A value and how many papers have it, e.g. { value: "India", count: 122 }. */
export interface CountValue { value: string; count: number }
export interface Facets { topics: CountValue[]; countries: CountValue[] }

export type PaperSort = "newest" | "oldest" | "title";

/** What the research table asks for. Every field is optional. */
export interface PaperQuery {
  q?: string;
  topic?: string;
  country?: string;
  sort?: PaperSort;
  page?: number;
  page_size?: number;
}

/** One page of results. */
export interface PaperPage { items: Paper[]; total: number; page: number; page_size: number }

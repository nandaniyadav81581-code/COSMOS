import { apiGet } from "./http";

export interface Opportunity {
  id: string;
  topic_a: string;
  topic_b: string;
  papers: number;
  /** overlap that is typical for topic pairs this close */
  typical: number;
  recent: number;
  momentum: "new" | "increasing" | "steady" | "decreasing" | "too few papers";
  per_year: number[];
  score: number;
  components: { closeness: number; gap: number; momentum: number; foundation: number };
  sample_paper_ids: string[];
}
export interface OpportunityReport { disclaimer: string; total: number; items: Opportunity[] }

export const getOpportunities = (minPapers = 1) => apiGet<OpportunityReport>(`/opportunities?min_papers=${minPapers}`);

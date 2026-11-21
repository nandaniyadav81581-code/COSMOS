import type { Paper } from "../types";
import { apiGet } from "./http";

export interface Relevance {
  overall: number;
  semantic: number;
  keyword: number;
  topic: number;
  entity: number;
  matched_concepts: string[];
}
export interface SearchResult { paper: Paper; relevance: Relevance }
export interface SearchResponse { query: string; interpretation: string[]; total: number; results: SearchResult[] }

export const searchPapers = (q: string, limit = 20) =>
  apiGet<SearchResponse>(`/search?q=${encodeURIComponent(q)}&limit=${limit}`);

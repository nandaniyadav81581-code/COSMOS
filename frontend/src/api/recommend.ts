import type { Paper } from "../types";
import { apiGet } from "./http";

export type RecommendationKind = "very_similar" | "related" | "adjacent";
export interface Recommendation {
  paper: Paper;
  score: number;
  signals: { semantic: number; topic: number; entity: number; time: number };
  reasons: string[];
}
export type Recommendations = Record<RecommendationKind, Recommendation[]>;

export const getRecommendations = (paperId: string) =>
  apiGet<Recommendations>(`/recommendations/${encodeURIComponent(paperId)}`);

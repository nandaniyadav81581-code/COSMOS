import { apiGet } from "./http";

export type TrendStatus = "emerging" | "growing" | "stable" | "declining";
export interface TopicTrend {
  topic: string;
  topic_id: string;
  per_year: number[];
  total: number;
  recent: number;
  growth: number;
  z: number;
  slope: number;
  status: TrendStatus;
}
export interface TrendReport { years: number[]; recent_years: number; corpus_growth: number; totals: number[]; topics: TopicTrend[] }

export const getTrends = (recentYears = 3) => apiGet<TrendReport>(`/trends?recent_years=${recentYears}`);

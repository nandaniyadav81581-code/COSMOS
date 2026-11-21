import type { Paper } from "../types";
import { apiPost } from "./http";

export interface AskSource { n: number; paper: Paper; relevance: number }
export interface AskResponse {
  question: string;
  interpretation: string[];
  status: "answered" | "insufficient_evidence" | "error";
  answer: string;
  cited: number[];
  sources: AskSource[];
  grounding: { sentences: number; cited_sentences: number; invalid_citations: number[] };
  provider: string;
}

export const askQuestion = (question: string, paperId?: string) =>
  apiPost<AskResponse>("/ask", { question, paper_id: paperId ?? null });

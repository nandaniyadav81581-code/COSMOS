import type { DataSource } from "./dataSource";

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8020";

/** GET a JSON answer from the API, or throw a clear error. */
export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`API ${res.status} on ${path}`);
  return res.json() as Promise<T>;
}

/** POST some JSON to the API and read the JSON answer. */
export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API ${res.status} on ${path}`);
  return res.json() as Promise<T>;
}

/** Keeps the same DataSource contract as the mock adapter, by asking the API. */
export const httpSource: DataSource = {
  getStats: () => apiGet("/stats"),
  getTaxonomy: () => apiGet("/taxonomy"),
  getDomains: () => apiGet("/domains"),
  getCountries: () => apiGet("/countries"),
  getRecentPapers: (limit) => apiGet(`/papers/recent?limit=${limit}`),
  getFacets: () => apiGet("/papers/facets"),
  queryPapers: (query) => {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== "") params.set(key, String(value));
    });
    return apiGet(`/papers?${params}`);
  },
  getPaper: async (id) => {
    const res = await fetch(`${BASE}/papers/${encodeURIComponent(id)}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
  },
};

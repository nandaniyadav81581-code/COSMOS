import { apiGet } from "./http";

export type GraphKind = "root" | "domain" | "topic" | "country" | "mission" | "technology" | "method";
export interface GraphNode { id: string; kind: GraphKind; label: string; paper_count: number }
/** A neighbour also says how many papers it shares with the centre. */
export interface GraphNeighbour extends GraphNode { weight: number }
export interface Neighbourhood { center: GraphNode; neighbours: GraphNeighbour[] }

export const getGraph = (entityId: string) => apiGet<Neighbourhood>(`/graph/${encodeURIComponent(entityId)}`);

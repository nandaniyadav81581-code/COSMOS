import type { DataSource } from "./dataSource";
import { httpSource } from "./http";
import { mockSource } from "./mock";

/** "mock" = demo files in the browser; "api" = the FastAPI server. Set with VITE_DATA_MODE. */
export const DATA_MODE = import.meta.env.VITE_DATA_MODE === "api" ? "api" : "mock";

/** The single door to all data. Pages import this, never an adapter. */
export const api: DataSource = DATA_MODE === "api" ? httpSource : mockSource;

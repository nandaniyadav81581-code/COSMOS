import type { ReactNode } from "react";
import { DATA_MODE } from "../api";
import { EmptyState, GlassCard } from "./ui";

/** Shows `children` only in API mode; in demo mode, explains how to switch. */
export function NeedsApi({ feature, children }: { feature: string; children: ReactNode }) {
  if (DATA_MODE === "api") return <>{children}</>;
  return (
    <GlassCard className="mt-8">
      <EmptyState title={`${feature} runs on the API.`}
        hint="Start the API (Lesson 11), then open the site with npm run dev:api on port 5174." />
    </GlassCard>
  );
}

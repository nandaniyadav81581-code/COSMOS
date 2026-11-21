import type { ReactNode } from "react";
import type { AsyncState } from "../hooks/useAsync";
import { CosmicLoader, EmptyState } from "./ui";

/** Shows loading, error, or the actual content. */
export function AsyncView<T>({
  state,
  loading,
  children,
}: {
  state: AsyncState<T>;
  loading?: string;
  children: (data: T) => ReactNode;
}) {
  if (state.status === "loading") {
    return <CosmicLoader label={loading} />;
  }

  if (state.status === "error") {
    return (
      <EmptyState
        title="Couldn't reach the research universe."
        hint={state.error.message}
      />
    );
  }

  return <>{children(state.data)}</>;
}
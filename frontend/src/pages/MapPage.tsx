import { useState } from "react";
import { Link } from "react-router-dom";
import { getGraph, type GraphKind, type GraphNode } from "../api/graph";
import { AsyncView } from "../components/AsyncView";
import { NeedsApi } from "../components/NeedsApi";
import { GlassCard } from "../components/ui";
import { useAsync } from "../hooks/useAsync";

const COLOURS: Record<GraphKind, string> = {
  root: "#7a68b8", domain: "#bfaeea", topic: "#d9cef5", country: "#c7d6ea",
  mission: "#f5cfdb", technology: "#c4eadb", method: "#e3f5ee",
};

/** Where "View papers" goes for kinds the research table can filter by. */
function papersLink(n: GraphNode): string | null {
  if (n.kind === "topic") return `/papers?topic=${encodeURIComponent(n.label)}`;
  if (n.kind === "country") return `/papers?country=${encodeURIComponent(n.label)}`;
  return null;
}

function Explorer() {
  // The path you clicked through. The last item is the node in the centre.
  const [trail, setTrail] = useState<{ id: string; label: string }[]>([{ id: "root", label: "Space Research" }]);
  const current = trail[trail.length - 1];
  const state = useAsync(() => getGraph(current.id), [current.id]);
  const go = (n: GraphNode) => setTrail((t) => [...t, { id: n.id, label: n.label }]);

  const W = 720, H = 440, cx = W / 2, cy = H / 2;

  return (
    <>
      <nav aria-label="Trail" className="mt-6 flex flex-wrap items-center gap-1 text-sm">
        {trail.map((step, k) => (
          <span key={step.id} className="flex items-center gap-1">
            {k > 0 && <span aria-hidden className="text-navy-500">›</span>}
            <button type="button" disabled={k === trail.length - 1} onClick={() => setTrail((t) => t.slice(0, k + 1))}
              className="rounded-full px-2 py-0.5 hover:bg-white disabled:font-semibold disabled:text-violet-600">
              {step.label}
            </button>
          </span>
        ))}
      </nav>

      <AsyncView state={state} loading="Mapping connections…">
        {(g) => {
          const maxCount = Math.max(1, ...g.neighbours.map((n) => n.paper_count));
          const maxWeight = Math.max(1, ...g.neighbours.map((n) => n.weight));
          const placed = g.neighbours.map((n, i) => {
            const angle = (i / g.neighbours.length) * Math.PI * 2 - Math.PI / 2;
            return { n, x: cx + Math.cos(angle) * 280, y: cy + Math.sin(angle) * 165, r: 8 + 16 * Math.sqrt(n.paper_count / maxCount) };
          });
          const link = papersLink(g.center);
          return (
            <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_18rem]">
              <GlassCard className="p-2">
                <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="group" aria-label={`Connections of ${g.center.label}`}>
                  {placed.map(({ n, x, y }) => (
                    <line key={`l-${n.id}`} x1={cx} y1={cy} x2={x} y2={y} stroke="#bfaeea" strokeOpacity={0.7} strokeWidth={1 + 4 * (n.weight / maxWeight)} />
                  ))}
                  {placed.map(({ n, x, y, r }) => (
                    <g key={n.id} tabIndex={0} role="button" aria-label={`${n.kind} ${n.label}, ${n.weight} shared papers`}
                      className="cursor-pointer outline-none" onClick={() => go(n)}
                      onKeyDown={(e) => e.key === "Enter" && go(n)}>
                      <circle cx={x} cy={y} r={r} fill={COLOURS[n.kind]} stroke="white" strokeWidth={2} />
                      <text x={x} y={y + r + 13} textAnchor="middle" className="fill-navy-900 text-[11px]">
                        {n.label.length > 24 ? `${n.label.slice(0, 23)}…` : n.label}
                      </text>
                    </g>
                  ))}
                  <circle cx={cx} cy={cy} r={34} fill={COLOURS[g.center.kind]} />
                  <text x={cx} y={cy + 4} textAnchor="middle" className="fill-navy-900 text-[11px] font-semibold">
                    {g.center.label.length > 16 ? `${g.center.label.slice(0, 15)}…` : g.center.label}
                  </text>
                </svg>
              </GlassCard>

              <GlassCard className="p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-navy-500">{g.center.kind}</p>
                <h2 className="mt-1 text-xl font-semibold">{g.center.label}</h2>
                <p className="text-sm tabular-nums text-navy-500">{g.center.paper_count.toLocaleString()} papers</p>
                {link && <Link to={link} className="mt-3 inline-block rounded-full bg-violet-500 px-3 py-1.5 text-sm text-white">View papers</Link>}
                <h3 className="mt-5 text-xs font-semibold uppercase tracking-wider text-navy-500">Strongest connections</h3>
                <ul className="mt-2 max-h-72 space-y-1 overflow-y-auto">
                  {g.neighbours.map((n) => (
                    <li key={n.id}>
                      <button type="button" onClick={() => go(n)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left text-sm hover:bg-lavender-50">
                        <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: COLOURS[n.kind] }} />
                        <span className="flex-1 truncate">{n.label}</span>
                        <span className="tabular-nums text-xs text-navy-500">{n.weight}</span>
                      </button>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-navy-500">Numbers = papers shared with {g.center.label}.</p>
              </GlassCard>
            </div>
          );
        }}
      </AsyncView>
    </>
  );
}

export function MapPage() {
  return (
    <div className="container-cosmos py-10">
      <p className="eyebrow">Research map</p>
      <h1 className="mt-1 text-3xl font-semibold">The knowledge graph</h1>
      <p className="mt-2 max-w-2xl text-navy-500">
        Click a node to move to it and see its strongest connections. Bigger circle = more papers; thicker line = more shared papers.
      </p>
      <NeedsApi feature="The research map"><Explorer /></NeedsApi>
    </div>
  );
}

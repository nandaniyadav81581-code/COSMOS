import { useState } from "react";
import { Link } from "react-router-dom";
import { getOpportunities, type Opportunity } from "../api/opportunities";
import { AsyncView } from "../components/AsyncView";
import { NeedsApi } from "../components/NeedsApi";
import { Chip, EmptyState, GlassCard } from "../components/ui";
import { useAsync } from "../hooks/useAsync";

function explain(o: Opportunity): string {
  const n = o.papers === 1 ? "1 paper combines" : `${o.papers} papers combine`;
  return `These topics are semantically close, yet only ${n} them, fewer than the ~${o.typical.toFixed(1)} typical for topic pairs this close. This intersection appears relatively small within the current corpus and may be worth further human investigation.`;
}

function Card({ o, disclaimer }: { o: Opportunity; disclaimer: string }) {
  const bars: [string, number][] = [
    ["Closeness", o.components.closeness], ["Gap", o.components.gap],
    ["Momentum", o.components.momentum], ["Foundation", o.components.foundation],
  ];
  return (
    <GlassCard className="flex flex-col gap-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display text-lg font-semibold leading-tight">
          {o.topic_a} <span className="text-violet-500">×</span> {o.topic_b}
        </h3>
        <span className="rounded-full bg-lavender-100 px-2 py-0.5 text-xs font-semibold text-violet-600">{o.score}</span>
      </div>
      <dl className="grid grid-cols-3 gap-2 text-center">
        {([["Papers", String(o.papers)], ["Typical", `~${o.typical.toFixed(1)}`], ["Last 3 yrs", String(o.recent)]] as const).map(([label, value]) => (
          <div key={label} className="rounded-xl bg-white/60 p-2">
            <dt className="text-[11px] text-navy-500">{label}</dt>
            <dd className="font-display text-xl font-semibold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="flex flex-wrap gap-1.5">
        <Chip tone="signal">{o.momentum === "too few papers" ? "Too few papers to judge a trend" : `Momentum: ${o.momentum}`}</Chip>
        {o.papers < 3 && <Chip tone="entity">Thin evidence</Chip>}
      </div>
      <p className="text-sm leading-relaxed text-navy-700">{explain(o)}</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        {bars.map(([label, value]) => (
          <div key={label}>
            <div className="flex justify-between text-[11px] text-navy-500"><span>{label}</span><span className="tabular-nums">{value}</span></div>
            <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-lavender-100"><div className="h-full rounded-full bg-lavender-400" style={{ width: `${value}%` }} /></div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 text-sm">
        <Link to={`/papers/${o.sample_paper_ids[0]}`} className="rounded-full bg-white/80 px-3 py-1 text-violet-600 hover:bg-white">Newest paper combining both</Link>
        <Link to={`/search?q=${encodeURIComponent(`${o.topic_a} ${o.topic_b}`)}`} className="rounded-full bg-white/80 px-3 py-1 text-violet-600 hover:bg-white">Search both</Link>
      </div>
      <p className="mt-auto text-xs italic text-navy-500">{disclaimer}</p>
    </GlassCard>
  );
}

function Signals() {
  const [minPapers, setMinPapers] = useState(1);
  const state = useAsync(() => getOpportunities(minPapers), [minPapers]);
  return (
    <>
      <label className="mt-6 flex items-center gap-2 text-sm">Minimum papers in the overlap
        <select value={minPapers} onChange={(e) => setMinPapers(Number(e.target.value))} className="rounded-lg border border-lavender-100 bg-white/70 px-2 py-1">
          {[1, 2, 3, 5].map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </label>
      <div className="mt-6">
        <AsyncView state={state} loading="Analyzing research…">
          {(r) => (
            <>
              <p className="mb-4 text-xs text-navy-500">{r.total} signals. "Typical" = the overlap a regression across all topic pairs predicts for this closeness.</p>
              {r.items.length === 0
                ? <EmptyState title="No signals match." hint="Lower the minimum papers." />
                : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{r.items.map((o) => <Card key={o.id} o={o} disclaimer={r.disclaimer} />)}</div>}
            </>
          )}
        </AsyncView>
      </div>
    </>
  );
}

export function OpportunitiesPage() {
  return (
    <div className="container-cosmos py-10">
      <p className="eyebrow">Research opportunities</p>
      <h1 className="mt-1 text-3xl font-semibold">Where might research go next?</h1>
      <GlassCard className="mt-6 bg-blush-100/60 p-4 text-sm text-navy-700">
        <p className="font-semibold">This is a corpus-derived discovery signal, not a validated research gap.</p>
        <p className="mt-1">A small intersection can be a genuine opening, but it can also mean the combination isn't useful, is studied under other names, or falls outside this corpus. Read the papers before drawing conclusions.</p>
      </GlassCard>
      <NeedsApi feature="Research opportunities"><Signals /></NeedsApi>
    </div>
  );
}

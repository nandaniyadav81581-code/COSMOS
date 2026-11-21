import { Link } from "react-router-dom";
import { getTrends, type TopicTrend, type TrendStatus } from "../api/trends";
import { AsyncView } from "../components/AsyncView";
import { NeedsApi } from "../components/NeedsApi";
import { Sparkline } from "../components/Sparkline";
import { GlassCard, SectionHeader } from "../components/ui";
import { useAsync } from "../hooks/useAsync";

const LABELS: Record<TrendStatus, string> = {
  emerging: "Emerging topic signal",
  growing: "Increasing activity",
  stable: "Stable",
  declining: "Declining in this corpus",
};

function Column({ title, items, years }: { title: string; items: TopicTrend[]; years: number[] }) {
  return (
    <GlassCard className="p-5">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-navy-700">{title} <span className="text-navy-500">{items.length}</span></h3>
      {items.length === 0 ? <p className="mt-3 text-sm text-navy-500">No topics in this band.</p> : (
        <ul className="mt-3 space-y-3">
          {items.slice(0, 6).map((t) => (
            <li key={t.topic_id}>
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <Link to={`/papers?topic=${encodeURIComponent(t.topic)}`} className="truncate font-medium hover:text-violet-600">{t.topic}</Link>
                <span className="shrink-0 tabular-nums text-navy-500">×{t.growth.toFixed(2)} · z {t.z.toFixed(1)}</span>
              </div>
              <Sparkline values={t.per_year} years={years} />
            </li>
          ))}
        </ul>
      )}
    </GlassCard>
  );
}

function Report() {
  const state = useAsync(() => getTrends(3), []);
  return (
    <AsyncView state={state} loading="Analyzing research…">
      {(r) => {
        const by = (s: TrendStatus) => r.topics.filter((t) => t.status === s);
        return (
          <div className="space-y-14">
            <details className="glass p-4 text-sm text-navy-700">
              <summary className="cursor-pointer font-semibold">How these signals are computed</summary>
              <ul className="mt-3 list-disc space-y-1.5 pl-5">
                <li>Recent window: the last {r.recent_years} years. Everything earlier is the baseline.</li>
                <li>The whole corpus publishes ×{r.corpus_growth.toFixed(2)} as many papers per year recently. Topic growth is measured relative to that.</li>
                <li>z = (recent papers − expected) ÷ √expected. With many topics tested at once, a few signals can appear by chance.</li>
                <li>These describe <b>this corpus</b> only. Growth here is not evidence that a field is more important.</li>
              </ul>
            </details>

            <section>
              <SectionHeader eyebrow="Signals" title="Emerging, increasing and declining" />
              <div className="grid gap-4 md:grid-cols-3">
                <Column title="Emerging topic signals" items={by("emerging")} years={r.years} />
                <Column title="Increasing activity" items={by("growing")} years={r.years} />
                <Column title="Declining in this corpus" items={[...by("declining")].reverse()} years={r.years} />
              </div>
            </section>

            <section>
              <SectionHeader eyebrow="All topics" title="Trend statistics" />
              <div className="glass overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <caption className="sr-only">Trend statistics per topic</caption>
                  <thead className="border-b border-lavender-100 text-xs uppercase tracking-wider text-navy-500">
                    <tr>
                      <th scope="col" className="px-3 py-3">Topic</th>
                      <th scope="col" className="px-3 py-3">Signal</th>
                      <th scope="col" className="px-3 py-3 text-right">Papers</th>
                      <th scope="col" className="px-3 py-3 text-right">Recent</th>
                      <th scope="col" className="px-3 py-3 text-right">Growth ×</th>
                      <th scope="col" className="px-3 py-3 text-right">Slope /yr</th>
                      <th scope="col" className="px-3 py-3 text-right">z</th>
                      <th scope="col" className="px-3 py-3">Trend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.topics.map((t) => (
                      <tr key={t.topic_id} className="border-b border-lavender-50 last:border-0 hover:bg-lavender-50/60">
                        <th scope="row" className="px-3 py-2 font-medium">{t.topic}</th>
                        <td className="px-3 py-2">{LABELS[t.status]}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{t.total}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{t.recent}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{t.growth.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{t.slope > 0 ? "+" : ""}{t.slope.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{t.z.toFixed(2)}</td>
                        <td className="px-3 py-1"><Sparkline values={t.per_year} years={r.years} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        );
      }}
    </AsyncView>
  );
}

export function TrendsPage() {
  return (
    <div className="container-cosmos py-10">
      <p className="eyebrow">Research evolution</p>
      <h1 className="mb-8 mt-1 text-3xl font-semibold">How the research is changing</h1>
      <NeedsApi feature="Trend analysis"><Report /></NeedsApi>
    </div>
  );
}

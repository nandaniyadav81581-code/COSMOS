import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";
import { getRecommendations, type RecommendationKind } from "../api/recommend";
import { AsyncView } from "../components/AsyncView";
import { NeedsApi } from "../components/NeedsApi";
import { Chip, EmptyState, GlassCard, SectionHeader } from "../components/ui";
import { useAsync } from "../hooks/useAsync";
import type { Paper } from "../types";

const KINDS: { kind: RecommendationKind; label: string; blurb: string }[] = [
  { kind: "very_similar", label: "Very similar", blurb: "Close in meaning and sharing most of this paper's topics." },
  { kind: "related", label: "Related", blurb: "Shared topics or entities, but a different research method." },
  { kind: "adjacent", label: "Adjacent", blurb: "Neighbouring fields: topics that often appear alongside this paper's." },
];

function Understanding({ p }: { p: Paper }) {
  const rows: [string, string[], "topic" | "method" | "entity" | "signal"][] = [
    ["Topics", p.derived.topics, "topic"],
    ["Methods", p.derived.methods, "method"],
    ["Technologies", p.derived.technologies, "entity"],
    ["Missions", p.derived.missions, "signal"],
  ];

  return (
    <GlassCard className="p-6">
      <p className="eyebrow">COSMOS understands this paper as</p>
      <dl className="mt-4 space-y-3">
        {rows.filter(([, values]) => values.length > 0).map(([label, values, tone]) => (
          <div key={label} className="flex flex-wrap items-center gap-2">
            <dt className="w-28 text-xs font-semibold uppercase tracking-wider text-navy-500">{label}</dt>
            <dd className="flex flex-wrap gap-1.5">
              {values.map((v) => <Chip key={v} tone={tone}>{v}</Chip>)}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-xs text-navy-500">
        These tags come from the NLP pipeline, kept apart from the original metadata.
      </p>
    </GlassCard>
  );
}

function Related({ id }: { id: string }) {
  const state = useAsync(() => getRecommendations(id), [id]);
  const [tab, setTab] = useState<RecommendationKind>("very_similar");

  return (
    <AsyncView state={state} loading="Connecting the knowledge…">
      {(r) => (
        <div>
          <div role="tablist" className="flex flex-wrap gap-2">
            {KINDS.map((k) => (
              <button
                key={k.kind}
                role="tab"
                type="button"
                aria-selected={tab === k.kind}
                onClick={() => setTab(k.kind)}
                className={`rounded-full px-4 py-1.5 text-sm ${
                  tab === k.kind ? "bg-violet-500 text-white" : "bg-white/60 hover:bg-white"
                }`}
              >
                {k.label} <span className="opacity-70">{r[k.kind].length}</span>
              </button>
            ))}
          </div>

          <p className="mt-3 text-sm text-navy-500">
            {KINDS.find((k) => k.kind === tab)?.blurb}
          </p>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {r[tab].length === 0 && <EmptyState title="No strong connection found." />}

            {r[tab].map((x) => (
              <GlassCard key={x.paper.paper_id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <Link
                    to={`/papers/${x.paper.paper_id}`}
                    className="font-semibold leading-snug hover:text-violet-600"
                  >
                    {x.paper.title}
                  </Link>
                  <span className="shrink-0 rounded-full bg-lavender-100 px-2 py-0.5 text-xs font-semibold text-violet-600">
                    {x.score}%
                  </span>
                </div>

                <ul className="mt-2 flex flex-wrap gap-1.5 text-xs">
                  {x.reasons.map((reason) => (
                    <li key={reason} className="rounded-full bg-white/80 px-2 py-0.5">
                      {reason}
                    </li>
                  ))}
                </ul>

                <p className="mt-2 text-xs tabular-nums text-navy-500">
                  semantic {x.signals.semantic} · topic {x.signals.topic} · entity {x.signals.entity} · time {x.signals.time}
                </p>
              </GlassCard>
            ))}
          </div>
        </div>
      )}
    </AsyncView>
  );
}

export function PaperPage() {
  const { id = "" } = useParams();
  const paper = useAsync(() => api.getPaper(id), [id]);

  return (
    <AsyncView state={paper} loading="Opening the paper…">
      {(p) => !p ? (
        <div className="container-cosmos py-16">
          <EmptyState title="This paper isn't in the corpus." />
        </div>
      ) : (
        <article className="container-cosmos space-y-12 py-10">
          <header>
            <Link to="/papers" className="text-sm text-navy-500 hover:text-violet-600">
              ← Papers
            </Link>

            {p.is_synthetic && (
              <p role="note" className="mt-3 w-fit rounded-xl bg-blush-100 px-3 py-1.5 text-sm">
                Synthetic demo record: not a real paper.
              </p>
            )}

            <h1 className="mt-3 max-w-4xl text-3xl font-bold leading-tight sm:text-4xl">
              {p.title}
            </h1>

            <p className="mt-3 text-navy-700">{p.authors.join(", ")}</p>

            <p className="mt-2 text-sm text-navy-500">
              {p.publication_date} · {p.journal ?? p.conference ?? "Unknown venue"} · {p.country ?? "Country unknown"} · {p.doi ? `DOI ${p.doi}` : "No DOI"}
            </p>
          </header>

          <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
            <section>
              <h2 className="eyebrow">Abstract</h2>
              <p className="mt-3 text-lg leading-relaxed text-navy-700">
                {p.abstract}
              </p>
            </section>

            <Understanding p={p} />
          </div>

          <section>
            <SectionHeader
              eyebrow="Related research"
              title="Where to read next"
              description="Ranked by meaning together with topic, entity and time overlap, not by text similarity alone."
            />
            <NeedsApi feature="Recommendations">
              <Related id={p.paper_id} />
            </NeedsApi>
          </section>
        </article>
      )}
    </AsyncView>
  );
}
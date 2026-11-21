import { Link } from "react-router-dom";
import { api } from "../api";
import { AsyncView } from "../components/AsyncView";
import { PaperCard } from "../components/PaperCard";
import { SearchBar } from "../components/SearchBar";
import { Chip, GlassCard, SectionHeader, StatCard } from "../components/ui";
import { useAsync } from "../hooks/useAsync";

const EXAMPLES = [
  "What are researchers working on in autonomous spacecraft?",
  "How is AI being used in space missions?",
  "Which techniques detect spacecraft faults?",
];

function Hero() {
  return (
    <section className="container-cosmos pb-12 pt-16 sm:pt-24">
      <p className="eyebrow animate-rise">Space Research Intelligence</p>
      <h1 className="mt-3 max-w-3xl animate-rise text-4xl font-bold leading-tight sm:text-6xl">
        Explore humanity's knowledge{" "}
        <span className="bg-gradient-to-r from-violet-500 to-blush-300 bg-clip-text text-transparent">beyond Earth.</span>
      </h1>
      <p className="mt-5 max-w-2xl text-lg text-navy-500">
        Research papers transformed into an interactive map of space science, spacecraft technology and discovery.
      </p>
      <div className="mt-8 max-w-2xl"><SearchBar /></div>
      <div className="mt-4 flex max-w-3xl flex-wrap gap-2">
        {EXAMPLES.map((q) => (
          <Link key={q} to={`/search?q=${encodeURIComponent(q)}`}
            className="rounded-full border border-lavender-200 bg-white/60 px-3 py-1.5 text-sm text-navy-700 hover:bg-white">
            {q}
          </Link>
        ))}
      </div>
    </section>
  );
}

function Stats() {
  const stats = useAsync(() => api.getStats(), []);
  return (
    <section className="container-cosmos">
      <h2 className="eyebrow mb-4">Research Universe</h2>
      <AsyncView state={stats} loading="Counting the stars…">
        {(s) => (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard value={s.papers} label="Research papers" />
              <StatCard value={s.countries} label="Countries" />
              <StatCard value={s.topics} label="Research topics" />
              <StatCard value={s.organizations} label="Organizations" />
            </div>
            {s.synthetic && <p className="mt-3 text-sm text-navy-500">Demo data: these are synthetic records, not real research.</p>}
          </>
        )}
      </AsyncView>
    </section>
  );
}

function Domains() {
  const domains = useAsync(() => api.getDomains(), []);
  return (
    <section className="container-cosmos mt-20">
      <SectionHeader eyebrow="Explore by domain" title="Areas of space research" />
      <AsyncView state={domains}>
        {(ds) => (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ds.map((d) => (
              <GlassCard key={d.id} className="p-4">
                <p className="font-semibold"><span aria-hidden className="mr-2">{d.icon ?? "🔭"}</span>{d.name}</p>
                <p className="mt-1 text-xs tabular-nums text-navy-500">{d.paper_count.toLocaleString()} papers · {d.topics.length} topics</p>
                <div className="mt-3 flex flex-wrap gap-1">
                  {d.topics.map((t) => <Chip key={t} to={`/papers?topic=${encodeURIComponent(t)}`}>{t}</Chip>)}
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </AsyncView>
    </section>
  );
}

function Global() {
  const countries = useAsync(() => api.getCountries(), []);
  return (
    <section className="container-cosmos mt-20">
      <SectionHeader eyebrow="Global research" title="Where the research comes from"
        description="Country comes from author affiliation metadata, never guessed from the paper text." />
      <AsyncView state={countries}>
        {(cs) => (
          <div className="glass overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <caption className="sr-only">Papers by country of author affiliation</caption>
              <thead className="border-b border-lavender-100 text-xs uppercase tracking-wider text-navy-500">
                <tr>
                  <th scope="col" className="px-5 py-3">Country</th>
                  <th scope="col" className="px-5 py-3">Papers</th>
                  <th scope="col" className="px-5 py-3">Top research areas</th>
                </tr>
              </thead>
              <tbody>
                {cs.slice(0, 8).map((c) => (
                  <tr key={c.id} className="border-b border-lavender-50 last:border-0 hover:bg-lavender-50/60">
                    <th scope="row" className="px-5 py-3 font-medium">
                      <Link to={`/papers?country=${encodeURIComponent(c.name)}`} className="hover:text-violet-600">
                        <span aria-hidden className="mr-2">{c.flag}</span>{c.name}
                      </Link>
                    </th>
                    <td className="px-5 py-3 tabular-nums">{c.paper_count.toLocaleString()}</td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-1">{c.top_topics.map((t) => <Chip key={t}>{t}</Chip>)}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AsyncView>
    </section>
  );
}

function Recent() {
  const papers = useAsync(() => api.getRecentPapers(4), []);
  return (
    <section className="container-cosmos mt-20">
      <SectionHeader eyebrow="Featured research" title="Recently published" />
      <AsyncView state={papers}>
        {(ps) => <div className="grid gap-4 lg:grid-cols-2">{ps.map((p) => <PaperCard key={p.paper_id} paper={p} />)}</div>}
      </AsyncView>
    </section>
  );
}

export function ExplorePage() {
  return (
    <>
      <Hero />
      <Stats />
      <Domains />
      <Global />
      <Recent />
    </>
  );
}

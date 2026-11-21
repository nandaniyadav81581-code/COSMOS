import { Fragment, useState } from "react";
import { Link } from "react-router-dom";
import type { AskResponse } from "../api/ask";
import { GlassCard } from "./ui";

export function AnswerCard({ r }: { r: AskResponse }) {
  const [active, setActive] = useState<number | null>(null);
  const parts = r.answer.split(/(\[\d+\])/g); // keeps the [n] markers as their own pieces

  return (
    <GlassCard className="animate-rise p-6">
      {r.status === "answered" ? (
        <p className="text-[1.05rem] leading-relaxed">
          {parts.map((part, i) => {
            const m = part.match(/^\[(\d+)\]$/);
            if (!m) return <Fragment key={i}>{part}</Fragment>;
            const n = Number(m[1]);
            return (
              <button key={i} type="button" onClick={() => setActive(n)} aria-label={`Source ${n}`}
                className={`mx-0.5 rounded px-1 align-super text-[0.7em] font-semibold ${active === n ? "bg-violet-500 text-white" : "bg-lavender-100 text-violet-600"}`}>
                {n}
              </button>
            );
          })}
        </p>
      ) : (
        <p role="status" className="rounded-xl bg-dusty-100 px-4 py-3 font-medium">{r.answer}</p>
      )}

      <p className="mt-4 text-xs text-navy-500">
        {r.status === "answered" && `${r.grounding.cited_sentences}/${r.grounding.sentences} sentences cited · `}
        {r.provider === "extractive"
          ? "Extractive answer: sentences quoted from the cited abstracts. No AI model was used."
          : `Written by ${r.provider} from the numbered sources only.`}
      </p>

      {r.sources.length > 0 && (
        <ol className="mt-4 space-y-2 border-t border-lavender-100 pt-4">
          {r.sources.map((s) => (
            <li key={s.n} className={`flex gap-3 rounded-xl p-2 text-sm ${active === s.n ? "bg-lavender-100" : ""}`}>
              <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-semibold ${r.cited.includes(s.n) ? "bg-violet-500 text-white" : "bg-lavender-100 text-violet-600"}`}>{s.n}</span>
              <div>
                <Link to={`/papers/${s.paper.paper_id}`} className="font-medium hover:text-violet-600">{s.paper.title}</Link>
                <p className="text-xs text-navy-500">{s.paper.publication_year} · relevance {s.relevance}%</p>
                {active === s.n && <p className="mt-1 text-xs leading-relaxed text-navy-700">{s.paper.abstract}</p>}
              </div>
            </li>
          ))}
        </ol>
      )}
    </GlassCard>
  );
}

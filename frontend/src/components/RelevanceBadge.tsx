import type { Relevance } from "../api/search";

/** RELEVANCE 69% plus the four signals as small bars. Never a bare score. */
export function RelevanceBadge({ r }: { r: Relevance }) {
  const rows: [string, number][] = [["Semantic", r.semantic], ["Keyword", r.keyword], ["Topic", r.topic], ["Entity", r.entity]];
  return (
    <div className="w-full shrink-0 rounded-xl bg-lavender-50 p-3 text-xs sm:w-52">
      <p className="font-semibold text-violet-600">RELEVANCE {r.overall}%</p>
      <dl className="mt-2 space-y-1">
        {rows.map(([name, value]) => (
          <div key={name} className="flex items-center gap-2">
            <dt className="w-16 text-navy-500">{name}</dt>
            <dd className="flex flex-1 items-center gap-1.5">
              <span className="block h-1.5 w-16 overflow-hidden rounded-full bg-white">
                <span className="block h-full rounded-full bg-lavender-400" style={{ width: `${value}%` }} />
              </span>
              <span className="w-6 text-right tabular-nums">{value}</span>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** A small line of yearly counts, with a text summary for screen readers. */
export function Sparkline({ values, years }: { values: number[]; years: number[] }) {
  const w = 120, h = 28;
  const max = Math.max(1, ...values);
  const points = values.map((v, i) => `${(i / Math.max(1, values.length - 1)) * w},${h - (v / max) * (h - 4) - 2}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-7 w-28" role="img"
      aria-label={`${values[0]} papers in ${years[0]}, ${values[values.length - 1]} in ${years[years.length - 1]}`}>
      <polyline points={points} fill="none" stroke="#7a68b8" strokeWidth={1.8} strokeLinejoin="round" />
    </svg>
  );
}

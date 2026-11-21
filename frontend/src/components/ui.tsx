import type { ReactNode } from "react";
import { Link } from "react-router-dom";

export function GlassCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`glass ${className}`}>{children}</div>;
}

export function SectionHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  return (
    <div className="mb-6 max-w-2xl">
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="mt-1 text-2xl font-semibold sm:text-3xl">{title}</h2>
      {description && <p className="mt-2 text-navy-500">{description}</p>}
    </div>
  );
}

export function StatCard({ value, label }: { value: number; label: string }) {
  return (
    <GlassCard className="px-5 py-4">
      <p className="font-display text-3xl font-semibold tabular-nums">{value.toLocaleString()}</p>
      <p className="mt-1 text-sm text-navy-500">{label}</p>
    </GlassCard>
  );
}

const CHIP_TONES = {
  topic: "bg-lavender-100 text-violet-600 hover:bg-lavender-200",
  entity: "bg-dusty-100 text-navy-700 hover:bg-dusty-200",
  method: "bg-mint-100 text-navy-700 hover:bg-mint-200",
  signal: "bg-blush-100 text-navy-700 hover:bg-blush-200",
} as const;

export function Chip({ children, tone = "topic", to }: { children: ReactNode; tone?: keyof typeof CHIP_TONES; to?: string }) {
  const cls = `inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${CHIP_TONES[tone]}`;
  return to ? <Link to={to} className={cls}>{children}</Link> : <span className={cls}>{children}</span>;
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center py-12 text-center">
      <span aria-hidden className="mb-3 text-3xl">🔭</span>
      <p className="font-medium text-navy-700">{title}</p>
      {hint && <p className="mt-1 text-sm text-navy-500">{hint}</p>}
    </div>
  );
}

export function CosmicLoader({ label = "Mapping research…" }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-3 py-10 text-sm text-navy-500">
      <span className="relative inline-block h-6 w-6">
        <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-500" />
        <span className="absolute inset-0 animate-orbit-fast">
          <span className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 rounded-full bg-blush-300" />
        </span>
      </span>
      {label}
    </div>
  );
}
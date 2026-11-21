import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { CosmicBackground } from "../components/CosmicBackground";

const NAV = [
  { to: "/", label: "Explore", end: true },
  { to: "/papers", label: "Papers" },
  { to: "/search", label: "Search" },
  { to: "/map", label: "Research Map" },
  { to: "/trends", label: "Trends" },
  { to: "/opportunities", label: "Opportunities" },
  { to: "/assistant", label: "Assistant" },
];

export function AppShell() {
  const [open, setOpen] = useState(false);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `whitespace-nowrap rounded-full px-3 py-1.5 text-sm transition-colors ${
      isActive
        ? "bg-lavender-100 font-semibold text-violet-600"
        : "text-navy-500 hover:bg-white/70 hover:text-navy-900"
    }`;

  return (
    <div className="flex min-h-screen flex-col">
      <CosmicBackground />

      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50">
        Skip to content
      </a>

      <header className="sticky top-0 z-40 border-b border-white/60 bg-cream/70 backdrop-blur-lg">
        <div className="container-cosmos flex h-16 items-center justify-between gap-4">
          <Link to="/" className="font-display text-lg font-bold tracking-[0.2em]">
            COSMOS
          </Link>

          <nav aria-label="Primary" className="hidden items-center gap-1 xl:flex">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end} className={linkClass}>
                {n.label}
              </NavLink>
            ))}
          </nav>

          <button
            type="button"
            className="rounded-full p-2 xl:hidden"
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            <span className="sr-only">Toggle navigation</span>
            <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden>
              <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {open && (
          <nav aria-label="Primary mobile" className="container-cosmos flex flex-wrap gap-1 pb-3 xl:hidden">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={linkClass}
                onClick={() => setOpen(false)}
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
        )}
      </header>

      <main id="main" className="flex-1">
        <Outlet />
      </main>

      <footer className="mt-24 border-t border-white/60 bg-white/40 py-10 text-sm text-navy-500">
        <div className="container-cosmos">
          <span className="font-display font-semibold tracking-[0.2em] text-navy-700">
            COSMOS
          </span>{" "}
          · Explore humanity's knowledge beyond Earth.
        </div>
      </footer>
    </div>
  );
}
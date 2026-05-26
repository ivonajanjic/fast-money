"use client";

import Link from "next/link";

const ENTRY_POINTS = [
  {
    label: "Fast Money",
    sub: "Progress Bar",
    href: "/spin",
    accent: "#fbbf24",
    number: "01",
  },
  {
    label: "Fast Money",
    sub: "Survey Rounds",
    href: "/spin-2",
    accent: "#60a5fa",
    number: "02",
  },
  {
    label: "Fast Money",
    sub: "Variations",
    href: "/fast-money-variations",
    accent: "#a78bfa",
    number: "03",
  },
] as const;

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0a0a0f] scanlines">
      {/* Spotlight glow from top */}
      <div className="spotlight pointer-events-none absolute inset-0" />

      {/* Stage floor gradient at bottom */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#0a0a0f] via-transparent to-transparent" />

      {/* Decorative corner dots — top */}
      <div className="absolute left-6 top-6 flex gap-2 opacity-40">
        {["#fbbf24", "#f87171", "#34d399"].map((c) => (
          <span
            key={c}
            className="block h-2 w-2 rounded-full"
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
      <div className="absolute right-6 top-6 opacity-20">
        <span className="font-mono text-xs uppercase tracking-widest text-amber-400">
          v1.0
        </span>
      </div>

      {/* ── Main content ── */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-16">

        {/* Title block */}
        <div className="mb-12 text-center">
          <p className="mb-3 font-mono text-xs uppercase tracking-[0.3em] text-amber-400/70">
            Welcome to
          </p>
          <h1
            className="text-7xl font-black uppercase leading-none tracking-tight text-white"
            style={{
              fontFamily: "Impact, Arial Black, sans-serif",
              textShadow:
                "0 0 40px rgba(251,191,36,0.6), 0 0 80px rgba(251,191,36,0.2), 0 4px 0 rgba(0,0,0,0.8)",
            }}
          >
            GAME
            <br />
            <span
              style={{
                WebkitTextStroke: "2px #fbbf24",
                color: "transparent",
                textShadow: "0 0 40px rgba(251,191,36,0.8)",
              }}
            >
              NIGHT
            </span>
          </h1>

          {/* Subtitle divider */}
          <div className="mt-7 flex items-center justify-center gap-4">
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-amber-400/60" />
            <p className="text-sm font-medium uppercase tracking-widest text-amber-400/60">
              Choose your mode
            </p>
            <div className="h-px w-16 bg-gradient-to-l from-transparent to-amber-400/60" />
          </div>
        </div>

        {/* ── Entry point buttons ── */}
        <nav className="flex w-full max-w-lg flex-col gap-3">
          {ENTRY_POINTS.map((entry) => (
            <Link
              key={entry.number}
              href={entry.href}
              className="group relative flex items-center gap-5 overflow-hidden rounded-lg border border-white/5 bg-white/[0.03] px-6 py-5 transition-all duration-300 hover:border-white/10 hover:bg-white/[0.06] w-full text-left"
            >
              {/* Left accent bar */}
              <div
                className="absolute left-0 top-0 h-full w-1 transition-all duration-300 group-hover:w-1.5"
                style={{ backgroundColor: entry.accent }}
              />
              {/* Hover glow overlay */}
              <div
                className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{
                  background: `radial-gradient(ellipse 80% 80% at 0% 50%, ${entry.accent}12, transparent 70%)`,
                }}
              />
              {/* Number */}
              <span
                className="relative font-mono text-xs font-bold tabular-nums tracking-wider opacity-40 transition-opacity duration-300 group-hover:opacity-70"
                style={{ color: entry.accent }}
              >
                {entry.number}
              </span>
              {/* Text */}
              <div className="relative flex-1 min-w-0">
                <p className="text-[10px] font-mono uppercase tracking-widest text-white/35 group-hover:text-white/55">
                  {entry.label}
                </p>
                <p className="mt-0.5 text-base font-bold uppercase tracking-wide text-white">
                  {entry.sub}
                </p>
              </div>
              {/* Arrow */}
              <svg
                className="relative h-4 w-4 flex-shrink-0 translate-x-0 text-white/20 transition-all duration-300 group-hover:translate-x-1 group-hover:text-white/60"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </nav>

        {/* Footer tag */}
        <p className="mt-16 font-mono text-[10px] uppercase tracking-widest text-white/20">
          prototype · v1 home screen
        </p>
      </div>
    </main>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  getPermanentBalance,
  getFMBalance,
  addToWallets,
  setFMStake,
  resetFMBalance,
} from "@/lib/coins";

// ─── Game mode config ────────────────────────────────────────────────────────

const GAME_MODES = [
  {
    label: "Survey Says",
    description: "Classic team survey challenge",
    href: "/survey-says",
    accent: "#fbbf24", // gold
    icon: "🎙️",
    number: "01",
  },
  {
    label: "Survey Steal",
    description: "Steal points from the opposing team",
    href: "/survey-steal",
    accent: "#f87171", // red
    icon: "🔴",
    number: "02",
  },
  {
    label: "Sudden Death",
    description: "One answer — no second chances",
    href: "/sudden-death",
    accent: "#a78bfa", // purple
    icon: "💀",
    number: "03",
  },
  {
    label: "Coins",
    description: "Wager your way to the top",
    href: "/coins",
    accent: "#34d399", // green
    icon: "🪙",
    number: "04",
  },
  {
    label: "Match & Win",
    description: "Find the perfect match to win",
    href: "/match-and-win",
    accent: "#60a5fa", // blue
    icon: "🎯",
    number: "05",
  },
  {
    label: "Chance",
    description: "Your luck is waiting",
    href: "",
    accent: "#f97316", // orange
    icon: "🍀",
    number: "06",
  },
] as const;

function rollChanceReward() {
  return Math.floor(Math.random() * 501) + 500; // 500–1000
}

// ─── Chance Overlay ───────────────────────────────────────────────────────────

function ChanceOverlay({ reward, onClaim }: { reward: number; onClaim: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 30);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center pb-12 transition-all duration-300"
      style={{
        background: visible ? "rgba(0,0,0,0.75)" : "rgba(0,0,0,0)",
        backdropFilter: visible ? "blur(6px)" : "blur(0px)",
      }}
    >
      <div
        className="mx-4 w-full max-w-sm rounded-2xl border border-orange-400/20 bg-[#12121e] p-8 text-center shadow-2xl transition-all duration-500"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(40px)",
          boxShadow: visible ? "0 0 80px rgba(249,115,22,0.15)" : "none",
        }}
      >
        <div className="mb-4 text-6xl">🍀</div>

        <p className="mb-1 font-mono text-xs uppercase tracking-[0.3em] text-orange-400/60">
          You got lucky
        </p>
        <h2
          className="mb-2 text-5xl font-black uppercase"
          style={{
            fontFamily: "Impact, Arial Black, sans-serif",
            color: "#f97316",
            textShadow: "0 0 40px rgba(249,115,22,0.5)",
          }}
        >
          Chance!
        </h2>

        <div className="my-6 rounded-xl border border-orange-400/10 bg-orange-400/[0.05] py-4">
          <p className="font-mono text-xs uppercase tracking-widest text-orange-400/50">
            Instant reward
          </p>
          <p className="mt-1 font-mono text-4xl font-black text-orange-400">
            🪙 {reward.toLocaleString()}
          </p>
        </div>

        <button
          onClick={onClaim}
          className="w-full rounded-xl py-4 text-sm font-black uppercase tracking-widest text-white transition active:scale-95"
          style={{
            background: "linear-gradient(135deg, #f97316, #fb923c)",
            boxShadow: "0 0 30px rgba(249,115,22,0.35)",
          }}
        >
          Claim coins
        </button>
      </div>
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function HomePage() {
  const router = useRouter();
  const [permanent, setPermanent] = useState(0);
  const [fmBalance, setFMBalanceState] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [showChance, setShowChance] = useState(false);
  const [chanceReward, setChanceReward] = useState(0);

  const refreshBalances = () => {
    setPermanent(getPermanentBalance());
    setFMBalanceState(getFMBalance());
  };

  useEffect(() => {
    refreshBalances();
    // #region agent log
    fetch('http://127.0.0.1:7583/ingest/3c7cd91c-4751-48a4-8c56-83b8f52b75f0',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'06c1e7'},body:JSON.stringify({sessionId:'06c1e7',hypothesisId:'A/B/C',location:'src/app/page.tsx:HomePage.useEffect',message:'HomePage mounted',data:{url:window.location.href,pathname:window.location.pathname,port:window.location.port},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
  };

  const handleChanceClaim = () => {
    addToWallets(chanceReward);
    refreshBalances();
    showToast(`+${chanceReward.toLocaleString()}`);
    setShowChance(false);
  };

  const handleWalletClick = () => {
    if (fmBalance === 0) {
      showToast("Win games to build your stake!");
      return;
    }
    setFMStake(fmBalance);
    resetFMBalance();
    setFMBalanceState(0);
    router.push("/fast-money");
  };

  const handleCoinsClick = () => {
    const amount = Math.floor(Math.random() * 46) + 5;
    addToWallets(amount);
    refreshBalances();
    showToast(`+${amount}`);
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0a0a0f] scanlines">
      {showChance && <ChanceOverlay reward={chanceReward} onClaim={handleChanceClaim} />}
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
          {/* Eyebrow */}
          <p className="mb-3 font-mono text-xs uppercase tracking-[0.3em] text-amber-400/70">
            Welcome to
          </p>

          {/* Main title */}
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

          {/* Wallets */}
          <div className="mt-7 flex justify-center">
            <div className="relative flex w-full max-w-xs flex-col gap-2">

              {/* Permanent wallet */}
              <div
                className="flex items-center gap-3 rounded-xl border border-amber-400/15 bg-amber-400/[0.04] px-5 py-3"
              >
                <span className="text-lg">🏦</span>
                <div className="flex-1 text-left">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-amber-400/40">
                    Permanent
                  </p>
                  <p className="font-mono text-base font-black tabular-nums text-amber-400">
                    {permanent.toLocaleString()}
                  </p>
                </div>
                <span className="font-mono text-[10px] text-amber-400/20 uppercase tracking-wider">coins</span>
              </div>

              {/* Fast Money wallet */}
              <button
                onClick={handleWalletClick}
                className="flex items-center gap-3 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.05] px-5 py-3 transition-all duration-200 hover:border-emerald-400/40 hover:bg-emerald-400/[0.09] active:scale-95"
                style={{ boxShadow: fmBalance > 0 ? "0 0 24px rgba(52,211,153,0.08)" : "none" }}
              >
                <span className="text-lg">⚡</span>
                <div className="flex-1 text-left">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-emerald-400/50">
                    Fast Money {fmBalance > 0 ? "· tap to play" : "· win games to fill"}
                  </p>
                  <p className={`font-mono text-base font-black tabular-nums transition-colors ${fmBalance > 0 ? "text-emerald-400" : "text-white/20"}`}>
                    {fmBalance.toLocaleString()}
                  </p>
                </div>
                {fmBalance > 0 && (
                  <svg className="h-3.5 w-3.5 text-emerald-400/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </button>

              {/* Toast */}
              <div
                className="pointer-events-none absolute -right-2 -top-3 font-mono text-sm font-black text-emerald-400 transition-all duration-300"
                style={{
                  opacity: toast ? 1 : 0,
                  transform: toast ? "translateY(-6px)" : "translateY(0px)",
                }}
              >
                {toast}
              </div>
            </div>
          </div>

          {/* Subtitle divider */}
          <div className="mt-7 flex items-center justify-center gap-4">
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-amber-400/60" />
            <p className="text-sm font-medium uppercase tracking-widest text-amber-400/60">
              Choose your mode
            </p>
            <div className="h-px w-16 bg-gradient-to-l from-transparent to-amber-400/60" />
          </div>
        </div>

        {/* ── Mode buttons ── */}
        <nav className="flex w-full max-w-lg flex-col gap-3">
          {GAME_MODES.map((mode) => (
            <GameModeButton
              key={mode.number}
              mode={mode}
              onClick={
                mode.number === "04" ? handleCoinsClick :
                mode.number === "06" ? () => { setChanceReward(rollChanceReward()); setShowChance(true); } :
                undefined
              }
              onNavigate={(href) => {
                // #region agent log
                fetch('http://127.0.0.1:7583/ingest/3c7cd91c-4751-48a4-8c56-83b8f52b75f0',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'06c1e7'},body:JSON.stringify({sessionId:'06c1e7',hypothesisId:'A/D',location:'src/app/page.tsx:GameModeButton.click',message:'Home → game mode link clicked',data:{href,label:mode.label,number:mode.number},timestamp:Date.now()})}).catch(()=>{});
                // #endregion
              }}
            />
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

// ─── Game Mode Button ─────────────────────────────────────────────────────────

type GameMode = (typeof GAME_MODES)[number];

function GameModeButton({
  mode,
  onClick,
  onNavigate,
}: {
  mode: GameMode;
  onClick?: () => void;
  onNavigate?: (href: string) => void;
}) {
  const className =
    "group relative flex items-center gap-5 overflow-hidden rounded-lg border border-white/5 bg-white/[0.03] px-6 py-4 transition-all duration-300 hover:border-white/10 hover:bg-white/[0.06] w-full text-left";
  const style = { "--accent": mode.accent } as React.CSSProperties;
  const inner = (
    <>
      {/* Left accent bar */}
      <div
        className="absolute left-0 top-0 h-full w-1 transition-all duration-300 group-hover:w-1.5"
        style={{ backgroundColor: mode.accent }}
      />
      {/* Hover glow overlay */}
      <div
        className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(ellipse 80% 80% at 0% 50%, ${mode.accent}12, transparent 70%)`,
        }}
      />
      {/* Number */}
      <span
        className="relative font-mono text-xs font-bold tabular-nums tracking-wider opacity-40 transition-opacity duration-300 group-hover:opacity-70"
        style={{ color: mode.accent }}
      >
        {mode.number}
      </span>
      {/* Icon */}
      <span className="relative text-2xl leading-none">{mode.icon}</span>
      {/* Text */}
      <div className="relative flex-1 min-w-0">
        <p className="text-base font-bold uppercase tracking-wide text-white">
          {mode.label}
        </p>
        <p className="mt-0.5 truncate text-xs text-white/40 group-hover:text-white/60">
          {mode.description}
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
    </>
  );

  if (onClick) {
    return (
      <button onClick={onClick} className={className} style={style}>
        {inner}
      </button>
    );
  }

  return (
    <Link href={mode.href} className={className} style={style} onClick={() => onNavigate?.(mode.href)}>
      {inner}
    </Link>
  );
}

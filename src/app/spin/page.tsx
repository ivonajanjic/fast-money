"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  getPermanentBalance,
  getFMBalance,
  addToWallets,
  setFMStake,
  resetFMBalance,
} from "@/lib/coins";

// ─── Segment definitions ──────────────────────────────────────────────────────

interface Segment {
  id: string;
  label: string;
  shortLabel: string;
  emoji: string;
  color: string;
  labelColor: string;
  probability: number;
  href: string;
  sweepAngle: number;
  startAngle: number;
  midAngle: number;
}

const RAW_SEGMENTS = [
  { id: "coins",  label: "Coins",        shortLabel: "COINS",  emoji: "🪙", color: "#34d399", labelColor: "#022c22", probability: 0.50, href: "" },
  { id: "match",  label: "Match & Win",  shortLabel: "MATCH",  emoji: "🎯", color: "#60a5fa", labelColor: "#0c1a2e", probability: 0.15, href: "/match-and-win" },
  { id: "steal",  label: "Survey Steal", shortLabel: "STEAL",  emoji: "🔴", color: "#f87171", labelColor: "#2d0707", probability: 0.15, href: "/survey-steal" },
  { id: "says",   label: "Survey Says",  shortLabel: "SURVEY", emoji: "🎙️", color: "#fbbf24", labelColor: "#2d1a00", probability: 0.10, href: "/survey-says" },
  { id: "death",  label: "Sudden Death", shortLabel: "DEATH",  emoji: "💀", color: "#a78bfa", labelColor: "#1e0a3c", probability: 0.07, href: "/sudden-death" },
  { id: "chance", label: "Chance",       shortLabel: "!",      emoji: "🍀", color: "#f97316", labelColor: "#2a0f00", probability: 0.03, href: "" },
];

// Visual angles are equal for all segments — probabilities only affect the random pick
const EQUAL_SWEEP = 360 / RAW_SEGMENTS.length;

const SEGMENTS: Segment[] = (() => {
  let cum = 0;
  return RAW_SEGMENTS.map((s) => {
    const sweepAngle = EQUAL_SWEEP;
    const startAngle = cum;
    cum += sweepAngle;
    return { ...s, sweepAngle, startAngle, midAngle: startAngle + sweepAngle / 2 };
  });
})();

// ─── SVG wheel geometry ───────────────────────────────────────────────────────

const CX = 160, CY = 160, R = 148;

/** Convert angle (degrees, clockwise from top) + radius to SVG x/y */
function polar(angleDeg: number, radius: number) {
  const rad = (angleDeg - 90) * (Math.PI / 180);
  return { x: CX + radius * Math.cos(rad), y: CY + radius * Math.sin(rad) };
}

function slicePath(startAngle: number, sweepAngle: number): string {
  const p1 = polar(startAngle, R);
  const p2 = polar(startAngle + sweepAngle, R);
  const large = sweepAngle > 180 ? 1 : 0;
  return [
    `M ${CX} ${CY}`,
    `L ${p1.x.toFixed(3)} ${p1.y.toFixed(3)}`,
    `A ${R} ${R} 0 ${large} 1 ${p2.x.toFixed(3)} ${p2.y.toFixed(3)}`,
    "Z",
  ].join(" ");
}

// ─── Weighted random pick ─────────────────────────────────────────────────────

function pickSegment(): Segment {
  let r = Math.random();
  for (const seg of SEGMENTS) {
    r -= seg.probability;
    if (r <= 0) return seg;
  }
  return SEGMENTS[SEGMENTS.length - 1]!;
}

function rollCoins() { return Math.floor(Math.random() * 46) + 5; }
function rollChance() { return Math.floor(Math.random() * 501) + 500; }

const FM_GOAL = 500;

// ─── Chance overlay ───────────────────────────────────────────────────────────

function ChanceOverlay({
  amount,
  onCollect,
}: {
  amount: number;
  onCollect: () => void;
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 40);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center pb-12 transition-all duration-300"
      style={{
        background: visible ? "rgba(0,0,0,0.82)" : "rgba(0,0,0,0)",
        backdropFilter: visible ? "blur(8px)" : "blur(0px)",
      }}
    >
      <div
        className="mx-4 w-full max-w-sm rounded-2xl border bg-[#12121e] p-8 text-center shadow-2xl transition-all duration-500"
        style={{
          borderColor: "#f9731640",
          boxShadow: "0 0 80px #f9731620",
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(40px)",
        }}
      >
        <div className="mb-3 text-6xl">🍀</div>

        <p
          className="mb-1 font-mono text-[10px] uppercase tracking-[0.35em]"
          style={{ color: "#f9731680" }}
        >
          you landed on
        </p>

        <h2
          className="mb-2 text-4xl font-black uppercase"
          style={{
            fontFamily: "Impact, Arial Black, sans-serif",
            color: "#f97316",
            textShadow: "0 0 40px #f9731670",
          }}
        >
          Chance
        </h2>

        <p className="mb-2 text-sm text-white/40">Lucky you! You won</p>

        <p
          className="mb-5 text-5xl font-black tabular-nums"
          style={{
            fontFamily: "Impact, Arial Black, sans-serif",
            color: "#fbbf24",
            textShadow: "0 0 32px rgba(251,191,36,0.6)",
          }}
        >
          🪙 {amount.toLocaleString()}
        </p>

        <button
          onClick={onCollect}
          className="mt-2 w-full rounded-xl py-4 text-sm font-black uppercase tracking-widest text-white transition-all active:scale-95"
          style={{
            background: "#f97316",
            boxShadow: "0 0 24px #f9731650",
          }}
        >
          Collect!
        </button>
      </div>
    </div>
  );
}

// ─── Reveal overlay ───────────────────────────────────────────────────────────

function RevealOverlay({
  segment,
  onGo,
}: {
  segment: Segment;
  onGo: () => void;
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 40);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center pb-12 transition-all duration-300"
      style={{
        background: visible ? "rgba(0,0,0,0.82)" : "rgba(0,0,0,0)",
        backdropFilter: visible ? "blur(8px)" : "blur(0px)",
      }}
    >
      <div
        className="mx-4 w-full max-w-sm rounded-2xl border bg-[#12121e] p-8 text-center shadow-2xl transition-all duration-500"
        style={{
          borderColor: `${segment.color}40`,
          boxShadow: `0 0 80px ${segment.color}20`,
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(40px)",
        }}
      >
        <div className="mb-3 text-6xl">{segment.emoji}</div>

        <p
          className="mb-1 font-mono text-[10px] uppercase tracking-[0.35em]"
          style={{ color: `${segment.color}80` }}
        >
          you landed on
        </p>

        <h2
          className="mb-2 text-4xl font-black uppercase"
          style={{
            fontFamily: "Impact, Arial Black, sans-serif",
            color: segment.color,
            textShadow: `0 0 40px ${segment.color}70`,
          }}
        >
          {segment.label}
        </h2>

        <p className="mb-5 text-sm text-white/40">
          Ready to play {segment.label}?
        </p>

        <button
          onClick={onGo}
          className="mt-2 w-full rounded-xl py-4 text-sm font-black uppercase tracking-widest text-white transition-all active:scale-95"
          style={{
            background: segment.color,
            boxShadow: `0 0 24px ${segment.color}50`,
          }}
        >
          Let&apos;s Go →
        </button>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SpinPage() {
  const router = useRouter();
  const wheelGroupRef = useRef<SVGGElement>(null);
  const rotationRef = useRef(0);

  const [permanent, setPermanent] = useState(0);
  const [fmBalance, setFMBalanceState] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<Segment | null>(null);
  const [showReveal, setShowReveal] = useState(false);
  const [chanceReward, setChanceReward] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const refreshBalances = useCallback(() => {
    setPermanent(getPermanentBalance());
    setFMBalanceState(getFMBalance());
  }, []);

  useEffect(() => { refreshBalances(); }, [refreshBalances]);

  const fmReady = fmBalance >= FM_GOAL;
  const fmProgress = Math.min(fmBalance / FM_GOAL, 1) * 100;

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
  };

  const handleSpin = () => {
    if (spinning || showReveal || chanceReward !== null || fmReady) return;

    const seg = pickSegment();

    // Local angle we want under the pointer (midpoint ± 30% of wedge width)
    const jitter = (Math.random() * 0.6 - 0.3) * seg.sweepAngle;
    const localTarget = seg.midAngle + jitter;

    // CSS rotate(r) moves local angle θ → global θ+r, so the fixed top pointer
    // reads local angle (360 - r). To land localTarget under the pointer we need
    // r % 360 = (360 - localTarget) % 360.
    const targetAngle = ((360 - localTarget) % 360 + 360) % 360;

    // How many degrees more we need to add to reach that rotation
    const currentMod = rotationRef.current % 360;
    const delta = (targetAngle - currentMod + 360) % 360;

    // At least 3 full spins, up to 5, plus the fine delta
    const fullSpins = (3 + Math.floor(Math.random() * 3)) * 360;
    const newRotation = rotationRef.current + fullSpins + delta;
    rotationRef.current = newRotation;

    // Apply directly to DOM — avoids React batching delays
    if (wheelGroupRef.current) {
      wheelGroupRef.current.style.transition =
        "transform 2.2s cubic-bezier(0.17, 0.67, 0.12, 0.99)";
      wheelGroupRef.current.style.transform = `rotate(${newRotation}deg)`;
      wheelGroupRef.current.style.transformOrigin = `${CX}px ${CY}px`;
    }

    setSpinning(true);

    // Pre-compute instant reward
    let computedReward: number | null = null;
    if (seg.id === "coins") computedReward = rollCoins();
    if (seg.id === "chance") computedReward = rollChance();

    setTimeout(() => {
      setSpinning(false);
      if (seg.id === "coins" && computedReward !== null) {
        addToWallets(computedReward);
        refreshBalances();
        showToast(`+${computedReward.toLocaleString()}`);
      } else if (seg.id === "chance" && computedReward !== null) {
        setChanceReward(computedReward);
      } else {
        setResult(seg);
        setShowReveal(true);
      }
    }, 2300);
  };

  const handleCollectChance = () => {
    if (chanceReward === null) return;
    addToWallets(chanceReward);
    refreshBalances();
    showToast(`+${chanceReward.toLocaleString()}`);
    setChanceReward(null);
  };

  const handleGo = () => {
    if (!result) return;
    router.push(result.href);
  };

  const handleWalletClick = () => {
    if (!fmReady) {
      showToast(`Fill the bar to ${FM_GOAL.toLocaleString()} coins!`);
      return;
    }
    setFMStake(fmBalance);
    resetFMBalance();
    setFMBalanceState(0);
    router.push("/fast-money");
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0a0a0f]">
      {/* Background radial */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 55% at 50% 30%, rgba(251,191,36,0.04) 0%, transparent 65%)",
        }}
      />

      {chanceReward !== null && (
        <ChanceOverlay
          amount={chanceReward}
          onCollect={handleCollectChance}
        />
      )}

      {showReveal && result && (
        <RevealOverlay
          segment={result}
          onGo={handleGo}
        />
      )}

      <div className="relative z-10 mx-auto flex min-h-screen max-w-lg flex-col px-4 py-8">

        {/* ── Top bar ── */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-white/30 transition hover:text-white/60"
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Home
          </Link>
          <span className="font-mono text-xs uppercase tracking-widest text-amber-400/60">
            Spin to Play
          </span>
          <div className="w-12" />
        </div>

        {/* ── Wallets ── */}
        <div className="relative mb-6 flex flex-col gap-2">
          {/* Toast */}
          <div
            className="pointer-events-none absolute -right-1 -top-4 font-mono text-sm font-black text-emerald-400 transition-all duration-300"
            style={{
              opacity: toast ? 1 : 0,
              transform: toast ? "translateY(-6px)" : "translateY(0px)",
            }}
          >
            {toast}
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-amber-400/15 bg-amber-400/[0.04] px-5 py-3">
            <span className="text-lg">🏦</span>
            <div className="flex-1 text-left">
              <p className="font-mono text-[10px] uppercase tracking-widest text-amber-400/40">Permanent</p>
              <p className="font-mono text-base font-black tabular-nums text-amber-400">
                {permanent.toLocaleString()}
              </p>
            </div>
            <span className="font-mono text-[10px] uppercase tracking-wider text-amber-400/20">coins</span>
          </div>

          <button
            onClick={handleWalletClick}
            className="flex flex-col gap-2.5 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.05] px-5 py-3 transition-all duration-200 hover:border-emerald-400/40 hover:bg-emerald-400/[0.09] active:scale-95"
            style={{
              boxShadow: fmReady
                ? "0 0 28px rgba(52,211,153,0.2)"
                : fmBalance > 0
                  ? "0 0 24px rgba(52,211,153,0.08)"
                  : "none",
            }}
          >
            <div className="flex w-full items-center gap-3">
              <span className="text-lg">⚡</span>
              <div className="flex-1 text-left">
                <p
                  className={`font-mono text-[10px] uppercase tracking-widest transition-colors ${
                    fmReady ? "text-emerald-400" : "text-emerald-400/50"
                  }`}
                >
                  Fast Money{" "}
                  {fmReady ? "· Ready! · tap to play" : "· win games to fill"}
                </p>
                <p
                  className={`mt-0.5 font-mono text-sm font-black tabular-nums transition-colors ${
                    fmReady ? "text-emerald-400" : fmBalance > 0 ? "text-emerald-400/80" : "text-white/20"
                  }`}
                >
                  {Math.min(fmBalance, FM_GOAL).toLocaleString()} / {FM_GOAL.toLocaleString()}
                </p>
              </div>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-emerald-400 transition-all duration-500"
                style={{ width: `${fmProgress}%` }}
              />
            </div>
          </button>
        </div>

        {/* ── Wheel ── */}
        <div className="flex flex-col items-center">

          {/* Pointer arrow */}
          <div style={{ marginBottom: "-2px", zIndex: 10, position: "relative" }}>
            <svg width="28" height="22" viewBox="0 0 28 22">
              <polygon
                points="14,22 1,1 27,1"
                fill="#fbbf24"
                filter="drop-shadow(0 0 8px rgba(251,191,36,0.7))"
              />
            </svg>
          </div>

          {/* SVG wheel */}
          <div
            className="w-full max-w-[340px] transition-opacity duration-500"
            style={{
              opacity: fmReady ? 0.25 : 1,
              pointerEvents: fmReady ? "none" : "auto",
            }}
          >
            <svg viewBox="0 0 320 320" style={{ overflow: "visible" }}>
              {/* Outer decorative ring */}
              <circle
                cx={CX} cy={CY} r={R + 6}
                fill="none"
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="10"
              />
              <circle
                cx={CX} cy={CY} r={R + 1}
                fill="none"
                stroke="rgba(255,255,255,0.04)"
                strokeWidth="2"
              />

              {/* Spinning group */}
              <g
                ref={wheelGroupRef}
                style={{ transformOrigin: `${CX}px ${CY}px` }}
              >
                {SEGMENTS.map((seg) => {
                  const emojiPt = polar(seg.midAngle, R * 0.72);

                  const textPt = polar(seg.midAngle, R * 0.46);
                  const textRotation = seg.midAngle > 90 && seg.midAngle < 270
                    ? seg.midAngle + 90
                    : seg.midAngle - 90;

                  return (
                    <g key={seg.id}>
                      {/* Wedge */}
                      <path
                        d={slicePath(seg.startAngle, seg.sweepAngle)}
                        fill={seg.color}
                        stroke="#0a0a0f"
                        strokeWidth="1.5"
                        strokeLinejoin="round"
                      />

                      {/* Emoji */}
                      <text
                        x={emojiPt.x}
                        y={emojiPt.y}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize={20}
                        style={{ userSelect: "none", pointerEvents: "none" }}
                      >
                        {seg.emoji}
                      </text>

                      {/* Short text label (radially oriented) */}
                      <text
                        x={textPt.x}
                        y={textPt.y}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize={9}
                        fontWeight="800"
                        fontFamily="monospace"
                        fill={seg.labelColor}
                        opacity="0.85"
                        transform={`rotate(${textRotation}, ${textPt.x}, ${textPt.y})`}
                        style={{ userSelect: "none", pointerEvents: "none", letterSpacing: "0.04em" }}
                      >
                        {seg.shortLabel}
                      </text>
                    </g>
                  );
                })}

                {/* Center hub */}
                <circle cx={CX} cy={CY} r={28} fill="#0a0a0f" />
                <circle cx={CX} cy={CY} r={22} fill="#111128" />
                <circle cx={CX} cy={CY} r={8} fill="#fbbf24" opacity="0.9" />
              </g>

              {/* Static center pin overlay (doesn't spin) */}
              <circle cx={CX} cy={CY} r={5} fill="#fbbf24" />
            </svg>
          </div>

          {/* Spin / Fast Money button */}
          <button
            onClick={fmReady ? handleWalletClick : handleSpin}
            disabled={spinning && !fmReady}
            className="mt-5 w-full max-w-[260px] rounded-xl py-4 text-base font-black uppercase tracking-widest transition-all duration-200 active:scale-95 disabled:cursor-not-allowed"
            style={{
              color: fmReady ? "#000" : spinning ? "rgba(255,255,255,0.4)" : "#000",
              background: fmReady
                ? "#34d399"
                : spinning
                  ? "rgba(251,191,36,0.15)"
                  : "#fbbf24",
              boxShadow: fmReady
                ? "0 0 32px rgba(52,211,153,0.45)"
                : spinning
                  ? "none"
                  : "0 0 32px rgba(251,191,36,0.45)",
              border: fmReady
                ? "1px solid transparent"
                : spinning
                  ? "1px solid rgba(251,191,36,0.25)"
                  : "1px solid transparent",
            }}
          >
            {fmReady ? "Fast Money →" : spinning ? "Spinning…" : "Spin the Wheel"}
          </button>
        </div>

        {/* ── Legend ── */}
        <div className="mt-8 grid grid-cols-3 gap-2">
          {SEGMENTS.map((seg) => (
            <div
              key={seg.id}
              className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2.5"
            >
              <div
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: seg.color }}
              />
              <p className="min-w-0 truncate text-[10px] font-semibold text-white/50">
                {seg.label}
              </p>
            </div>
          ))}
        </div>

        <p className="mt-6 text-center font-mono text-[10px] uppercase tracking-widest text-white/15">
          prototype · spin version
        </p>
      </div>
    </main>
  );
}

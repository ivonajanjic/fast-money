"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  getPermanentBalance,
  getFMBalance,
  getFMRounds,
  addToWallets,
  setFMStake,
  resetFMBalance,
  resetFMRounds,
  setSpinSnapshot,
  getAndClearSpinSnapshot,
  getNonTriviaStreak,
  incrementNonTriviaStreak,
  resetNonTriviaStreak,
  getMatchCooldown,
  decrementMatchCooldown,
  resetMatchCooldown,
  getTriviaCooldown,
  decrementTriviaCooldown,
  resetTriviaCooldown,
} from "@/lib/coins";
import { gameUrlWithReturn } from "@/lib/routes";

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
  { id: "coins",  label: "Coins",        shortLabel: "COINS",  emoji: "🪙", color: "#34d399", labelColor: "#022c22", probability: 0.40, href: "" },
  { id: "match",  label: "Match & Win",  shortLabel: "MATCH",  emoji: "🎯", color: "#60a5fa", labelColor: "#0c1a2e", probability: 0.21, href: "/match-and-win" },
  { id: "steal",  label: "Survey Steal", shortLabel: "STEAL",  emoji: "🔴", color: "#f87171", labelColor: "#2d0707", probability: 0.12, href: "/survey-steal" },
  { id: "says",   label: "Survey Says",  shortLabel: "SURVEY", emoji: "🎙️", color: "#fbbf24", labelColor: "#2d1a00", probability: 0.12, href: "/survey-says" },
  { id: "death",  label: "Sudden Death", shortLabel: "DEATH",  emoji: "💀", color: "#a78bfa", labelColor: "#1e0a3c", probability: 0.06, href: "/sudden-death" },
  { id: "chance", label: "Chance",       shortLabel: "CHANCE!", emoji: "🍀", color: "#f97316", labelColor: "#2a0f00", probability: 0.09, href: "" },
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

const TRIVIA_IDS = new Set(["steal", "says", "death"]);

function pickSegment(forceTrivia = false, matchOnCooldown = false, triviaOnCooldown = false): Segment {
  let pool = forceTrivia ? SEGMENTS.filter((s) => TRIVIA_IDS.has(s.id)) : SEGMENTS;
  if (matchOnCooldown) pool = pool.filter((s) => s.id !== "match");
  if (triviaOnCooldown) pool = pool.filter((s) => !TRIVIA_IDS.has(s.id));
  const total = pool.reduce((sum, s) => sum + s.probability, 0);
  let r = Math.random() * total;
  for (const seg of pool) {
    r -= seg.probability;
    if (r <= 0) return seg;
  }
  return pool[pool.length - 1]!;
}

function rollCoins() { return Math.floor(Math.random() * 46) + 5; }
function rollChance() { return Math.floor(Math.random() * 501) + 500; }

const FM_ROUNDS_GOAL = 5;
const SPIN_ROUNDS_SNAP = "feud_spin_rounds_snap";

function setSpinRoundsSnapshot(): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(SPIN_ROUNDS_SNAP, String(getFMRounds()));
}

function getAndClearSpinRoundsSnapshot(): number | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(SPIN_ROUNDS_SNAP);
  sessionStorage.removeItem(SPIN_ROUNDS_SNAP);
  if (raw === null) return null;
  const n = parseInt(raw, 10);
  return Number.isNaN(n) ? null : n;
}

interface RoundWonSpark {
  id: number;
  dx: number;
  dy: number;
  size: number;
  delay: number;
  duration: number;
  color: string;
  kind: "dot" | "star";
}

function spawnRoundWonSparks(): RoundWonSpark[] {
  const colors = ["#34d399", "#6ee7b7", "#a7f3d0", "#fbbf24", "#fde68a", "#ffffff"];
  return Array.from({ length: 20 }, (_, i) => {
    const angle = (Math.PI * 2 * i) / 20 + (Math.random() - 0.5) * 0.5;
    const dist = 28 + Math.random() * 52;
    return {
      id: i,
      dx: Math.cos(angle) * dist,
      dy: Math.sin(angle) * dist * 0.75,
      size: 3 + Math.random() * 7,
      delay: Math.floor(Math.random() * 100),
      duration: 700 + Math.floor(Math.random() * 350),
      color: colors[Math.floor(Math.random() * colors.length)]!,
      kind: Math.random() > 0.55 ? "star" : "dot",
    };
  });
}

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

export default function Spin2Page() {
  const router = useRouter();
  const wheelGroupRef = useRef<SVGGElement>(null);
  const rotationRef = useRef(0);

  const [permanent, setPermanent] = useState(0);
  const [fmBalance, setFMBalanceState] = useState(0);
  const [fmRounds, setFMRoundsState] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<Segment | null>(null);
  const [showReveal, setShowReveal] = useState(false);
  const [chanceReward, setChanceReward] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [coinToast, setCoinToast] = useState<string | null>(null);
  const hudRef = useRef<HTMLDivElement>(null);
  const fmRef = useRef<HTMLButtonElement>(null);
  const nextParticleId = useRef(0);
  const prevPermanentRef = useRef<number | null>(null);
  const prevFMRef = useRef<number | null>(null);
  const prevFMRoundsRef = useRef<number | null>(null);
  const roundWonClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [particles, setParticles] = useState<Array<{ id: number; srcX: number; srcY: number; tx: number; ty: number; delay: number }>>([]);
  const [hudBounce, setHudBounce] = useState(false);
  const [fmBounce, setFMBounce] = useState(false);
  const [roundWon, setRoundWon] = useState<{ count: number; sparks: RoundWonSpark[] } | null>(null);

  const refreshBalances = useCallback(() => {
    setPermanent(getPermanentBalance());
    setFMBalanceState(getFMBalance());
    setFMRoundsState(getFMRounds());
  }, []);

  const triggerRoundWon = useCallback((count: number) => {
    if (roundWonClearRef.current) clearTimeout(roundWonClearRef.current);
    setRoundWon({ count, sparks: spawnRoundWonSparks() });
    roundWonClearRef.current = setTimeout(() => {
      setRoundWon(null);
      roundWonClearRef.current = null;
    }, 1800);
  }, []);

  const triggerCoinFly = useCallback((targets: "both" | "hud" = "both") => {
    const hud = hudRef.current;
    if (!hud) return;

    const baseSrcX = window.innerWidth / 2;
    const baseSrcY = window.innerHeight * 0.58;

    const spawnToTarget = (destX: number, destY: number, count: number) =>
      Array.from({ length: count }, (_, i) => {
        const srcX = baseSrcX + (Math.random() - 0.5) * 50 - 10;
        const srcY = baseSrcY + (Math.random() - 0.5) * 50 - 10;
        return { id: nextParticleId.current++, srcX, srcY, tx: destX - srcX - 10, ty: destY - srcY - 10, delay: i * 55 };
      });

    const hudRect = hud.getBoundingClientRect();
    const hudBatch = spawnToTarget(hudRect.left + hudRect.width / 2, hudRect.top + hudRect.height / 2, targets === "both" ? 5 : 9);

    const fm = targets === "both" ? fmRef.current : null;
    const fmRect = fm?.getBoundingClientRect();
    const fmBatch = fmRect
      ? spawnToTarget(fmRect.left + fmRect.width / 2, fmRect.top + fmRect.height / 2, 5)
      : [];

    const batch = [...hudBatch, ...fmBatch];
    setParticles((prev) => [...prev, ...batch]);

    const lastDelay = (Math.max(hudBatch.length, 1) - 1) * 55;
    setTimeout(() => {
      setHudBounce(true);
      setTimeout(() => setHudBounce(false), 400);
      if (fmBatch.length > 0) {
        setFMBounce(true);
        setTimeout(() => setFMBounce(false), 400);
      }
    }, lastDelay + 550);
    setTimeout(() => {
      const ids = new Set(batch.map((p) => p.id));
      setParticles((prev) => prev.filter((p) => !ids.has(p.id)));
    }, lastDelay + 950);
  }, []);

  const checkBalanceAndFly = useCallback(() => {
    const newPermanent = getPermanentBalance();
    const newFM = getFMBalance();
    const newRounds = getFMRounds();
    const prevPerm = prevPermanentRef.current;
    const prevFM = prevFMRef.current;
    const prevRounds = prevFMRoundsRef.current;
    prevPermanentRef.current = newPermanent;
    prevFMRef.current = newFM;
    prevFMRoundsRef.current = newRounds;
    setPermanent(newPermanent);
    setFMBalanceState(newFM);
    setFMRoundsState(newRounds);
    if (prevRounds !== null && newRounds > prevRounds) {
      triggerRoundWon(newRounds);
    }
    if (prevPerm !== null && newPermanent > prevPerm) {
      // FM also grew → regular game win → dual fly; FM flat/down → FM win → HUD only
      triggerCoinFly(prevFM !== null && newFM > prevFM ? "both" : "hud");
    }
  }, [triggerCoinFly, triggerRoundWon]);

  useEffect(() => {
    // Check if returning from a game mode with new coins
    const snapshot = getAndClearSpinSnapshot();
    const roundsSnap = getAndClearSpinRoundsSnapshot();
    const currentPerm = getPermanentBalance();
    const currentFM = getFMBalance();
    const currentRounds = getFMRounds();
    prevPermanentRef.current = currentPerm;
    prevFMRef.current = currentFM;
    prevFMRoundsRef.current = currentRounds;
    refreshBalances();

    const scheduleReturnFeedback = () => {
      if (roundsSnap !== null && currentRounds > roundsSnap) {
        triggerRoundWon(currentRounds);
      }
      if (snapshot && currentPerm > snapshot.perm) {
        const fmAlsoGrew = currentFM > snapshot.fm;
        triggerCoinFly(fmAlsoGrew ? "both" : "hud");
      }
    };

    if (
      (roundsSnap !== null && currentRounds > roundsSnap) ||
      (snapshot && currentPerm > snapshot.perm)
    ) {
      setTimeout(scheduleReturnFeedback, 400);
    }

    const onVisible = () => {
      if (document.visibilityState === "visible") checkBalanceAndFly();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", checkBalanceAndFly);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", checkBalanceAndFly);
      if (roundWonClearRef.current) clearTimeout(roundWonClearRef.current);
    };
  }, [refreshBalances, checkBalanceAndFly, triggerCoinFly, triggerRoundWon]);

  const fmReady = fmRounds >= FM_ROUNDS_GOAL;

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
  };

  const showCoinToast = (msg: string) => {
    setCoinToast(msg);
    setTimeout(() => setCoinToast(null), 1800);
  };

  const handleSpin = () => {
    if (spinning || showReveal || chanceReward !== null || fmReady) return;

    const seg = pickSegment(getNonTriviaStreak() >= 3 && getTriviaCooldown() === 0, getMatchCooldown() > 0, getTriviaCooldown() > 0);

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
      // Update pity counter before resolving the outcome
      if (TRIVIA_IDS.has(seg.id)) {
        resetNonTriviaStreak();
      } else {
        incrementNonTriviaStreak();
      }
      // Match & Win cooldown
      if (seg.id === "match") {
        resetMatchCooldown();
      } else {
        decrementMatchCooldown();
      }
      // Trivia bucket cooldown
      if (TRIVIA_IDS.has(seg.id)) {
        resetTriviaCooldown();
      } else {
        decrementTriviaCooldown();
      }
      if (seg.id === "coins" && computedReward !== null) {
        addToWallets(computedReward);
        refreshBalances();
        showCoinToast(`+${computedReward.toLocaleString()}`);
        triggerCoinFly();
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
    showCoinToast(`+${chanceReward.toLocaleString()}`);
    setChanceReward(null);
    triggerCoinFly();
  };

  const handleGo = () => {
    if (!result) return;
    setSpinRoundsSnapshot();
    setSpinSnapshot();
    router.push(gameUrlWithReturn(result.href));
  };

  const handleWalletClick = () => {
    if (!fmReady) {
      showToast(`Win ${FM_ROUNDS_GOAL} trivia rounds to unlock Fast Money!`);
      return;
    }
    launchFastMoney();
  };

  const launchFastMoney = () => {
    setSpinRoundsSnapshot();
    setSpinSnapshot();
    setFMStake(fmBalance);
    resetFMBalance();
    resetFMRounds();
    setFMBalanceState(0);
    setFMRoundsState(0);
    router.push(gameUrlWithReturn("/fast-money"));
  };

  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [fmHolding, setFmHolding] = useState(false);

  const handleFmPointerDown = () => {
    setFmHolding(true);
    holdTimerRef.current = setTimeout(() => {
      setFmHolding(false);
      launchFastMoney();
    }, 800);
  };

  const handleFmPointerUp = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    setFmHolding(false);
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
          {/* HUD coin display */}
          <div
            ref={hudRef}
            className="flex items-center gap-1.5 rounded-full border border-amber-400/20 bg-amber-400/[0.06] px-2.5 py-1 transition-transform duration-150"
            style={hudBounce ? { transform: "scale(1.3)" } : undefined}
          >
            <span className="text-xs leading-none">🪙</span>
            <span className="font-mono text-xs font-black tabular-nums text-amber-400">{permanent.toLocaleString()}</span>
          </div>
        </div>

        {/* ── Fast Money (primary wallet) ── */}
        <div className="relative mb-5">
          {/* Lock-hint toast */}
          <div
            className="pointer-events-none absolute -right-1 -top-5 font-mono text-sm font-black text-emerald-400 transition-all duration-300"
            style={{
              opacity: toast ? 1 : 0,
              transform: toast ? "translateY(-6px)" : "translateY(0px)",
            }}
          >
            {toast}
          </div>

          <button
            ref={fmRef}
            onClick={handleWalletClick}
            onPointerDown={handleFmPointerDown}
            onPointerUp={handleFmPointerUp}
            onPointerLeave={handleFmPointerUp}
            onPointerCancel={handleFmPointerUp}
            className="relative w-full overflow-hidden rounded-2xl border px-5 py-4 text-left transition-all duration-200"
            style={{
              borderColor: fmReady ? "rgba(52,211,153,0.5)" : fmHolding ? "rgba(52,211,153,0.4)" : "rgba(52,211,153,0.12)",
              background: fmReady ? "rgba(52,211,153,0.09)" : "rgba(52,211,153,0.04)",
              boxShadow: fmReady ? "0 0 40px rgba(52,211,153,0.18)" : fmHolding ? "0 0 24px rgba(52,211,153,0.12)" : "none",
              ...(fmBounce ? { transform: "scale(1.03)" } : {}),
            }}
          >
            {/* Hold-to-cheat fill bar */}
            <div
              className="pointer-events-none absolute bottom-0 left-0 h-0.5 rounded-full"
              style={{
                background: "rgba(52,211,153,0.7)",
                width: fmHolding ? "100%" : "0%",
                transition: fmHolding ? "width 800ms linear" : "none",
              }}
            />

            {fmReady && (
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(52,211,153,0.12), transparent 70%)",
                }}
              />
            )}

            {roundWon && (
              <div
                className="pointer-events-none absolute inset-0 z-20 overflow-hidden rounded-2xl"
                style={{
                  background:
                    "radial-gradient(ellipse 90% 80% at 50% 45%, rgba(6, 78, 59, 0.97) 0%, rgba(4, 24, 18, 0.94) 55%, rgba(0, 0, 0, 0.92) 100%)",
                  boxShadow: "inset 0 0 60px rgba(52,211,153,0.15)",
                  animation: "roundWonStamp 1.6s cubic-bezier(0.22, 1, 0.36, 1) both",
                }}
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  {roundWon.sparks.map((s) =>
                    s.kind === "dot" ? (
                      <span
                        key={s.id}
                        className="absolute rounded-full"
                        style={{
                          left: "50%",
                          top: "50%",
                          width: s.size,
                          height: s.size,
                          backgroundColor: s.color,
                          boxShadow: `0 0 ${s.size * 2}px ${s.color}`,
                          "--dx": `${s.dx}px`,
                          "--dy": `${s.dy}px`,
                          animation: `roundWonSpark ${s.duration}ms ease-out ${s.delay}ms both`,
                        } as React.CSSProperties}
                      />
                    ) : (
                      <span
                        key={s.id}
                        className="absolute select-none leading-none"
                        style={{
                          left: "50%",
                          top: "50%",
                          fontSize: s.size + 6,
                          color: s.color,
                          textShadow: `0 0 8px ${s.color}`,
                          "--dx": `${s.dx}px`,
                          "--dy": `${s.dy}px`,
                          animation: `roundWonSpark ${s.duration}ms ease-out ${s.delay}ms both`,
                        } as React.CSSProperties}
                      >
                        ✦
                      </span>
                    )
                  )}
                </div>

                <div className="relative z-10 flex h-full flex-col items-center justify-center px-4">
                  <p
                    className="text-center font-black uppercase leading-none tracking-wide"
                    style={{
                      fontFamily: "Impact, Arial Black, sans-serif",
                      fontSize: "clamp(1.75rem, 7vw, 2.25rem)",
                      color: "#34d399",
                      textShadow:
                        "0 0 24px rgba(52,211,153,0.9), 0 0 48px rgba(52,211,153,0.45), 0 2px 0 rgba(0,0,0,0.8)",
                    }}
                  >
                    Round Won!
                  </p>
                  <p
                    className="mt-2 font-mono text-sm font-bold uppercase tracking-[0.2em] text-emerald-300/90"
                    style={{ textShadow: "0 0 12px rgba(52,211,153,0.5)" }}
                  >
                    {roundWon.count} / {FM_ROUNDS_GOAL}
                  </p>
                </div>
              </div>
            )}

            <div className="relative">
              {/* Header row */}
              <div className="mb-3 flex flex-col items-center text-center">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-emerald-400/50">
                  Fast Money
                </p>
                <div className="relative inline-flex items-center gap-1.5">
                  <span className="text-lg leading-none">🪙</span>
                  <span
                    className={`font-mono text-2xl font-black tabular-nums leading-none transition-colors ${
                      fmReady
                        ? "text-emerald-400"
                        : fmBalance > 0
                        ? "text-emerald-400/70"
                        : "text-white/20"
                    }`}
                  >
                    {fmBalance.toLocaleString()}
                  </span>
                  <span
                    className="pointer-events-none absolute top-1/2 left-full ml-2 -translate-y-1/2 rounded-full border border-emerald-400/40 bg-emerald-400/15 px-2 py-0.5 font-mono text-xs font-bold text-emerald-400 transition-all duration-300 whitespace-nowrap"
                    style={{
                      opacity: coinToast ? 1 : 0,
                      transform: `translateY(${coinToast ? "calc(-50% - 3px)" : "-50%"})`,
                    }}
                  >
                    {coinToast ?? ""}
                  </span>
                </div>
                {fmReady && (
                  <span className="mt-2 rounded-full border border-emerald-400/40 bg-emerald-400/15 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                    Tap to Play →
                  </span>
                )}
              </div>

              {/* Round pips */}
              <div className="flex items-center gap-2">
                {Array.from({ length: FM_ROUNDS_GOAL }).map((_, i) => (
                  <div
                    key={i}
                    className="h-2 w-full rounded-full transition-all duration-300"
                    style={{
                      backgroundColor: i < fmRounds ? "#34d399" : "rgba(255,255,255,0.08)",
                      boxShadow: i < fmRounds ? "0 0 6px rgba(52,211,153,0.5)" : "none",
                    }}
                  />
                ))}
              </div>
              <p className="mt-1.5 font-mono text-[10px] text-white/20">
                {fmReady
                  ? "all rounds complete · ready to play!"
                  : `${Math.min(fmRounds, FM_ROUNDS_GOAL)} / ${FM_ROUNDS_GOAL} trivia wins · keep spinning`}
              </p>
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
            className="mt-5 w-full max-w-[340px] rounded-xl py-4 text-base font-black uppercase tracking-widest transition-all duration-200 active:scale-95 disabled:cursor-not-allowed"
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

        <p className="mt-8 text-center font-mono text-[10px] uppercase tracking-widest text-white/15">
          prototype · spin version 2
        </p>
      </div>

      {/* Flying coin particles */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="pointer-events-none fixed z-[9999] select-none"
          style={{
            left: p.srcX,
            top: p.srcY,
            fontSize: 18,
            "--tx": `${p.tx}px`,
            "--ty": `${p.ty}px`,
            animationName: "coinFly",
            animationDuration: "700ms",
            animationDelay: `${p.delay}ms`,
            animationTimingFunction: "ease-in",
            animationFillMode: "both",
          } as React.CSSProperties}
        >
          🪙
        </div>
      ))}

      <style>{`
        @keyframes coinFly {
          0%   { transform: translate(0, 0) scale(1.4); opacity: 1; }
          70%  { opacity: 1; }
          100% { transform: translate(var(--tx), var(--ty)) scale(0.25); opacity: 0; }
        }
        @keyframes roundWonStamp {
          0%   { opacity: 0; transform: scale(1.5); }
          15%  { opacity: 1; transform: scale(0.95); }
          25%  { opacity: 1; transform: scale(1); }
          75%  { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(1) translateY(-8px); }
        }
        @keyframes roundWonSpark {
          0%   { opacity: 0; transform: translate(-50%, -50%) scale(0); }
          12%  { opacity: 1; transform: translate(calc(-50% + var(--dx) * 0.12), calc(-50% + var(--dy) * 0.12)) scale(1.3); }
          100% { opacity: 0; transform: translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) scale(0.15); }
        }
      `}</style>
    </main>
  );
}

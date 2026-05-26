"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import questionsData from "@/data/survey-says-questions.json";
import { clearFMStake, addToPermanent } from "@/lib/coins";
import { parseReturnHref } from "@/lib/routes";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Option {
  text: string;
  points: number;
  is_correct: boolean;
}

interface Question {
  id: number;
  question: string;
  options: Option[];
}

interface Round {
  question: Question;
  options: Option[];
  topAnswerText: string;
}

interface Answer {
  question: string;
  picked: string | null;
  points: number;
  revealed: boolean;
  isTopAnswer: boolean;
}

type Phase = "quiz" | "reveal" | "done";

const VARIATION_JACKPOT = 2000;

const QUESTION_COUNT = 5;
const TIMER_SECONDS = 15;
const WIN_THRESHOLD = 100;
const TIER_1_5X = 120;
const TIER_2X = 150;
const TIER_3X = 180;

function getMultiplier(pts: number): number {
  if (pts >= TIER_3X) return 3;
  if (pts >= TIER_2X) return 2;
  if (pts >= TIER_1_5X) return 1.5;
  if (pts >= WIN_THRESHOLD) return 1;
  return 0;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickQuestions(): Round[] {
  return shuffle(questionsData as Question[])
    .slice(0, QUESTION_COUNT)
    .map((q) => {
      const correct = q.options
        .filter((o) => o.is_correct)
        .sort((a, b) => b.points - a.points)
        .slice(0, 5);
      const decoys = shuffle(q.options.filter((o) => !o.is_correct)).slice(0, 3);
      const topAnswerText = correct[0]?.text ?? "";
      return { question: q, options: shuffle([...correct, ...decoys]), topAnswerText };
    });
}

// ─── Jackpot Banner ───────────────────────────────────────────────────────────

function JackpotBanner({ stake }: { stake: number }) {
  return (
    <div className="mb-3 flex items-center justify-between rounded-lg border border-amber-400/20 bg-amber-400/[0.05] px-4 py-2.5">
      <span className="font-mono text-[10px] uppercase tracking-widest text-amber-400/60">
        Jackpot
      </span>
      <span className="font-mono text-lg font-black tabular-nums text-amber-400">
        🪙 {stake.toLocaleString()}
      </span>
    </div>
  );
}

// ─── Top Answer Callout ───────────────────────────────────────────────────────

function TopAnswerCallout() {
  const color = "#fbbf24";
  const [sparks] = useState(() => {
    const sparkColors = ["#fbbf24", "#fde68a", "#f97316", "#ffffff"];
    const count = 16;
    return Array.from({ length: count }, (_, i) => {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
      const dist = 14 + Math.random() * 38;
      return {
        id: i,
        dx: Math.cos(angle) * dist,
        dy: Math.sin(angle) * dist * 0.55,
        size: 2 + Math.random() * 4.5,
        delay: Math.floor(Math.random() * 80),
        duration: 550 + Math.floor(Math.random() * 280),
        color: sparkColors[Math.floor(Math.random() * sparkColors.length)]!,
        kind: Math.random() > 0.5 ? ("star" as const) : ("dot" as const),
      };
    });
  });

  return (
    <div
      className="pointer-events-none absolute inset-0 z-20 overflow-hidden rounded-lg"
      style={{
        background:
          "radial-gradient(ellipse 90% 80% at 50% 50%, rgba(78,51,6,0.97) 0%, rgba(0,0,0,0.93) 100%)",
        boxShadow: "inset 0 0 36px rgba(251,191,36,0.18)",
        animation: "scoreCalloutStamp 1.6s cubic-bezier(0.22, 1, 0.36, 1) both",
      }}
    >
      {/* Sparks */}
      <div className="absolute inset-0 flex items-center justify-center">
        {sparks.map((s) =>
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
                animation: `scoreCalloutSpark ${s.duration}ms ease-out ${s.delay}ms both`,
              } as React.CSSProperties}
            />
          ) : (
            <span
              key={s.id}
              className="absolute select-none leading-none"
              style={{
                left: "50%",
                top: "50%",
                fontSize: s.size + 4,
                color: s.color,
                textShadow: `0 0 6px ${s.color}`,
                "--dx": `${s.dx}px`,
                "--dy": `${s.dy}px`,
                animation: `scoreCalloutSpark ${s.duration}ms ease-out ${s.delay}ms both`,
              } as React.CSSProperties}
            >
              ✦
            </span>
          )
        )}
      </div>

      {/* Text */}
      <div className="relative z-10 flex h-full items-center justify-center px-3">
        <p
          className="whitespace-nowrap text-center font-black uppercase leading-none tracking-wide"
          style={{
            fontFamily: "Impact, Arial Black, sans-serif",
            fontSize: "clamp(0.8rem, 3.5vw, 1rem)",
            color,
            textShadow: `0 0 16px ${color}, 0 0 32px rgba(251,191,36,0.5), 0 2px 0 rgba(0,0,0,0.8)`,
          }}
        >
          Top answer!
        </p>
      </div>
    </div>
  );
}

// ─── Answer Slot ──────────────────────────────────────────────────────────────

function AnswerSlot({
  index,
  answer,
  isActive,
  showTopAnswerCallout,
}: {
  index: number;
  answer: Answer | null;
  isActive: boolean;
  showTopAnswerCallout: boolean;
}) {
  const hasPick = answer !== null;
  const isRevealed = answer?.revealed ?? false;

  return (
    <div
      className={`relative flex items-stretch overflow-hidden rounded-lg border transition-all duration-300 ${
        isActive
          ? "border-white/25 bg-white/[0.07]"
          : hasPick
          ? isRevealed
            ? answer.points > 0
              ? "border-amber-400/30 bg-amber-400/[0.05]"
              : "border-white/10 bg-white/[0.03]"
            : "border-white/15 bg-white/[0.04]"
          : "border-white/5 bg-white/[0.02]"
      }`}
    >
      {/* Slot number */}
      <div className="flex w-8 shrink-0 items-center justify-center border-r border-white/[0.07]">
        <span className="font-mono text-[11px] font-bold tabular-nums text-white/25">
          {index + 1}
        </span>
      </div>

      {/* Answer text — large area */}
      <div className="flex min-w-0 flex-1 items-center px-3 py-2.5">
        {!hasPick ? (
          <div className="flex gap-1.5">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-1 w-5 rounded-full bg-white/10" />
            ))}
          </div>
        ) : (
          <p className="truncate text-sm font-semibold text-white">
            {answer.picked ?? "No answer"}
          </p>
        )}
      </div>

      {/* Score — shorter area */}
      <div className="flex w-14 shrink-0 items-center justify-center border-l border-white/[0.07]">
        {!hasPick ? (
          <span className="font-mono text-xs text-white/15">—</span>
        ) : !isRevealed ? (
          <span className="font-mono text-xs font-bold text-white/25">?</span>
        ) : (
          <span
            className="font-mono text-sm font-black tabular-nums"
            style={{
              color: answer.points > 0 ? "#fbbf24" : "rgba(255,255,255,0.2)",
            }}
          >
            {answer.points > 0 ? `+${answer.points}` : "0"}
          </span>
        )}
      </div>

      {/* Top answer callout — overlays entire slot */}
      {showTopAnswerCallout && <TopAnswerCallout />}
    </div>
  );
}

// ─── Answer Board ─────────────────────────────────────────────────────────────

function AnswerBoard({
  answers,
  activeIndex,
  topAnswerCalloutIdx,
}: {
  answers: Answer[];
  activeIndex: number;
  topAnswerCalloutIdx: number | null;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {Array.from({ length: QUESTION_COUNT }).map((_, i) => (
        <AnswerSlot
          key={i}
          index={i}
          answer={answers[i] ?? null}
          isActive={i === activeIndex}
          showTopAnswerCallout={topAnswerCalloutIdx === i}
        />
      ))}
    </div>
  );
}

// ─── Quiz Section ─────────────────────────────────────────────────────────────

function QuizSection({
  questionIndex,
  total,
  question,
  options,
  timeLeft,
  onPick,
}: {
  questionIndex: number;
  total: number;
  question: string;
  options: Option[];
  timeLeft: number;
  onPick: (option: Option) => void;
}) {
  const pct = (timeLeft / TIMER_SECONDS) * 100;
  const timerColor =
    timeLeft > 8 ? "#34d399" : timeLeft > 4 ? "#fbbf24" : "#f87171";

  return (
    <div className="flex flex-col gap-3">
      {/* Timer */}
      <div className="flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{ width: `${pct}%`, backgroundColor: timerColor }}
          />
        </div>
        <span
          className="w-8 text-right font-mono text-sm font-black tabular-nums transition-colors duration-300"
          style={{ color: timerColor }}
        >
          {timeLeft}s
        </span>
      </div>

      {/* Question */}
      <div className="rounded-xl border border-amber-400/15 bg-amber-400/[0.04] px-4 py-3 text-center">
        <p className="text-sm font-semibold leading-snug text-white">{question}</p>
      </div>

      {/* Options */}
      <div className="grid grid-cols-2 gap-2">
        {options.map((opt, i) => (
          <button
            key={i}
            onClick={() => onPick(opt)}
            className="flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-xs font-semibold uppercase tracking-wide text-white transition-all duration-150 hover:border-amber-400/30 hover:bg-amber-400/[0.06] active:scale-95"
          >
            {opt.text}
          </button>
        ))}
      </div>

      {/* Progress dots */}
      <div className="flex justify-center gap-2 pt-1">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className="h-1.5 w-1.5 rounded-full transition-all duration-300"
            style={{
              backgroundColor:
                i < questionIndex
                  ? "#fbbf24"
                  : i === questionIndex
                  ? "#ffffff"
                  : "rgba(255,255,255,0.15)",
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Multiplier bar ───────────────────────────────────────────────────────────

const MILESTONES = [
  { pts: WIN_THRESHOLD, label: "×1", sublabel: "WIN" },
  { pts: TIER_1_5X, label: "×1.5", sublabel: "+50%" },
  { pts: TIER_2X, label: "×2", sublabel: "×2" },
  { pts: TIER_3X, label: "×3", sublabel: "×3" },
] as const;

function MultiplierBar({ totalPoints }: { totalPoints: number }) {
  const MAX = TIER_3X;
  const fillPct = Math.min((totalPoints / MAX) * 100, 100);
  const barColor =
    totalPoints >= WIN_THRESHOLD ? "#fbbf24" : "rgba(255,255,255,0.25)";

  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.03] px-4 py-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-semibold text-white">Score</span>
        <span
          className="font-mono text-2xl font-black tabular-nums transition-all duration-500"
          style={{
            color:
              totalPoints >= WIN_THRESHOLD ? "#fbbf24" : "rgba(255,255,255,0.6)",
          }}
        >
          {totalPoints}
        </span>
      </div>
      <div className="relative mb-3">
        {MILESTONES.map((m) => (
          <div
            key={m.pts}
            className="absolute top-0 h-full w-px"
            style={{
              left: `${(m.pts / MAX) * 100}%`,
              backgroundColor:
                totalPoints >= m.pts ? "#fbbf24" : "rgba(255,255,255,0.12)",
            }}
          />
        ))}
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{ width: `${fillPct}%`, backgroundColor: barColor }}
          />
        </div>
      </div>
      <div className="relative h-8">
        {MILESTONES.map((m) => {
          const reached = totalPoints >= m.pts;
          const leftPct = (m.pts / MAX) * 100;
          return (
            <div
              key={m.pts}
              className="absolute flex -translate-x-1/2 flex-col items-center"
              style={{ left: `${leftPct}%` }}
            >
              <span
                className="font-mono text-[10px] font-black leading-none transition-colors duration-500"
                style={{ color: reached ? "#fbbf24" : "rgba(255,255,255,0.25)" }}
              >
                {m.label}
              </span>
              <span
                className="mt-0.5 font-mono text-[9px] leading-none transition-colors duration-500"
                style={{
                  color: reached
                    ? "rgba(251,191,36,0.5)"
                    : "rgba(255,255,255,0.12)",
                }}
              >
                {m.pts}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Milestone callout (score bar) ────────────────────────────────────────────

type TierKey = 1 | 1.5 | 2 | 3;

interface TierCfg {
  text: string;
  color: string;
  colorSoft: string;
  bgInner: string;
  bgOuter: string;
  innerGlow: string;
  sparkColors: string[];
  sparkCount: number;
  sparkDistMin: number;
  sparkDistMax: number;
}

const TIER_CONFIG: Record<TierKey, TierCfg> = {
  1: {
    text: "Great!",
    color: "#34d399",
    colorSoft: "rgba(52,211,153,0.45)",
    bgInner: "rgba(6, 51, 30, 0.97)",
    bgOuter: "rgba(0, 0, 0, 0.92)",
    innerGlow: "rgba(52,211,153,0.15)",
    sparkColors: ["#34d399", "#6ee7b7", "#a7f3d0", "#ffffff"],
    sparkCount: 18,
    sparkDistMin: 26,
    sparkDistMax: 70,
  },
  1.5: {
    text: "Amazing!",
    color: "#fbbf24",
    colorSoft: "rgba(251,191,36,0.5)",
    bgInner: "rgba(78, 51, 6, 0.97)",
    bgOuter: "rgba(0, 0, 0, 0.92)",
    innerGlow: "rgba(251,191,36,0.18)",
    sparkColors: ["#fbbf24", "#fde68a", "#fef3c7", "#ffffff"],
    sparkCount: 24,
    sparkDistMin: 30,
    sparkDistMax: 88,
  },
  2: {
    text: "On fire!",
    color: "#f97316",
    colorSoft: "rgba(249,115,22,0.55)",
    bgInner: "rgba(78, 30, 6, 0.97)",
    bgOuter: "rgba(0, 0, 0, 0.92)",
    innerGlow: "rgba(249,115,22,0.22)",
    sparkColors: ["#f97316", "#fb923c", "#fbbf24", "#fde68a", "#ffffff"],
    sparkCount: 32,
    sparkDistMin: 32,
    sparkDistMax: 110,
  },
  3: {
    text: "Hot damn!",
    color: "#a78bfa",
    colorSoft: "rgba(167,139,250,0.6)",
    bgInner: "rgba(46, 16, 78, 0.97)",
    bgOuter: "rgba(0, 0, 0, 0.92)",
    innerGlow: "rgba(167,139,250,0.25)",
    sparkColors: ["#a78bfa", "#f472b6", "#fbbf24", "#34d399", "#60a5fa", "#ffffff"],
    sparkCount: 42,
    sparkDistMin: 36,
    sparkDistMax: 135,
  },
};

interface Spark {
  id: number;
  dx: number;
  dy: number;
  size: number;
  delay: number;
  duration: number;
  color: string;
  kind: "dot" | "star";
}

function spawnSparks(cfg: TierCfg): Spark[] {
  const { sparkCount, sparkDistMin, sparkDistMax, sparkColors } = cfg;
  return Array.from({ length: sparkCount }, (_, i) => {
    const angle =
      (Math.PI * 2 * i) / sparkCount + (Math.random() - 0.5) * 0.5;
    const dist = sparkDistMin + Math.random() * (sparkDistMax - sparkDistMin);
    return {
      id: i,
      dx: Math.cos(angle) * dist,
      dy: Math.sin(angle) * dist * 0.75,
      size: 3 + Math.random() * 7,
      delay: Math.floor(Math.random() * 100),
      duration: 700 + Math.floor(Math.random() * 350),
      color: sparkColors[Math.floor(Math.random() * sparkColors.length)]!,
      kind: Math.random() > 0.55 ? "star" : "dot",
    };
  });
}

function ScoreCallout({ tier }: { tier: TierKey }) {
  const cfg = TIER_CONFIG[tier];
  const [sparks] = useState(() => spawnSparks(cfg));

  return (
    <div
      className="pointer-events-none absolute inset-0 z-20 overflow-hidden rounded-xl"
      style={{
        background: `radial-gradient(ellipse 90% 80% at 50% 45%, ${cfg.bgInner} 0%, ${cfg.bgOuter} 100%)`,
        boxShadow: `inset 0 0 60px ${cfg.innerGlow}`,
        animation: "scoreCalloutStamp 1.6s cubic-bezier(0.22, 1, 0.36, 1) both",
      }}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        {sparks.map((s) =>
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
                animation: `scoreCalloutSpark ${s.duration}ms ease-out ${s.delay}ms both`,
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
                animation: `scoreCalloutSpark ${s.duration}ms ease-out ${s.delay}ms both`,
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
            color: cfg.color,
            textShadow: `0 0 24px ${cfg.color}, 0 0 48px ${cfg.colorSoft}, 0 2px 0 rgba(0,0,0,0.8)`,
          }}
        >
          {cfg.text}
        </p>
      </div>
    </div>
  );
}

// ─── Reveal Section ───────────────────────────────────────────────────────────

function RevealSection({
  allRevealed,
  totalPoints,
  reachedTier,
  onRevealNext,
  onContinue,
}: {
  allRevealed: boolean;
  totalPoints: number;
  reachedTier: TierKey | null;
  onRevealNext: () => void;
  onContinue: () => void;
}) {
  return (
    <div
      className="flex flex-col gap-4"
      onClick={!allRevealed ? onRevealNext : undefined}
    >
      <div className="relative" style={{ overflow: "visible" }}>
        <MultiplierBar totalPoints={totalPoints} />
        {reachedTier && <ScoreCallout tier={reachedTier} />}
      </div>

      {!allRevealed ? (
        <p className="text-center font-mono text-[10px] uppercase tracking-widest text-white/25">
          Tap anywhere to reveal
        </p>
      ) : (
        <button
          onClick={onContinue}
          className="w-full rounded-xl bg-amber-400 py-4 text-sm font-black uppercase tracking-widest text-black transition hover:bg-amber-300 active:scale-95"
        >
          See result
        </button>
      )}
    </div>
  );
}

// ─── Outcome screen ───────────────────────────────────────────────────────────

function OutcomeScreen({
  won,
  totalPoints,
  stake,
  finalCoins,
  multiplier,
  onHome,
}: {
  won: boolean;
  totalPoints: number;
  stake: number;
  finalCoins: number;
  multiplier: number;
  onHome: () => void;
}) {
  const [showMultiplier, setShowMultiplier] = useState(false);
  const [showTotal, setShowTotal] = useState(false);
  const [animatedTotal, setAnimatedTotal] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setShowMultiplier(true), 500);
    const t2 = setTimeout(() => setShowTotal(true), 1250);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  useEffect(() => {
    if (!showTotal) return;
    const start = performance.now();
    const duration = 800;
    let raf = 0;
    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedTotal(Math.round(finalCoins * eased));
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [showTotal, finalCoins]);

  const accent = won ? "#fbbf24" : "#f87171";
  const accentSoft = won ? "rgba(251,191,36,0.55)" : "rgba(248,113,113,0.5)";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div
        className="mx-4 w-full max-w-sm rounded-2xl border border-white/10 bg-[#12121e] p-8 text-center shadow-2xl"
        style={{
          animation: showMultiplier
            ? "outcomeCardShake 450ms cubic-bezier(0.36, 0.07, 0.19, 0.97) both"
            : undefined,
        }}
      >
        <div className="mb-4 text-6xl">{won ? "🏆" : "💸"}</div>
        <h2
          className="mb-1 text-4xl font-black uppercase"
          style={{
            fontFamily: "Impact, Arial Black, sans-serif",
            color: accent,
            textShadow: won
              ? "0 0 40px rgba(251,191,36,0.6)"
              : "0 0 30px rgba(248,113,113,0.5)",
          }}
        >
          {won ? "Fast Money!" : "So Close."}
        </h2>
        <p className="mb-6 text-sm text-white/40">
          {won
            ? `${totalPoints} points`
            : `${totalPoints} pts — needed ${WIN_THRESHOLD}`}
        </p>

        <div className="relative mb-6 overflow-hidden rounded-lg border border-white/5 bg-white/[0.03] p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/50">Jackpot</span>
            <span className="font-mono font-semibold text-white/70 tabular-nums">
              🪙 {stake.toLocaleString()}
            </span>
          </div>

          <div
            className="relative my-3 flex items-center justify-center"
            style={{ minHeight: 80 }}
          >
            {showMultiplier && (
              <>
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background: `radial-gradient(circle at center, ${accentSoft} 0%, transparent 65%)`,
                    animation: "multiplierShockwave 700ms ease-out both",
                  }}
                />
                <div
                  className="relative font-black leading-none"
                  style={{
                    fontFamily: "Impact, Arial Black, sans-serif",
                    fontSize: won ? "4.5rem" : "3rem",
                    color: accent,
                    textShadow: `0 0 30px ${accentSoft}, 0 4px 0 rgba(0,0,0,0.6)`,
                    animation:
                      "multiplierSlam 700ms cubic-bezier(0.22, 1.5, 0.36, 1) both",
                  }}
                >
                  {won ? `×${multiplier}` : "BUST"}
                </div>
              </>
            )}
          </div>

          <div
            className="flex items-center justify-between border-t border-white/10 pt-3 transition-opacity duration-300"
            style={{ opacity: showTotal ? 1 : 0 }}
          >
            <span className="font-semibold text-white">Total</span>
            <span
              className="font-mono text-2xl font-black tabular-nums"
              style={{ color: won ? accent : "rgba(255,255,255,0.3)" }}
            >
              🪙 {animatedTotal.toLocaleString()}
            </span>
          </div>
        </div>

        <button
          onClick={onHome}
          className="block w-full rounded-lg border border-white/10 py-3 text-sm font-semibold uppercase tracking-wider text-white/60 transition hover:border-white/20 hover:text-white"
        >
          Back to Home
        </button>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function FastMoneyBoardPage() {
  const router = useRouter();
  const [homeHref, setHomeHref] = useState("/fast-money-variations");
  const [stake, setStakeState] = useState(VARIATION_JACKPOT);
  const [phase, setPhase] = useState<Phase>("quiz");
  const [rounds, setRounds] = useState<Round[]>(() => pickQuestions());
  const [questionIndex, setQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [reachedTier, setReachedTier] = useState<number | null>(null);
  const [topAnswerCalloutIdx, setTopAnswerCalloutIdx] = useState<number | null>(null);
  const coinsAddedRef = useRef(false);
  const nextParticleId = useRef(0);
  const [particles, setParticles] = useState<
    Array<{ id: number; startX: number; startY: number; bx: number; by: number; delay: number }>
  >([]);

  const totalRevealed = answers
    .filter((a) => a.revealed)
    .reduce((s, a) => s + a.points, 0);
  const allRevealed =
    answers.length === QUESTION_COUNT && answers.every((a) => a.revealed);
  const won = totalRevealed >= WIN_THRESHOLD;

  const triggerBurst = useCallback(() => {
    const cx = window.innerWidth / 2 - 10;
    const cy = window.innerHeight / 2 - 10;
    const count = 12;
    const batch = Array.from({ length: count }, (_, i) => {
      const angle =
        ((i / count) * 360 + Math.random() * 20) * (Math.PI / 180);
      const dist = 80 + Math.random() * 90;
      return {
        id: nextParticleId.current++,
        startX: cx,
        startY: cy,
        bx: Math.cos(angle) * dist,
        by: Math.sin(angle) * dist,
        delay: i * 35,
      };
    });
    setParticles((prev) => [...prev, ...batch]);
    setTimeout(() => {
      const ids = new Set(batch.map((p) => p.id));
      setParticles((prev) => prev.filter((p) => !ids.has(p.id)));
    }, count * 35 + 900);
  }, []);

  const initGame = useCallback(() => {
    setStakeState(VARIATION_JACKPOT);
    setRounds(pickQuestions());
    setQuestionIndex(0);
    setTimeLeft(TIMER_SECONDS);
    setAnswers([]);
    setReachedTier(null);
    setTopAnswerCalloutIdx(null);
    setPhase("quiz");
    coinsAddedRef.current = false;
  }, []);

  useEffect(() => {
    initGame();
  }, [initGame]);

  useEffect(() => {
    setHomeHref(
      parseReturnHref(window.location.search, "/fast-money-variations")
    );
  }, []);

  // Timer countdown
  useEffect(() => {
    if (phase !== "quiz") return;
    if (timeLeft <= 0) {
      advanceQuestion(null);
      return;
    }
    const t = setTimeout(() => setTimeLeft((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, timeLeft]);

  const multiplier = getMultiplier(totalRevealed);
  const finalCoins = won ? Math.round(stake * multiplier) : 0;

  // Award coins once when done
  useEffect(() => {
    if (phase === "done" && !coinsAddedRef.current) {
      coinsAddedRef.current = true;
      clearFMStake();
      if (won) {
        addToPermanent(finalCoins);
        triggerBurst();
      }
    }
  }, [phase, won, finalCoins, triggerBurst]);

  const advanceQuestion = useCallback(
    (picked: Option | null) => {
      const pts = picked?.points ?? 0;
      const currentRoundData = rounds[questionIndex];
      const isTopAnswer =
        picked !== null && picked.text === currentRoundData?.topAnswerText;

      const newAnswer: Answer = {
        question: currentRoundData?.question.question ?? "",
        picked: picked?.text ?? null,
        points: pts,
        revealed: false,
        isTopAnswer,
      };

      setAnswers((prev) => [...prev, newAnswer]);

      const next = questionIndex + 1;
      if (next < QUESTION_COUNT) {
        setQuestionIndex(next);
        setTimeLeft(TIMER_SECONDS);
      } else {
        setPhase("reveal");
      }
    },
    [questionIndex, rounds]
  );

  const handlePick = (option: Option) => {
    if (phase !== "quiz") return;
    advanceQuestion(option);
  };

  const handleRevealNext = () => {
    setAnswers((prev) => {
      const nextIdx = prev.findIndex((a) => !a.revealed);
      if (nextIdx === -1) return prev;

      const updated = prev.map((a, i) =>
        i === nextIdx ? { ...a, revealed: true } : a
      );

      // Check for tier milestone
      const newTotal = updated
        .filter((a) => a.revealed)
        .reduce((s, a) => s + a.points, 0);
      const oldTotal = prev
        .filter((a) => a.revealed)
        .reduce((s, a) => s + a.points, 0);
      const oldMultiplier = getMultiplier(oldTotal);
      const newMultiplier = getMultiplier(newTotal);
      if (newMultiplier > oldMultiplier) {
        setReachedTier(newMultiplier);
        setTimeout(() => setReachedTier(null), 1800);
      }

      // Check for top answer
      if (updated[nextIdx]?.isTopAnswer) {
        setTopAnswerCalloutIdx(nextIdx);
        setTimeout(() => setTopAnswerCalloutIdx(null), 1800);
      }

      return updated;
    });
  };

  const currentRound = rounds[questionIndex];

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0a0a0f]">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(251,191,36,0.07) 0%, transparent 60%)",
        }}
      />

      {phase === "done" && (
        <OutcomeScreen
          won={won}
          totalPoints={totalRevealed}
          stake={stake}
          finalCoins={finalCoins}
          multiplier={multiplier}
          onHome={() => router.push(homeHref)}
        />
      )}

      <div className="relative z-10 mx-auto flex min-h-screen max-w-lg flex-col px-4 py-4">
        {/* ── Always-visible top section ── */}
        <div className="mb-4">
          <JackpotBanner stake={stake} />
          <AnswerBoard
            answers={answers}
            activeIndex={phase === "quiz" ? questionIndex : -1}
            topAnswerCalloutIdx={topAnswerCalloutIdx}
          />
        </div>

        {/* ── Phase-specific bottom section ── */}
        <div className="flex flex-1 flex-col justify-start">
          {phase === "quiz" && currentRound && (
            <QuizSection
              questionIndex={questionIndex}
              total={QUESTION_COUNT}
              question={currentRound.question.question}
              options={currentRound.options}
              timeLeft={timeLeft}
              onPick={handlePick}
            />
          )}

          {(phase === "reveal" || phase === "done") && (
            <RevealSection
              allRevealed={allRevealed}
              totalPoints={totalRevealed}
              reachedTier={reachedTier as TierKey | null}
              onRevealNext={handleRevealNext}
              onContinue={() => setPhase("done")}
            />
          )}
        </div>
      </div>

      {/* Coin burst particles */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="pointer-events-none fixed z-[9999] select-none"
          style={{
            left: p.startX,
            top: p.startY,
            fontSize: 20,
            "--bx": `${p.bx}px`,
            "--by": `${p.by}px`,
            animationName: "coinBurst",
            animationDuration: "800ms",
            animationDelay: `${p.delay}ms`,
            animationTimingFunction: "ease-out",
            animationFillMode: "both",
          } as React.CSSProperties}
        >
          🪙
        </div>
      ))}

      <style>{`
        @keyframes coinBurst {
          0%   { transform: translate(0, 0) scale(1.5); opacity: 1; }
          60%  { opacity: 1; }
          100% { transform: translate(var(--bx), var(--by)) scale(0.3); opacity: 0; }
        }
        @keyframes scoreCalloutStamp {
          0%   { opacity: 0; transform: scale(1.5); }
          15%  { opacity: 1; transform: scale(0.95); }
          25%  { opacity: 1; transform: scale(1); }
          75%  { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(1) translateY(-8px); }
        }
        @keyframes scoreCalloutSpark {
          0%   { opacity: 0; transform: translate(-50%, -50%) scale(0); }
          12%  { opacity: 1; transform: translate(calc(-50% + var(--dx) * 0.12), calc(-50% + var(--dy) * 0.12)) scale(1.3); }
          100% { opacity: 0; transform: translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) scale(0.15); }
        }
        @keyframes multiplierSlam {
          0%   { opacity: 0; transform: scale(3.6); filter: blur(10px); }
          55%  { opacity: 1; transform: scale(0.82); filter: blur(0); }
          75%  { transform: scale(1.1); }
          90%  { transform: scale(0.97); }
          100% { opacity: 1; transform: scale(1); filter: blur(0); }
        }
        @keyframes multiplierShockwave {
          0%   { opacity: 0; transform: scale(0.4); }
          30%  { opacity: 0.85; }
          100% { opacity: 0; transform: scale(1.4); }
        }
        @keyframes outcomeCardShake {
          0%, 100% { transform: translate(0, 0); }
          15%      { transform: translate(-5px, 3px); }
          30%      { transform: translate(5px, -3px); }
          45%      { transform: translate(-3px, 2px); }
          60%      { transform: translate(3px, -2px); }
          75%      { transform: translate(-2px, 1px); }
          90%      { transform: translate(1px, 0); }
        }
      `}</style>
    </main>
  );
}

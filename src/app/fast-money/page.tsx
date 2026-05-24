"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import questionsData from "@/data/survey-says-questions.json";
import { getFMStake, clearFMStake, addToPermanent, resetFMRounds } from "@/lib/coins";
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

interface Answer {
  question: string;
  picked: string | null; // null = timed out
  points: number;
  revealed: boolean;
}

type Phase = "announcement" | "quiz" | "reveal" | "done";

const QUESTION_COUNT = 5;
const TIMER_SECONDS = 15;
const WIN_THRESHOLD = 100;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickQuestions(): { question: Question; options: Option[] }[] {
  return shuffle(questionsData as Question[])
    .slice(0, QUESTION_COUNT)
    .map((q) => ({ question: q, options: shuffle(q.options) }));
}

// ─── Quiz phase ───────────────────────────────────────────────────────────────

function QuizPhase({
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
    <div className="flex min-h-screen flex-col px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <span className="font-mono text-xs uppercase tracking-widest text-amber-400/60">
          Fast Money
        </span>
        <span className="font-mono text-xs text-white/30">
          {questionIndex + 1} / {total}
        </span>
      </div>

      {/* Timer */}
      <div className="mb-2 flex items-center justify-between">
        <span className="font-mono text-xs text-white/30">Time</span>
        <span
          className="font-mono text-sm font-black tabular-nums transition-colors duration-300"
          style={{ color: timerColor }}
        >
          {timeLeft}s
        </span>
      </div>
      <div className="mb-6 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${pct}%`, backgroundColor: timerColor }}
        />
      </div>

      {/* Question */}
      <div className="mb-6 rounded-xl border border-amber-400/15 bg-amber-400/[0.04] px-5 py-4 text-center">
        <p className="text-base font-semibold leading-snug text-white">
          {question}
        </p>
      </div>

      {/* Answers */}
      <div className="grid grid-cols-2 gap-2">
        {options.map((opt, i) => (
          <button
            key={i}
            onClick={() => onPick(opt)}
            className="flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3.5 text-sm font-semibold uppercase tracking-wide text-white transition-all duration-150 hover:border-amber-400/30 hover:bg-amber-400/[0.06] active:scale-95"
          >
            {opt.text}
          </button>
        ))}
      </div>

      {/* Progress dots */}
      <div className="mt-auto flex justify-center gap-2 pt-8">
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

// ─── Reveal phase ─────────────────────────────────────────────────────────────

function RevealPhase({
  answers,
  onRevealNext,
  allRevealed,
  totalPoints,
  goldFlash,
  onContinue,
}: {
  answers: Answer[];
  onRevealNext: () => void;
  allRevealed: boolean;
  totalPoints: number;
  goldFlash: boolean;
  onContinue: () => void;
}) {
  const nextHidden = answers.findIndex((a) => !a.revealed);

  return (
    <div
      className="flex min-h-screen flex-col px-4 py-8"
      onClick={!allRevealed ? onRevealNext : undefined}
    >
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <span className="font-mono text-xs uppercase tracking-widest text-amber-400/60">
          Fast Money
        </span>
        <span className="font-mono text-xs text-white/30">Reveal</span>
      </div>

      {/* Gold flash */}
      {goldFlash && (
        <div className="mb-4 animate-pulse rounded-xl border border-amber-400/40 bg-amber-400/10 py-2 text-center text-sm font-black text-amber-400">
          ⚡ 100 Points Reached!
        </div>
      )}

      {/* Answer rows */}
      <div className="flex flex-col gap-2">
        {answers.map((answer, i) => (
          <div
            key={i}
            className={`flex items-center gap-4 rounded-xl border px-4 py-3.5 transition-all duration-500 ${
              answer.revealed
                ? answer.points > 0
                  ? "border-amber-400/30 bg-amber-400/[0.06]"
                  : "border-white/10 bg-white/[0.03]"
                : i === nextHidden
                ? "cursor-pointer border-white/15 bg-white/[0.05] hover:border-white/25"
                : "border-white/5 bg-white/[0.02]"
            }`}
          >
            {/* Q number */}
            <span className="w-6 shrink-0 font-mono text-xs font-bold text-white/20">
              Q{i + 1}
            </span>

            {/* Answer text */}
            <div className="flex-1 min-w-0">
              <p className={`truncate text-sm font-semibold ${answer.revealed ? "text-white" : "text-white/40"}`}>
                {answer.picked ?? "No answer"}
              </p>
            </div>

            {/* Points */}
            <div className="shrink-0 text-right">
              {answer.revealed ? (
                <span
                  className="font-mono text-sm font-black"
                  style={{ color: answer.points > 0 ? "#fbbf24" : "rgba(255,255,255,0.2)" }}
                >
                  {answer.points > 0 ? `+${answer.points}` : "0"}
                </span>
              ) : (
                <span className="font-mono text-sm text-white/20">??</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Running total */}
      <div className="mt-6 flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.03] px-5 py-4">
        <span className="font-semibold text-white">Total</span>
        <div className="text-right">
          <span
            className="font-mono text-2xl font-black tabular-nums transition-all duration-500"
            style={{
              color: totalPoints >= WIN_THRESHOLD ? "#fbbf24" : "rgba(255,255,255,0.6)",
            }}
          >
            {totalPoints}
          </span>
          <span className="ml-1 font-mono text-xs text-white/20">/ {WIN_THRESHOLD}</span>
        </div>
      </div>

      {!allRevealed ? (
        <p className="mt-6 text-center font-mono text-[10px] uppercase tracking-widest text-white/25">
          Tap anywhere to reveal
        </p>
      ) : (
        <button
          onClick={onContinue}
          className="mt-6 w-full rounded-xl bg-amber-400 py-4 text-sm font-black uppercase tracking-widest text-black transition hover:bg-amber-300 active:scale-95"
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
  onHome,
}: {
  won: boolean;
  totalPoints: number;
  stake: number;
  onHome: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-sm rounded-2xl border border-white/10 bg-[#12121e] p-8 text-center shadow-2xl">
        <div className="mb-4 text-6xl">{won ? "🏆" : "💸"}</div>
        <h2
          className="mb-1 text-4xl font-black uppercase"
          style={{
            fontFamily: "Impact, Arial Black, sans-serif",
            color: won ? "#fbbf24" : "#f87171",
            textShadow: won
              ? "0 0 40px rgba(251,191,36,0.6)"
              : "0 0 30px rgba(248,113,113,0.5)",
          }}
        >
          {won ? "Fast Money!" : "So Close."}
        </h2>
        <p className="mb-6 text-sm text-white/40">
          {won
            ? `${totalPoints} points — your stake moves to your permanent wallet!`
            : `${totalPoints} pts — needed ${WIN_THRESHOLD}. Your coins are gone.`}
        </p>

        <div className="mb-6 rounded-lg border border-white/5 bg-white/[0.03] p-4">
          {won ? (
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white">Coins earned</span>
              <span className="font-mono text-2xl font-black text-amber-400">
                🪙 {stake.toLocaleString()}
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white">Coins earned</span>
              <span className="font-mono text-2xl font-black text-white/25">🪙 0</span>
            </div>
          )}
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

export default function FastMoneyPage() {
  const router = useRouter();
  const [homeHref, setHomeHref] = useState("/spin");
  const [stake, setStakeState] = useState(0);
  const [phase, setPhase] = useState<Phase>("quiz");
  const [rounds, setRounds] = useState<{ question: Question; options: Option[] }[]>(() =>
    pickQuestions()
  );
  const [questionIndex, setQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [goldFlash, setGoldFlash] = useState(false);
  const coinsAddedRef = useRef(false);
  const nextParticleId = useRef(0);
  const [particles, setParticles] = useState<Array<{ id: number; startX: number; startY: number; bx: number; by: number; delay: number }>>([]);

  const totalRevealed = answers.filter((a) => a.revealed).reduce((s, a) => s + a.points, 0);
  const allRevealed = answers.length === QUESTION_COUNT && answers.every((a) => a.revealed);
  const won = totalRevealed >= WIN_THRESHOLD;

  const triggerBurst = useCallback(() => {
    const cx = window.innerWidth / 2 - 10;
    const cy = window.innerHeight / 2 - 10;
    const count = 12;
    const batch = Array.from({ length: count }, (_, i) => {
      const angle = ((i / count) * 360 + Math.random() * 20) * (Math.PI / 180);
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
    resetFMRounds();
    const s = getFMStake();
    setStakeState(s);
    setRounds(pickQuestions());
    setQuestionIndex(0);
    setTimeLeft(TIMER_SECONDS);
    setAnswers([]);
    setGoldFlash(false);
    setPhase("quiz");
    coinsAddedRef.current = false;
  }, []);

  useEffect(() => { initGame(); }, [initGame]);

  useEffect(() => {
    setHomeHref(parseReturnHref(window.location.search));
  }, []);

  // Timer countdown
  useEffect(() => {
    if (phase !== "quiz") return;
    if (timeLeft <= 0) {
      advanceQuestion(null); // timed out
      return;
    }
    const t = setTimeout(() => setTimeLeft((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, timeLeft]);

  // Award coins once when done
  useEffect(() => {
    if (phase === "done" && !coinsAddedRef.current) {
      coinsAddedRef.current = true;
      clearFMStake();
      if (won) {
        addToPermanent(stake);
        triggerBurst();
      }
    }
  }, [phase, won, stake, triggerBurst]);

  const advanceQuestion = useCallback(
    (picked: Option | null) => {
      const pts = picked?.points ?? 0;
      const newAnswer: Answer = {
        question: rounds[questionIndex]?.question.question ?? "",
        picked: picked?.text ?? null,
        points: pts,
        revealed: false,
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
      // Check if total just crossed threshold
      const newTotal = updated.filter((a) => a.revealed).reduce((s, a) => s + a.points, 0);
      const oldTotal = prev.filter((a) => a.revealed).reduce((s, a) => s + a.points, 0);
      if (oldTotal < WIN_THRESHOLD && newTotal >= WIN_THRESHOLD) {
        setGoldFlash(true);
        setTimeout(() => setGoldFlash(false), 2500);
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
          onHome={() => router.push(homeHref)}
        />
      )}

      <div className="relative z-10 mx-auto max-w-lg">
        {phase === "quiz" && currentRound && (
          <QuizPhase
            questionIndex={questionIndex}
            total={QUESTION_COUNT}
            question={currentRound.question.question}
            options={currentRound.options}
            timeLeft={timeLeft}
            onPick={handlePick}
          />
        )}

        {(phase === "reveal" || phase === "done") && (
          <RevealPhase
            answers={answers}
            onRevealNext={handleRevealNext}
            allRevealed={allRevealed}
            totalPoints={totalRevealed}
            goldFlash={goldFlash}
            onContinue={() => setPhase("done")}
          />
        )}
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
      `}</style>
    </main>
  );
}

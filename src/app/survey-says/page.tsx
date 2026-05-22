"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import questionsData from "@/data/survey-says-questions.json";
import { addToWallets, incrementFMRounds } from "@/lib/coins";
import { parseReturnHref, SPIN2_PATH } from "@/lib/routes";

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

type GamePhase = "playing" | "won" | "lost";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pickRandomQuestion(): Question {
  const idx = Math.floor(Math.random() * questionsData.length);
  return questionsData[idx] as Question;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StrikesDisplay({ strikes }: { strikes: number }) {
  return (
    <div className="flex items-center justify-center gap-3">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-lg font-black transition-all duration-300 ${
            i < strikes
              ? "border-red-500 bg-red-500/20 text-red-400 scale-110"
              : "border-white/10 bg-white/5 text-white/20"
          }`}
        >
          ✕
        </div>
      ))}
    </div>
  );
}

function BoardSlot({
  rank,
  option,
  revealed,
}: {
  rank: number;
  option: Option | null;
  revealed: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-4 rounded-lg border px-4 py-3 transition-all duration-500 ${
        revealed
          ? "border-amber-400/60 bg-amber-400/10"
          : "border-white/10 bg-white/[0.03]"
      }`}
    >
      {/* Rank */}
      <span
        className={`w-6 shrink-0 font-mono text-xs font-bold ${
          revealed ? "text-amber-400" : "text-white/20"
        }`}
      >
        #{rank}
      </span>

      {/* Answer or placeholder dots */}
      <div className="flex flex-1 items-center">
        {revealed && option ? (
          <p className="text-sm font-bold text-white">{option.text}</p>
        ) : (
          <div className="flex gap-1.5">
            {[...Array(6)].map((_, i) => (
              <span key={i} className="h-1.5 w-1.5 rounded-full bg-white/10" />
            ))}
          </div>
        )}
      </div>

      {/* Points */}
      <span
        className={`shrink-0 font-mono text-xs font-semibold ${
          revealed ? "text-amber-400" : "text-white/10"
        }`}
      >
        {revealed && option ? `+${option.points} pts` : "??"}
      </span>
    </div>
  );
}

function ResultScreen({
  phase,
  totalCoins,
  firstTryBonus,
  revealedCount,
  homeHref,
}: {
  phase: GamePhase;
  totalCoins: number;
  firstTryBonus: boolean;
  revealedCount: number;
  homeHref: string;
}) {
  const won = phase === "won";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-sm rounded-2xl border border-white/10 bg-[#12121e] p-8 text-center shadow-2xl">
        <div className="mb-4 text-6xl">{won ? "🏆" : "💀"}</div>

        <h2
          className="mb-1 text-4xl font-black uppercase"
          style={{
            fontFamily: "Impact, Arial Black, sans-serif",
            color: won ? "#fbbf24" : "#f87171",
            textShadow: won
              ? "0 0 30px rgba(251,191,36,0.6)"
              : "0 0 30px rgba(248,113,113,0.6)",
          }}
        >
          {won ? "Board Cleared!" : "3 Strikes!"}
        </h2>

        <p className="mb-6 text-sm text-white/40">
          {won
            ? "You found all 5 answers!"
            : `You revealed ${revealedCount} of 5 answers.`}
        </p>

        <div className="mb-6 rounded-lg border border-white/5 bg-white/[0.03] p-4">
          {firstTryBonus && (
            <div className="mb-2 flex items-center justify-between border-b border-white/5 pb-2">
              <span className="text-sm text-amber-400">⚡ First Try Bonus</span>
              <span className="font-mono font-bold text-amber-400">+50</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/60">
              Answers ({revealedCount} revealed)
            </span>
            <span className="font-mono font-bold text-white">
              {totalCoins - (firstTryBonus ? 50 : 0)}
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3">
            <span className="font-semibold text-white">Total Coins</span>
            <span className="font-mono text-2xl font-black text-amber-400">
              🪙 {totalCoins}
            </span>
          </div>
        </div>

        <Link
          href={homeHref}
          className="block w-full rounded-lg border border-white/10 py-3 text-sm font-semibold uppercase tracking-wider text-white/60 transition hover:border-white/20 hover:text-white text-center"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function createSurveySaysRound() {
  const q = pickRandomQuestion();
  return { question: q, shuffledOptions: shuffle(q.options) };
}

export default function SurveySaysPage() {
  const coinsAddedRef = useRef(false);
  const [homeHref, setHomeHref] = useState("/spin");
  const initialRound = useMemo(() => createSurveySaysRound(), []);
  const [question, setQuestion] = useState<Question>(initialRound.question);
  const [shuffledOptions, setShuffledOptions] = useState<Option[]>(initialRound.shuffledOptions);
  const [strikes, setStrikes] = useState(0);
  const [revealedIndices, setRevealedIndices] = useState<Set<number>>(new Set());
  const [wrongIndices, setWrongIndices] = useState<Set<number>>(new Set());
  const [shakeIndex, setShakeIndex] = useState<number | null>(null);
  const [gamePhase, setGamePhase] = useState<GamePhase>("playing");
  const [isFirstPick, setIsFirstPick] = useState(true);
  const [firstTryBonus, setFirstTryBonus] = useState(false);
  const [totalCoins, setTotalCoins] = useState(0);
  const [bonusFlash, setBonusFlash] = useState(false);

  // Add winnings to persistent balance once per round
  useEffect(() => {
    if ((gamePhase === "won" || gamePhase === "lost") && !coinsAddedRef.current) {
      coinsAddedRef.current = true;
      addToWallets(totalCoins);
      if (gamePhase === "won" && homeHref === SPIN2_PATH) incrementFMRounds();
    }
  }, [gamePhase, totalCoins, homeHref]);

  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7583/ingest/3c7cd91c-4751-48a4-8c56-83b8f52b75f0',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'06c1e7'},body:JSON.stringify({sessionId:'06c1e7',hypothesisId:'A/D',location:'src/app/survey-says/page.tsx:useEffect',message:'SurveySays mounted',data:{url:window.location.href,search:window.location.search,questionId:question.id,optionsCount:shuffledOptions.length},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    setHomeHref(parseReturnHref(window.location.search));
  }, []);

  const handleOptionClick = (shuffledIdx: number) => {
    if (gamePhase !== "playing") return;
    if (revealedIndices.has(shuffledIdx)) return;
    if (wrongIndices.has(shuffledIdx)) return;

    const option = shuffledOptions[shuffledIdx];
    if (!option) return;

    if (option.is_correct) {
      const maxPoints = Math.max(...shuffledOptions.map((o) => o.points));
      const isFirstTryBonus = isFirstPick && option.points === maxPoints;

      const newRevealed = new Set(revealedIndices);
      newRevealed.add(shuffledIdx);
      setRevealedIndices(newRevealed);

      const earnedCoins = option.points + (isFirstTryBonus ? 50 : 0);
      setTotalCoins((prev) => prev + earnedCoins);

      if (isFirstTryBonus) {
        setFirstTryBonus(true);
        setBonusFlash(true);
        setTimeout(() => setBonusFlash(false), 2500);
      }

      setIsFirstPick(false);

      const correctCount = shuffledOptions.filter((o) => o.is_correct).length;
      if (newRevealed.size === correctCount) {
        setGamePhase("won");
      }
    } else {
      setIsFirstPick(false);
      setShakeIndex(shuffledIdx);
      setTimeout(() => setShakeIndex(null), 600);

      const newWrong = new Set(wrongIndices);
      newWrong.add(shuffledIdx);
      setWrongIndices(newWrong);

      const newStrikes = strikes + 1;
      setStrikes(newStrikes);
      if (newStrikes >= 3) {
        setTimeout(() => setGamePhase("lost"), 500);
      }
    }
  };

  // Board: correct answers sorted by points desc (rank 1 = most points)
  const correctOptions = question.options
    .filter((o) => o.is_correct)
    .sort((a, b) => b.points - a.points);

  const boardSlots = correctOptions.map((correctOpt) => {
    const shuffledIdx = shuffledOptions.findIndex(
      (o) => o.text === correctOpt.text
    );
    return { option: correctOpt, revealed: revealedIndices.has(shuffledIdx) };
  });

  const revealedCount = boardSlots.filter((s) => s.revealed).length;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0a0a0f]">
      {/* Subtle top spotlight */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(251,191,36,0.07) 0%, transparent 60%)",
        }}
      />

      {/* Result overlay */}
      {(gamePhase === "won" || gamePhase === "lost") && (
        <ResultScreen
          phase={gamePhase}
          totalCoins={totalCoins}
          firstTryBonus={firstTryBonus}
          revealedCount={revealedCount}
          homeHref={homeHref}
        />
      )}

      <div className="relative z-10 mx-auto flex min-h-screen max-w-lg flex-col px-4 py-8">

        {/* ── Top bar ── */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            href={homeHref}
            className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-white/30 transition hover:text-white/60"
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Home
          </Link>
          <span className="font-mono text-xs uppercase tracking-widest text-amber-400/60">
            Survey Says
          </span>
          <div className="font-mono text-sm font-bold text-amber-400">
            🪙 {totalCoins}
          </div>
        </div>

        {/* ── Strikes ── */}
        <div className="mb-6">
          <p className="mb-2 text-center font-mono text-[10px] uppercase tracking-widest text-white/30">
            Strikes
          </p>
          <StrikesDisplay strikes={strikes} />
        </div>

        {/* ── Board ── */}
        <div className="mb-6">
          <p className="mb-2 text-center font-mono text-[10px] uppercase tracking-widest text-white/30">
            The Board
          </p>
          <div className="flex flex-col gap-2">
            {boardSlots.map((slot, i) => (
              <BoardSlot
                key={i}
                rank={i + 1}
                option={slot.option}
                revealed={slot.revealed}
              />
            ))}
          </div>
        </div>

        {/* ── Question ── */}
        <div className="mb-5 rounded-lg border border-white/10 bg-white/[0.03] px-5 py-4 text-center">
          <p className="text-base font-semibold leading-snug text-white">
            {question.question}
          </p>
        </div>

        {/* ── First Try Bonus flash ── */}
        <div
          className={`mb-4 overflow-hidden transition-all duration-500 ${
            bonusFlash ? "max-h-12 opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="rounded-lg border border-amber-400/40 bg-amber-400/10 py-2 text-center text-sm font-bold text-amber-400">
            ⚡ First Try Bonus! +50 Coins
          </div>
        </div>

        {/* ── Answer grid ── */}
        <div className="grid grid-cols-2 gap-2">
          {shuffledOptions.map((option, i) => {
            const isRevealed = revealedIndices.has(i);
            const isWrong = wrongIndices.has(i);
            const isShaking = shakeIndex === i;

            return (
              <button
                key={i}
                onClick={() => handleOptionClick(i)}
                disabled={isRevealed || isWrong || gamePhase !== "playing"}
                style={isShaking ? { animation: "wiggle 0.15s ease-in-out 4" } : undefined}
                className={`relative flex items-center justify-center gap-1.5 overflow-hidden rounded-lg border px-4 py-3 text-sm font-semibold uppercase tracking-wide transition-all duration-200
                  ${
                    isRevealed
                      ? "cursor-default border-amber-400/40 bg-amber-400/10 text-amber-300"
                      : isWrong
                      ? "cursor-default border-red-500/20 bg-red-500/5 text-red-400/40 line-through"
                      : "border-white/10 bg-white/[0.03] text-white hover:border-white/20 hover:bg-white/[0.07] active:scale-95"
                  }`}
              >
                {isRevealed && <span className="text-amber-400">✓</span>}
                {isWrong && <span className="text-red-400/60">✕</span>}
                <span>{option.text}</span>
                {isRevealed && (
                  <span className="ml-1 font-mono text-xs text-amber-400/70">
                    +{option.points}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Footer hint ── */}
        <p className="mt-6 text-center font-mono text-[10px] uppercase tracking-widest text-white/20">
          {revealedCount} / 5 found · {3 - strikes} strike{3 - strikes !== 1 ? "s" : ""} left
        </p>
      </div>

      <style>{`
        @keyframes wiggle {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
      `}</style>
    </main>
  );
}

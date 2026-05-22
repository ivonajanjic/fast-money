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

// ─── Data pools ───────────────────────────────────────────────────────────────

const RIVAL_NAMES = [
  "Alex", "Jordan", "Morgan", "Taylor", "Casey",
  "Riley", "Jamie", "Avery", "Quinn", "Blake",
  "Skylar", "Dakota", "Reese", "Finley", "Harlow",
  "Sage", "River", "Emery", "Rowan", "Phoenix",
];

const RIVAL_EMOJIS = [
  "🐱", "🦊", "🐸", "🦁", "🐻", "🦄", "🐧",
  "🦋", "🐯", "🦉", "🐺", "🐨", "🦝", "🐙",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

interface StealSetup {
  question: Question;
  rival: { name: string; emoji: string };
  /** All 5 correct answers sorted by points desc */
  boardSlots: Option[];
  /** Which slot indices (0-based) are pre-filled */
  prefilledIndices: number[];
  /** The 4 options shown to the player: 2 correct (remaining), 2 decoys */
  playerOptions: Option[];
}

function buildSteal(): StealSetup {
  const question = pick(questionsData as Question[]);
  const rival = { name: pick(RIVAL_NAMES), emoji: pick(RIVAL_EMOJIS) };

  // Sort correct answers highest→lowest (rank 1 = index 0)
  const boardSlots = question.options
    .filter((o) => o.is_correct)
    .sort((a, b) => b.points - a.points);

  // Pre-fill the top 3 (indices 0, 1, 2); leave indices 3, 4 empty
  const prefilledIndices = [0, 1, 2];

  // Player options: the 2 remaining correct answers + 2 decoys, shuffled
  const remainingCorrect = [boardSlots[3]!, boardSlots[4]!];
  const decoys = shuffle(question.options.filter((o) => !o.is_correct)).slice(0, 2);
  const playerOptions = shuffle([...remainingCorrect, ...decoys]);

  return { question, rival, boardSlots, prefilledIndices, playerOptions };
}

// ─── Board Slot ───────────────────────────────────────────────────────────────

function BoardSlot({
  rank,
  option,
  state,
}: {
  rank: number;
  option: Option;
  state: "prefilled" | "revealed" | "hidden";
}) {
  const isPrefilled = state === "prefilled";
  const isRevealed = state === "revealed";
  const isHidden = state === "hidden";

  return (
    <div
      className={`flex items-center gap-4 rounded-lg border px-4 py-3 transition-all duration-500 ${
        isPrefilled
          ? "border-white/10 bg-white/[0.05]"
          : isRevealed
          ? "border-red-400/60 bg-red-400/10"
          : "border-white/5 bg-white/[0.02]"
      }`}
    >
      <span
        className={`w-6 shrink-0 font-mono text-xs font-bold ${
          isPrefilled ? "text-white/30" : isRevealed ? "text-red-400" : "text-white/10"
        }`}
      >
        #{rank}
      </span>

      <div className="flex flex-1 items-center">
        {isHidden ? (
          <div className="flex gap-1.5">
            {[...Array(6)].map((_, i) => (
              <span key={i} className="h-1.5 w-1.5 rounded-full bg-white/10" />
            ))}
          </div>
        ) : (
          <p className={`text-sm font-bold ${isPrefilled ? "text-white/60" : "text-white"}`}>
            {option.text}
          </p>
        )}
      </div>

      <span
        className={`shrink-0 font-mono text-xs font-semibold ${
          isPrefilled ? "text-white/20" : isRevealed ? "text-red-400" : "text-white/10"
        }`}
      >
        {isHidden ? "??" : `+${option.points}`}
      </span>
    </div>
  );
}

// ─── Outcome Screen ───────────────────────────────────────────────────────────

function OutcomeScreen({
  phase,
  coinsEarned,
  rival,
  homeHref,
}: {
  phase: GamePhase;
  coinsEarned: number;
  rival: { name: string; emoji: string };
  homeHref: string;
}) {
  const won = phase === "won";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-sm rounded-2xl border border-white/10 bg-[#12121e] p-8 text-center shadow-2xl">
        <div className="mb-4 text-6xl">{won ? "🎉" : "💀"}</div>

        <h2
          className="mb-1 text-4xl font-black uppercase"
          style={{
            fontFamily: "Impact, Arial Black, sans-serif",
            color: won ? "#f87171" : "#f87171",
            textShadow: won
              ? "0 0 30px rgba(248,113,113,0.6)"
              : "0 0 30px rgba(248,113,113,0.4)",
          }}
        >
          {won ? "Steal Success!" : "Steal Failed!"}
        </h2>

        <p className="mb-6 text-sm text-white/40">
          {won
            ? `You swiped ${rival.name}'s board!`
            : `${rival.name} keeps their board.`}
        </p>

        <div className="mb-6 rounded-lg border border-white/5 bg-white/[0.03] p-4">
          {won ? (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/60">Answer points</span>
                <span className="font-mono font-bold text-white">{coinsEarned / 2}</span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm text-red-400">× 2 Steal Multiplier</span>
                <span className="font-mono font-bold text-red-400">×2</span>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3">
                <span className="font-semibold text-white">Total Coins</span>
                <span className="font-mono text-2xl font-black text-amber-400">
                  🪙 {coinsEarned}
                </span>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white">Total Coins</span>
              <span className="font-mono text-2xl font-black text-white/30">🪙 0</span>
            </div>
          )}
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

function createStealRound() {
  const setup = buildSteal();
  const slotStates = setup.boardSlots.map((_, i) =>
    setup.prefilledIndices.includes(i) ? "prefilled" : "hidden"
  ) as ("prefilled" | "revealed" | "hidden")[];
  return { setup, slotStates };
}

export default function SurveyStealPage() {
  const coinsAddedRef = useRef(false);
  const [homeHref, setHomeHref] = useState("/spin");
  const initialRound = useMemo(() => createStealRound(), []);
  const [setup, setSetup] = useState<StealSetup>(initialRound.setup);
  const [slotStates, setSlotStates] = useState<("prefilled" | "revealed" | "hidden")[]>(
    initialRound.slotStates
  );
  const [gamePhase, setGamePhase] = useState<GamePhase>("playing");
  const [coinsEarned, setCoinsEarned] = useState(0);
  const [selectedWrong, setSelectedWrong] = useState<number | null>(null);

  useEffect(() => {
    setHomeHref(parseReturnHref(window.location.search));
  }, []);

  // Add winnings to persistent balance once per round
  useEffect(() => {
    if ((gamePhase === "won" || gamePhase === "lost") && !coinsAddedRef.current) {
      coinsAddedRef.current = true;
      addToWallets(coinsEarned);
      if (gamePhase === "won" && homeHref === SPIN2_PATH) incrementFMRounds();
    }
  }, [gamePhase, coinsEarned, homeHref]);

  const handleOptionClick = (optionIdx: number) => {
    if (gamePhase !== "playing" || !setup) return;

    const option = setup.playerOptions[optionIdx]!;

    if (option.is_correct) {
      // Find which board slot this answer corresponds to
      const boardIdx = setup.boardSlots.findIndex((s) => s.text === option.text);
      const newStates = [...slotStates];
      newStates[boardIdx] = "revealed";
      setSlotStates(newStates);

      // Award points × 2
      setCoinsEarned(option.points * 2);

      setTimeout(() => setGamePhase("won"), 600);
    } else {
      setSelectedWrong(optionIdx);
      setTimeout(() => setGamePhase("lost"), 500);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0a0a0f]">
      {/* Spotlight */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(248,113,113,0.06) 0%, transparent 60%)",
        }}
      />

      {/* Outcome */}
      {(gamePhase === "won" || gamePhase === "lost") && (
        <OutcomeScreen
          phase={gamePhase}
          coinsEarned={coinsEarned}
          rival={setup.rival}
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
          <span className="font-mono text-xs uppercase tracking-widest text-red-400/60">
            Survey Steal
          </span>
          <div className="w-12" />
        </div>

        {/* ── Rival badge ── */}
        <div className="mb-6 flex items-center justify-center gap-3">
          <span className="text-2xl">{setup.rival.emoji}</span>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-white/30">Stealing from</p>
            <p className="text-sm font-bold text-white">{setup.rival.name}</p>
          </div>
        </div>

        {/* ── Board ── */}
        <div className="mb-6">
          <p className="mb-2 text-center font-mono text-[10px] uppercase tracking-widest text-white/30">
            {setup.rival.name}&apos;s Board
          </p>
          <div className="flex flex-col gap-2">
            {setup.boardSlots.map((slot, i) => (
              <BoardSlot
                key={i}
                rank={i + 1}
                option={slot}
                state={slotStates[i] ?? "hidden"}
              />
            ))}
          </div>
        </div>

        {/* ── Question ── */}
        <div className="mb-5 rounded-lg border border-white/10 bg-white/[0.03] px-5 py-4 text-center">
          <p className="text-base font-semibold leading-snug text-white">
            {setup.question.question}
          </p>
        </div>

        {/* ── High stakes warning ── */}
        <div className="mb-4 flex items-center justify-center gap-2">
          <div className="h-px flex-1 bg-red-500/20" />
          <p className="font-mono text-[10px] uppercase tracking-widest text-red-400/60">
            One wrong answer ends the steal
          </p>
          <div className="h-px flex-1 bg-red-500/20" />
        </div>

        {/* ── Options ── */}
        <div className="grid grid-cols-2 gap-2">
          {setup.playerOptions.map((option, i) => {
            const isWrong = selectedWrong === i;

            return (
              <button
                key={i}
                onClick={() => handleOptionClick(i)}
                disabled={gamePhase !== "playing"}
                className={`flex items-center justify-center gap-1.5 rounded-lg border px-4 py-3 text-sm font-semibold uppercase tracking-wide transition-all duration-200
                  ${
                    isWrong
                      ? "border-red-500/40 bg-red-500/10 text-red-400"
                      : "border-white/10 bg-white/[0.03] text-white hover:border-red-400/30 hover:bg-red-400/5 active:scale-95"
                  }`}
              >
                {isWrong && <span>✕</span>}
                {option.text}
              </button>
            );
          })}
        </div>

        <p className="mt-6 text-center font-mono text-[10px] uppercase tracking-widest text-white/20">
          Find 1 correct answer to steal the board
        </p>
      </div>
    </main>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";
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

type GamePhase = "playing" | "won" | "lost" | "opted-out";

// ─── Constants ────────────────────────────────────────────────────────────────

const OPT_OUT_REWARD = 100;
const WIN_REWARD = 500;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface RoundSetup {
  question: Question;
  /** 3 shuffled options: 1 correct + 2 decoys */
  playerOptions: Option[];
}

function buildRound(): RoundSetup {
  const question =
    questionsData[Math.floor(Math.random() * questionsData.length)] as Question;

  // Take the #1 ranked correct answer as the single correct option
  const correct = [...question.options]
    .filter((o) => o.is_correct)
    .sort((a, b) => b.points - a.points)[0]!;

  // Take 2 decoys
  const decoys = shuffle(question.options.filter((o) => !o.is_correct)).slice(0, 2);

  const playerOptions = shuffle([correct, ...decoys]);
  return { question, playerOptions };
}

// ─── Outcome Screen ───────────────────────────────────────────────────────────

function OutcomeScreen({
  phase,
  homeHref,
}: {
  phase: GamePhase;
  homeHref: string;
}) {
  const config = {
    won: {
      icon: "💀",
      title: "You Survived!",
      subtitle: "Gutsy call. It paid off.",
      coins: WIN_REWARD,
      coinsColor: "#a78bfa",
    },
    lost: {
      icon: "💥",
      title: "That's It.",
      subtitle: "Wrong answer. You walk away with nothing.",
      coins: 0,
      coinsColor: undefined,
    },
    "opted-out": {
      icon: "🏳️",
      title: "Smart Move.",
      subtitle: "You lived to play another day.",
      coins: OPT_OUT_REWARD,
      coinsColor: "#fbbf24",
    },
    playing: null,
  }[phase];

  if (!config) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-sm rounded-2xl border border-white/10 bg-[#12121e] p-8 text-center shadow-2xl">
        <div className="mb-4 text-6xl">{config.icon}</div>

        <h2
          className="mb-1 text-4xl font-black uppercase"
          style={{
            fontFamily: "Impact, Arial Black, sans-serif",
            color: "#a78bfa",
            textShadow: "0 0 30px rgba(167,139,250,0.5)",
          }}
        >
          {config.title}
        </h2>

        <p className="mb-6 text-sm text-white/40">{config.subtitle}</p>

        <div className="mb-6 rounded-lg border border-white/5 bg-white/[0.03] p-4">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-white">Coins earned</span>
            <span
              className="font-mono text-2xl font-black"
              style={{ color: config.coinsColor ?? "#ffffff33" }}
            >
              🪙 {config.coins}
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

export default function SuddenDeathPage() {
  const coinsAddedRef = useRef(false);
  const [homeHref, setHomeHref] = useState("/spin");
  const [round, setRound] = useState<RoundSetup>(() => buildRound());
  const [gamePhase, setGamePhase] = useState<GamePhase>("playing");
  const [pickedIndex, setPickedIndex] = useState<number | null>(null);

  useEffect(() => {
    setHomeHref(parseReturnHref(window.location.search));
  }, []);

  // Add winnings to persistent balance once per round
  useEffect(() => {
    if (gamePhase === "playing") return;
    if (coinsAddedRef.current) return;
    coinsAddedRef.current = true;
    const payout =
      gamePhase === "won" ? WIN_REWARD :
      gamePhase === "opted-out" ? OPT_OUT_REWARD : 0;
    addToWallets(payout);
    if (gamePhase === "won" && homeHref === SPIN2_PATH) incrementFMRounds();
  }, [gamePhase, homeHref]);

  const handlePick = (idx: number) => {
    if (gamePhase !== "playing" || !round) return;
    const option = round.playerOptions[idx]!;
    setPickedIndex(idx);
    setTimeout(() => {
      setGamePhase(option.is_correct ? "won" : "lost");
    }, 400);
  };

  const isOutcome =
    gamePhase === "won" || gamePhase === "lost" || gamePhase === "opted-out";

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0a0a0f]">
      {/* Spotlight */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(167,139,250,0.06) 0%, transparent 60%)",
        }}
      />

      {/* Outcome */}
      {isOutcome && <OutcomeScreen phase={gamePhase} homeHref={homeHref} />}

      {/* ── Game screen ── */}
      <div className="relative z-10 mx-auto flex min-h-screen max-w-lg flex-col px-4 py-8">

        {/* Top bar */}
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
          <span className="font-mono text-xs uppercase tracking-widest text-purple-400/60">
            Sudden Death
          </span>
          <div className="w-12" />
        </div>

        {/* Stakes reminder */}
        <div className="mb-8 flex items-center justify-center gap-2">
          <div className="h-px flex-1 bg-purple-500/20" />
          <p className="font-mono text-[10px] uppercase tracking-widest text-purple-400/50">
            500 coins · one chance
          </p>
          <div className="h-px flex-1 bg-purple-500/20" />
        </div>

        {/* Question */}
        <div className="mb-8 rounded-xl border border-purple-400/20 bg-purple-400/[0.04] px-6 py-5 text-center"
          style={{ boxShadow: "0 0 40px rgba(167,139,250,0.05)" }}
        >
          <p className="text-base font-semibold leading-snug text-white">
            {round.question.question}
          </p>
        </div>

        {/* Options */}
        <div className="flex flex-col gap-3">
          {round.playerOptions.map((option, i) => {
            const isPicked = pickedIndex === i;
            const isCorrect = option.is_correct;
            const showResult = isOutcome && isPicked;

            return (
              <button
                key={i}
                onClick={() => handlePick(i)}
                disabled={gamePhase !== "playing"}
                className={`relative flex items-center justify-center overflow-hidden rounded-xl border px-6 py-5 text-base font-bold uppercase tracking-wide transition-all duration-300
                  ${
                    showResult && isCorrect
                      ? "border-purple-400/60 bg-purple-400/15 text-purple-200"
                      : showResult && !isCorrect
                      ? "border-red-500/40 bg-red-500/10 text-red-400"
                      : isPicked
                      ? "border-purple-400/30 bg-purple-400/5 text-purple-200"
                      : "border-white/10 bg-white/[0.03] text-white hover:border-purple-400/30 hover:bg-purple-400/5 active:scale-95"
                  }`}
              >
                {showResult && (
                  <span className="mr-3 text-lg">
                    {isCorrect ? "✓" : "✕"}
                  </span>
                )}
                {option.text}
              </button>
            );
          })}
        </div>

        <p className="mt-8 text-center font-mono text-[10px] uppercase tracking-widest text-white/20">
          Choose wisely — there is no undo
        </p>
      </div>
    </main>
  );
}

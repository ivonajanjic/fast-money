"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { addToWallets } from "@/lib/coins";
import { parseReturnHref } from "@/lib/routes";

// ─── Types & constants ────────────────────────────────────────────────────────

type Symbol = "crown" | "bag" | "coin";
type GamePhase = "playing" | "revealing" | "done";

const SYMBOLS: Record<Symbol, { emoji: string; label: string; points: number; accent: string }> = {
  crown: { emoji: "👑", label: "Crown",     points: 300, accent: "#fbbf24" },
  bag:   { emoji: "💰", label: "Money Bag", points: 200, accent: "#34d399" },
  coin:  { emoji: "🪙", label: "Coin",      points: 100, accent: "#60a5fa" },
};

// Weighted deck: 3 crowns, 5 bags, 4 coins = 12 cards
const DECK_TEMPLATE: Symbol[] = [
  "crown", "crown", "crown",
  "bag", "bag", "bag", "bag", "bag",
  "coin", "coin", "coin", "coin",
];

interface Card {
  id: number;
  symbol: Symbol;
  revealed: boolean;
  isWinner: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildDeck(): Card[] {
  const shuffled = [...DECK_TEMPLATE];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }
  return shuffled.map((symbol, id) => ({ id, symbol, revealed: false, isWinner: false }));
}

// ─── Progress tracker ─────────────────────────────────────────────────────────

function ProgressTracker({
  counts,
  winner,
}: {
  counts: Record<Symbol, number>;
  winner: Symbol | null;
}) {
  return (
    <div className="flex items-center justify-center gap-3">
      {(["crown", "bag", "coin"] as Symbol[]).map((s) => {
        const { emoji, points, accent } = SYMBOLS[s];
        const count = counts[s];
        const isWinner = winner === s;
        return (
          <div
            key={s}
            className="flex flex-1 flex-col items-center rounded-xl border px-3 py-3 transition-all duration-500"
            style={{
              borderColor: isWinner ? accent : "rgba(255,255,255,0.06)",
              background: isWinner ? `${accent}18` : "rgba(255,255,255,0.02)",
              boxShadow: isWinner ? `0 0 20px ${accent}30` : "none",
            }}
          >
            <span className="text-2xl">{emoji}</span>
            {/* Pip row */}
            <div className="mt-2 flex gap-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-1.5 w-1.5 rounded-full transition-all duration-300"
                  style={{
                    backgroundColor: i < count ? accent : "rgba(255,255,255,0.1)",
                    transform: i < count ? "scale(1.2)" : "scale(1)",
                  }}
                />
              ))}
            </div>
            <p
              className="mt-1.5 font-mono text-[10px] font-bold"
              style={{ color: isWinner ? accent : "rgba(255,255,255,0.2)" }}
            >
              {points} pts
            </p>
          </div>
        );
      })}
    </div>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function GameCard({
  card,
  onClick,
  gamePhase,
  hasWinner,
}: {
  card: Card;
  onClick: () => void;
  gamePhase: GamePhase;
  hasWinner: boolean;
}) {
  const { emoji, accent } = SYMBOLS[card.symbol];
  const dimmed = hasWinner && !card.isWinner;

  return (
    <button
      onClick={onClick}
      disabled={card.revealed || gamePhase !== "playing"}
      className="card-btn relative aspect-square w-full"
      style={{ perspective: "600px" }}
    >
      <div
        className="card-inner relative h-full w-full transition-all duration-500"
        style={{
          transformStyle: "preserve-3d",
          transform: card.revealed ? "rotateY(180deg)" : "rotateY(0deg)",
          opacity: dimmed ? 0.35 : 1,
        }}
      >
        {/* Back face (hidden) */}
        <div
          className="card-face absolute inset-0 flex items-center justify-center rounded-xl border border-white/8 bg-white/[0.04]"
          style={{ backfaceVisibility: "hidden" }}
        >
          <span className="text-xl text-white/20">?</span>
        </div>

        {/* Front face (revealed) */}
        <div
          className="card-face absolute inset-0 flex flex-col items-center justify-center rounded-xl border transition-all duration-300"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            borderColor: card.revealed ? `${accent}50` : "transparent",
            background: card.revealed ? `${accent}12` : "transparent",
            boxShadow: card.isWinner ? `0 0 20px ${accent}40` : "none",
          }}
        >
          <span className="text-2xl leading-none">{emoji}</span>
        </div>
      </div>
    </button>
  );
}

// ─── Outcome screen ───────────────────────────────────────────────────────────

function OutcomeScreen({
  winner,
  homeHref,
}: {
  winner: Symbol;
  homeHref: string;
}) {
  const { emoji, label, points, accent } = SYMBOLS[winner];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-sm rounded-2xl border border-white/10 bg-[#12121e] p-8 text-center shadow-2xl">
        <div className="mb-3 text-6xl">{emoji}</div>
        <h2
          className="mb-1 text-4xl font-black uppercase"
          style={{
            fontFamily: "Impact, Arial Black, sans-serif",
            color: accent,
            textShadow: `0 0 30px ${accent}80`,
          }}
        >
          {label} Match!
        </h2>
        <p className="mb-6 text-sm text-white/40">Three of a kind — you win!</p>

        <div className="mb-6 rounded-lg border border-white/5 bg-white/[0.03] p-4">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-white">Coins earned</span>
            <span
              className="font-mono text-2xl font-black"
              style={{ color: accent }}
            >
              🪙 {points}
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

// ─── Main page ────────────────────────────────────────────────────────────────

export default function MatchAndWinPage() {
  const [homeHref, setHomeHref] = useState("/spin");
  const [cards, setCards] = useState<Card[]>(() => buildDeck());
  const [counts, setCounts] = useState<Record<Symbol, number>>({ crown: 0, bag: 0, coin: 0 });
  const [gamePhase, setGamePhase] = useState<GamePhase>("playing");
  const [winner, setWinner] = useState<Symbol | null>(null);
  const coinsAddedRef = useRef(false);

  useEffect(() => {
    setHomeHref(parseReturnHref(window.location.search));
  }, []);

  // Save coins once when game reaches done
  useEffect(() => {
    if (gamePhase === "done" && winner && !coinsAddedRef.current) {
      coinsAddedRef.current = true;
      addToWallets(SYMBOLS[winner].points);
    }
  }, [gamePhase, winner]);

  const handleCardClick = (id: number) => {
    if (gamePhase !== "playing") return;

    setCards((prev) => {
      const next = prev.map((c) =>
        c.id === id ? { ...c, revealed: true } : c
      );

      const flipped = next.find((c) => c.id === id)!;
      const newCounts = { ...counts, [flipped.symbol]: counts[flipped.symbol] + 1 };
      setCounts(newCounts);

      // Check for triplet
      const winSymbol = (Object.keys(newCounts) as Symbol[]).find(
        (s) => newCounts[s] === 3
      );

      if (winSymbol) {
        setWinner(winSymbol);
        setGamePhase("revealing");

        // Mark winning cards
        const withWinners = next.map((c) => ({
          ...c,
          isWinner: c.symbol === winSymbol && c.revealed,
        }));

        // Stagger-reveal remaining face-down cards
        const hidden = withWinners.filter((c) => !c.revealed);
        hidden.forEach((c, i) => {
          setTimeout(() => {
            setCards((cur) =>
              cur.map((card) =>
                card.id === c.id ? { ...card, revealed: true } : card
              )
            );
          }, (i + 1) * 120);
        });

        // After reveal finishes, mark winners and transition to done
        setTimeout(() => {
          setCards((cur) =>
            cur.map((c) => ({ ...c, isWinner: c.symbol === winSymbol }))
          );
          setTimeout(() => setGamePhase("done"), 600);
        }, hidden.length * 120 + 200);

        return withWinners;
      }

      return next;
    });
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0a0a0f]">
      {/* Spotlight */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(96,165,250,0.06) 0%, transparent 60%)",
        }}
      />

      {gamePhase === "done" && winner && (
        <OutcomeScreen winner={winner} homeHref={homeHref} />
      )}

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
          <span className="font-mono text-xs uppercase tracking-widest text-blue-400/60">
            Match &amp; Win
          </span>
          <div className="w-12" />
        </div>

        {/* Progress tracker */}
        <div className="mb-6">
          <p className="mb-2 text-center font-mono text-[10px] uppercase tracking-widest text-white/30">
            Find three of a kind
          </p>
          <ProgressTracker counts={counts} winner={winner} />
        </div>

        {/* Card grid */}
        <div className="grid grid-cols-4 gap-2.5">
          {cards.map((card) => (
            <GameCard
              key={card.id}
              card={card}
              onClick={() => handleCardClick(card.id)}
              gamePhase={gamePhase}
              hasWinner={winner !== null}
            />
          ))}
        </div>

        <p className="mt-6 text-center font-mono text-[10px] uppercase tracking-widest text-white/20">
          {gamePhase === "playing"
            ? `${cards.filter((c) => c.revealed).length} of 12 cards flipped`
            : gamePhase === "revealing"
            ? "Revealing the board..."
            : ""}
        </p>
      </div>

      <style>{`
        .card-btn { cursor: pointer; }
        .card-btn:disabled { cursor: default; }
      `}</style>
    </main>
  );
}

// ─── Permanent wallet (only ever grows) ──────────────────────────────────────

const PERMANENT_KEY = "feud_permanent_balance";

export function getPermanentBalance(): number {
  if (typeof window === "undefined") return 0;
  return parseInt(localStorage.getItem(PERMANENT_KEY) ?? "0", 10);
}

export function addToPermanent(amount: number): number {
  const next = getPermanentBalance() + amount;
  localStorage.setItem(PERMANENT_KEY, String(next));
  return next;
}

// ─── Fast Money wallet (resets after each FM round) ──────────────────────────

const FM_KEY = "feud_fm_balance";

export function getFMBalance(): number {
  if (typeof window === "undefined") return 0;
  return parseInt(localStorage.getItem(FM_KEY) ?? "0", 10);
}

export function addToFM(amount: number): number {
  const next = getFMBalance() + amount;
  localStorage.setItem(FM_KEY, String(next));
  return next;
}

export function resetFMBalance(): void {
  localStorage.setItem(FM_KEY, "0");
}

// ─── Convenience: add to both wallets at once ─────────────────────────────────

export function addToWallets(amount: number): void {
  addToPermanent(amount);
  addToFM(amount);
}

// ─── FM stake (temp storage while a Fast Money round is in progress) ──────────

const FM_STAKE_KEY = "feud_fm_stake";

export function setFMStake(amount: number): void {
  localStorage.setItem(FM_STAKE_KEY, String(amount));
}

export function getFMStake(): number {
  if (typeof window === "undefined") return 0;
  return parseInt(localStorage.getItem(FM_STAKE_KEY) ?? "0", 10);
}

export function clearFMStake(): void {
  localStorage.removeItem(FM_STAKE_KEY);
}

// ─── Trivia bucket cooldown (entire bucket unavailable for 1 spin after landing) ─

const TRIVIA_COOLDOWN_KEY = "feud_trivia_cooldown";

export function getTriviaCooldown(): number {
  if (typeof window === "undefined") return 0;
  return parseInt(localStorage.getItem(TRIVIA_COOLDOWN_KEY) ?? "0", 10);
}

export function decrementTriviaCooldown(): void {
  if (typeof window === "undefined") return;
  const next = Math.max(0, getTriviaCooldown() - 1);
  localStorage.setItem(TRIVIA_COOLDOWN_KEY, String(next));
}

export function resetTriviaCooldown(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TRIVIA_COOLDOWN_KEY, "1");
}

// ─── Match & Win cooldown (unavailable for 7 spins after landing on it) ──────

const MATCH_COOLDOWN_KEY = "feud_match_cooldown";

export function getMatchCooldown(): number {
  if (typeof window === "undefined") return 0;
  return parseInt(localStorage.getItem(MATCH_COOLDOWN_KEY) ?? "0", 10);
}

export function decrementMatchCooldown(): void {
  if (typeof window === "undefined") return;
  const next = Math.max(0, getMatchCooldown() - 1);
  localStorage.setItem(MATCH_COOLDOWN_KEY, String(next));
}

export function resetMatchCooldown(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(MATCH_COOLDOWN_KEY, "7");
}

// ─── Trivia pity counter (forces trivia on 4th consecutive non-trivia spin) ───

const NON_TRIVIA_STREAK_KEY = "feud_non_trivia_streak";

export function getNonTriviaStreak(): number {
  if (typeof window === "undefined") return 0;
  return parseInt(localStorage.getItem(NON_TRIVIA_STREAK_KEY) ?? "0", 10);
}

export function incrementNonTriviaStreak(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(NON_TRIVIA_STREAK_KEY, String(getNonTriviaStreak() + 1));
}

export function resetNonTriviaStreak(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(NON_TRIVIA_STREAK_KEY, "0");
}

// ─── Fast Money trivia rounds (spin-2 progress toward FM unlock) ─────────────

const FM_ROUNDS_KEY = "feud_fm_rounds";

export function getFMRounds(): number {
  if (typeof window === "undefined") return 0;
  return parseInt(localStorage.getItem(FM_ROUNDS_KEY) ?? "0", 10);
}

export function incrementFMRounds(): void {
  if (typeof window === "undefined") return;
  const next = getFMRounds() + 1;
  localStorage.setItem(FM_ROUNDS_KEY, String(next));
}

export function resetFMRounds(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(FM_ROUNDS_KEY, "0");
}

// ─── Spin page snapshot (balance before launching a game mode) ────────────────

const SPIN_PERM_SNAP = "feud_spin_perm_snap";
const SPIN_FM_SNAP   = "feud_spin_fm_snap";

/** Call right before navigating away from spin to a game mode. */
export function setSpinSnapshot(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SPIN_PERM_SNAP, String(getPermanentBalance()));
  localStorage.setItem(SPIN_FM_SNAP,   String(getFMBalance()));
}

/** Read and immediately clear the snapshot. Returns null if none exists. */
export function getAndClearSpinSnapshot(): { perm: number; fm: number } | null {
  if (typeof window === "undefined") return null;
  const perm = localStorage.getItem(SPIN_PERM_SNAP);
  const fm   = localStorage.getItem(SPIN_FM_SNAP);
  localStorage.removeItem(SPIN_PERM_SNAP);
  localStorage.removeItem(SPIN_FM_SNAP);
  if (perm === null) return null;
  return { perm: parseInt(perm, 10), fm: parseInt(fm ?? "0", 10) };
}

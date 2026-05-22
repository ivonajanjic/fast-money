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

// Cosmetic client-side fallback only: the delay ladder slows repeated
// guessing in this browser tab; it is not a security boundary.
const ATTEMPTS_KEY = 'wc.attempts';
const UNTIL_KEY = 'wc.until';

export interface LockState {
  attempts: number;
  until: number;
}

export const LOCKOUT_DELAYS_MS = [2000, 4000, 8000, 16000, 32000] as const;

export function delayForAttempt(attempts: number): number {
  const index = Math.min(Math.max(attempts, 1), LOCKOUT_DELAYS_MS.length) - 1;
  return LOCKOUT_DELAYS_MS[index];
}

export function registerFailure(state: LockState, now: number): LockState {
  const attempts = state.attempts + 1;
  return { attempts, until: now + delayForAttempt(attempts) };
}

export function isLocked(state: LockState, now: number): boolean {
  return state.until > now;
}

export function loadLockState(): LockState {
  const attempts = Number(localStorage.getItem(ATTEMPTS_KEY));
  const until = Number(localStorage.getItem(UNTIL_KEY));
  return {
    attempts: Number.isFinite(attempts) && attempts > 0 ? attempts : 0,
    until: Number.isFinite(until) && until > 0 ? until : 0,
  };
}

export function saveLockState(state: LockState): void {
  localStorage.setItem(ATTEMPTS_KEY, String(state.attempts));
  localStorage.setItem(UNTIL_KEY, String(state.until));
}

export function resetLockout(): void {
  localStorage.removeItem(ATTEMPTS_KEY);
  localStorage.removeItem(UNTIL_KEY);
}

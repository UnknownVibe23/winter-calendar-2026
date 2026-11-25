import { beforeEach, describe, expect, it } from 'vitest';
import {
  delayForAttempt,
  isLocked,
  LOCKOUT_DELAYS_MS,
  loadLockState,
  registerFailure,
  resetLockout,
  saveLockState,
} from './lockout';

describe('lockout', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('delay ladder is exactly 2s, 4s, 8s, 16s, 32s and caps at 32s', () => {
    expect([...LOCKOUT_DELAYS_MS]).toEqual([2000, 4000, 8000, 16000, 32000]);
    expect([1, 2, 3, 4, 5, 6, 10].map(delayForAttempt)).toEqual([
      2000, 4000, 8000, 16000, 32000, 32000, 32000,
    ]);
  });

  it('registerFailure increments the counter and sets until = now + delay', () => {
    const first = registerFailure({ attempts: 0, until: 0 }, 10_000);
    expect(first).toEqual({ attempts: 1, until: 12_000 });
    const second = registerFailure(first, 12_000);
    expect(second).toEqual({ attempts: 2, until: 16_000 });
    const third = registerFailure(second, 16_000);
    expect(third).toEqual({ attempts: 3, until: 24_000 });
    const fourth = registerFailure(third, 24_000);
    expect(fourth).toEqual({ attempts: 4, until: 40_000 });
    const fifth = registerFailure(fourth, 40_000);
    expect(fifth).toEqual({ attempts: 5, until: 72_000 });
  });

  it('isLocked is true strictly before until and false at and after until', () => {
    const state = { attempts: 1, until: 5_000 };
    expect(isLocked(state, 4_999)).toBe(true);
    expect(isLocked(state, 5_000)).toBe(false);
    expect(isLocked(state, 5_001)).toBe(false);
  });

  it('isLocked is false for a fresh state', () => {
    expect(isLocked({ attempts: 0, until: 0 }, 0)).toBe(false);
    expect(isLocked({ attempts: 0, until: 0 }, 1_000_000)).toBe(false);
  });

  it('persists state in wc.attempts and wc.until', () => {
    saveLockState({ attempts: 3, until: 999 });
    expect(localStorage.getItem('wc.attempts')).toBe('3');
    expect(localStorage.getItem('wc.until')).toBe('999');
    expect(loadLockState()).toEqual({ attempts: 3, until: 999 });
  });

  it('loadLockState returns a zero state when nothing is stored or values are invalid', () => {
    expect(loadLockState()).toEqual({ attempts: 0, until: 0 });
    localStorage.setItem('wc.attempts', 'not-a-number');
    localStorage.setItem('wc.until', '-5');
    expect(loadLockState()).toEqual({ attempts: 0, until: 0 });
  });

  it('resets the counter on success', () => {
    const failed = registerFailure(loadLockState(), 1_000);
    saveLockState(failed);
    expect(loadLockState().attempts).toBe(1);
    resetLockout();
    expect(loadLockState()).toEqual({ attempts: 0, until: 0 });
    expect(localStorage.getItem('wc.attempts')).toBeNull();
    expect(localStorage.getItem('wc.until')).toBeNull();
  });
});

import { CALENDAR_MONTH, CALENDAR_YEAR } from './doors';

export type CountdownPhase = 'counting' | 'christmasEve' | 'after';

const DAY_MS = 24 * 60 * 60 * 1000;
const CHRISTMAS_EVE_DAY = 24;

function eveUtcMs(): number {
  return Date.UTC(CALENDAR_YEAR, CALENDAR_MONTH, CHRISTMAS_EVE_DAY);
}

function startOfLocalDayUtcMs(now: Date): number {
  return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
}

export function countdownPhase(now: Date): CountdownPhase {
  const today = startOfLocalDayUtcMs(now);
  const eve = eveUtcMs();
  if (today < eve) {
    return 'counting';
  }
  if (today === eve) {
    return 'christmasEve';
  }
  return 'after';
}

/**
 * Days remaining until Christmas Eve (Dec 24 of the calendar year),
 * computed in whole local calendar days. 0 on Dec 24 itself and never
 * negative afterwards.
 */
export function daysUntilChristmasEve(now: Date): number {
  return Math.max(0, Math.round((eveUtcMs() - startOfLocalDayUtcMs(now)) / DAY_MS));
}

export function countdownText(now: Date): string {
  const phase = countdownPhase(now);
  if (phase === 'christmasEve') {
    return 'It’s Christmas Eve!';
  }
  if (phase === 'after') {
    return 'Merry Christmas!';
  }
  const days = daysUntilChristmasEve(now);
  return days === 1 ? '1 day until Christmas Eve' : `${days} days until Christmas Eve`;
}

import { describe, expect, it } from 'vitest';
import { countdownPhase, countdownText, daysUntilChristmasEve } from './countdown';
import { resolveNow } from './doors';

const NOV_15_2025 = new Date(2025, 10, 15, 12, 0, 0);
const NOV_30_2026 = new Date(2026, 10, 30, 12, 0, 0);
const DEC_1_2026 = new Date(2026, 11, 1, 0, 0, 0);
const DEC_6_2026 = new Date(2026, 11, 6, 9, 0, 0);
const DEC_23_2026 = new Date(2026, 11, 23, 23, 59, 0);
const DEC_24_2026 = new Date(2026, 11, 24, 0, 0, 0);
const DEC_24_LATE_2026 = new Date(2026, 11, 24, 23, 59, 59);
const DEC_25_2026 = new Date(2026, 11, 25, 12, 0, 0);
const DEC_26_2026 = new Date(2026, 11, 26, 12, 0, 0);
const DEC_27_2026 = new Date(2026, 11, 27, 12, 0, 0);
const JAN_2027 = new Date(2027, 0, 10, 12, 0, 0);
const DEC_23_2027 = new Date(2027, 11, 23, 12, 0, 0);

describe('daysUntilChristmasEve', () => {
  it('counts whole local days down to Dec 24, 2026', () => {
    expect(daysUntilChristmasEve(DEC_6_2026)).toBe(18);
    expect(daysUntilChristmasEve(DEC_1_2026)).toBe(23);
    expect(daysUntilChristmasEve(DEC_23_2026)).toBe(1);
    expect(daysUntilChristmasEve(NOV_30_2026)).toBe(24);
  });

  it('is 0 on Dec 24 (any time of day) and never negative afterwards', () => {
    expect(daysUntilChristmasEve(DEC_24_2026)).toBe(0);
    expect(daysUntilChristmasEve(DEC_24_LATE_2026)).toBe(0);
    expect(daysUntilChristmasEve(DEC_25_2026)).toBe(0);
    expect(daysUntilChristmasEve(DEC_26_2026)).toBe(0);
    expect(daysUntilChristmasEve(JAN_2027)).toBe(0);
  });

  it('counts down to the 2026 Christmas Eve from earlier years and clamps later ones', () => {
    expect(daysUntilChristmasEve(NOV_15_2025)).toBeGreaterThan(0);
    expect(daysUntilChristmasEve(DEC_23_2027)).toBe(0);
  });
});

describe('countdownPhase', () => {
  it('is counting before Dec 24 2026, christmasEve on Dec 24, after from Dec 25 on', () => {
    expect(countdownPhase(NOV_15_2025)).toBe('counting');
    expect(countdownPhase(NOV_30_2026)).toBe('counting');
    expect(countdownPhase(DEC_23_2026)).toBe('counting');
    expect(countdownPhase(DEC_24_2026)).toBe('christmasEve');
    expect(countdownPhase(DEC_24_LATE_2026)).toBe('christmasEve');
    expect(countdownPhase(DEC_25_2026)).toBe('after');
    expect(countdownPhase(DEC_26_2026)).toBe('after');
    expect(countdownPhase(DEC_27_2026)).toBe('after');
    expect(countdownPhase(DEC_23_2027)).toBe('after');
  });
});

describe('countdownText', () => {
  it('uses plural, singular and the two holiday lines', () => {
    expect(countdownText(DEC_6_2026)).toBe('18 days until Christmas Eve');
    expect(countdownText(DEC_23_2026)).toBe('1 day until Christmas Eve');
    expect(countdownText(DEC_24_2026)).toBe('It’s Christmas Eve!');
    expect(countdownText(DEC_25_2026)).toBe('Merry Christmas!');
    expect(countdownText(DEC_26_2026)).toBe('Merry Christmas!');
  });

  it('respects the dev ?date= override path end to end', () => {
    const dec6 = resolveNow('?date=2026-12-06', true);
    expect(countdownText(dec6)).toBe('18 days until Christmas Eve');
    const dec24 = resolveNow('?date=2026-12-24', true);
    expect(countdownText(dec24)).toBe('It’s Christmas Eve!');
    const dec25 = resolveNow('?date=2026-12-25', true);
    expect(countdownText(dec25)).toBe('Merry Christmas!');
    expect(daysUntilChristmasEve(dec6)).toBe(18);
  });
});

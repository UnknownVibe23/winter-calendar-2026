import { describe, expect, it } from 'vitest';
import { WREATH_CANDLE_COUNT, WREATH_CANDLE_DAYS, wreathLitCandles } from './wreath';

describe('wreathLitCandles', () => {
  it('lights one candle per advent threshold day (1, 7, 14, 21)', () => {
    expect(WREATH_CANDLE_DAYS).toEqual([1, 7, 14, 21]);
    expect(WREATH_CANDLE_COUNT).toBe(4);
    expect(wreathLitCandles(1)).toBe(1);
    expect(wreathLitCandles(7)).toBe(2);
    expect(wreathLitCandles(14)).toBe(3);
    expect(wreathLitCandles(21)).toBe(4);
  });

  it('is 0 before Dec 1 and stays 0 on day 0 and negative days', () => {
    expect(wreathLitCandles(0)).toBe(0);
    expect(wreathLitCandles(-5)).toBe(0);
    expect(wreathLitCandles(-100)).toBe(0);
  });

  it('holds each candle count between its threshold days', () => {
    expect(wreathLitCandles(2)).toBe(1);
    expect(wreathLitCandles(6)).toBe(1);
    expect(wreathLitCandles(8)).toBe(2);
    expect(wreathLitCandles(13)).toBe(2);
    expect(wreathLitCandles(15)).toBe(3);
    expect(wreathLitCandles(20)).toBe(3);
    expect(wreathLitCandles(22)).toBe(4);
  });

  it('is clamped: full from Dec 21 through the end of December and beyond', () => {
    expect(wreathLitCandles(24)).toBe(4);
    expect(wreathLitCandles(31)).toBe(4);
    expect(wreathLitCandles(99)).toBe(4);
    expect(wreathLitCandles(Number.MAX_SAFE_INTEGER)).toBe(4);
  });

  it('floors fractional days deterministically', () => {
    expect(wreathLitCandles(6.9)).toBe(1);
    expect(wreathLitCandles(7.2)).toBe(2);
    expect(wreathLitCandles(20.99)).toBe(3);
    expect(wreathLitCandles(21.01)).toBe(4);
    expect(wreathLitCandles(13.5)).toBe(wreathLitCandles(13.5));
  });

  it('never exceeds the four candles and never goes below zero', () => {
    for (let day = -10; day <= 40; day += 1) {
      const lit = wreathLitCandles(day);
      expect(lit).toBeGreaterThanOrEqual(0);
      expect(lit).toBeLessThanOrEqual(4);
    }
  });
});

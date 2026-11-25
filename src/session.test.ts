import { beforeEach, describe, expect, it } from 'vitest';
import { clearSession, loadSession, saveSession } from './session';

describe('session', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('save/load round trip restores the key bits and the name', () => {
    const keyBits = new Uint8Array([1, 2, 3, 255, 0, 127]);
    saveSession(keyBits, 'Tester');
    const session = loadSession();
    expect(session).not.toBeNull();
    expect(session?.name).toBe('Tester');
    expect(Array.from(session?.keyBits ?? [])).toEqual([1, 2, 3, 255, 0, 127]);
  });

  it('stores the key bits base64-encoded under wc.key and the name under wc.name', () => {
    saveSession(new Uint8Array([222, 173, 190, 239]), 'Tester');
    expect(localStorage.getItem('wc.key')).toBe('3q2+7w==');
    expect(localStorage.getItem('wc.name')).toBe('Tester');
  });

  it('returns null when nothing is stored', () => {
    expect(loadSession()).toBeNull();
  });

  it('returns null when only one of the two keys is present', () => {
    localStorage.setItem('wc.key', '3q2+7w==');
    expect(loadSession()).toBeNull();
  });

  it('returns null when the stored key is not valid base64', () => {
    localStorage.setItem('wc.key', '!!!not-base64!!!');
    localStorage.setItem('wc.name', 'Tester');
    expect(loadSession()).toBeNull();
  });

  it('clear empties the stored session', () => {
    saveSession(new Uint8Array(32).fill(9), 'Tester');
    clearSession();
    expect(loadSession()).toBeNull();
    expect(localStorage.getItem('wc.key')).toBeNull();
    expect(localStorage.getItem('wc.name')).toBeNull();
  });
});

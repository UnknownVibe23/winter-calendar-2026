import { describe, expect, it } from 'vitest';
import { base64ToBytes } from './base64';
import type { Content } from './content';
import { DecryptError, deriveKeyBits, decryptBundle } from './crypto';
import { encryptForTest } from './test-utils';

const content: Content = {
  v: 1,
  doors: Array.from({ length: 24 }, (_, index) => ({
    n: index + 1,
    text: `Placeholder number ${index + 1}`,
  })),
};

describe('crypto', () => {
  it('round trip: encrypt, derive, decrypt reproduces the input content', async () => {
    const { bundle, keyBits } = await encryptForTest(content, 'Tester', 'schnee123', 1000);
    const derived = await deriveKeyBits('Tester', 'schnee123', base64ToBytes(bundle.salt), 1000);
    expect(derived).toEqual(keyBits);
    const decrypted = await decryptBundle(bundle, derived);
    expect(decrypted).toEqual(content);
  });

  it('defaults to 600000 iterations and derives 256-bit key bits', async () => {
    const salt = new Uint8Array(16).fill(7);
    const implicit = await deriveKeyBits('tester', 'schnee123', salt);
    const explicit = await deriveKeyBits('tester', 'schnee123', salt, 600000);
    expect(implicit).toHaveLength(32);
    expect(implicit).toEqual(explicit);
  });

  it('fails with DecryptError on a wrong name', async () => {
    const { bundle } = await encryptForTest(content, 'tester', 'schnee123', 1000);
    const keyBits = await deriveKeyBits('someoneelse', 'schnee123', base64ToBytes(bundle.salt), 1000);
    await expect(decryptBundle(bundle, keyBits)).rejects.toBeInstanceOf(DecryptError);
  });

  it('fails with DecryptError on a wrong password', async () => {
    const { bundle } = await encryptForTest(content, 'tester', 'schnee123', 1000);
    const keyBits = await deriveKeyBits('tester', 'falsch', base64ToBytes(bundle.salt), 1000);
    await expect(decryptBundle(bundle, keyBits)).rejects.toBeInstanceOf(DecryptError);
  });

  it('fails with DecryptError on tampered ciphertext', async () => {
    const { bundle, keyBits } = await encryptForTest(content, 'tester', 'schnee123', 1000);
    const tampered = { ...bundle, ct: bundle.ct.slice(0, -4) + 'AAAA' };
    await expect(decryptBundle(tampered, keyBits)).rejects.toBeInstanceOf(DecryptError);
  });

  it('derives different key bits for a different salt', async () => {
    const first = await deriveKeyBits('tester', 'schnee123', new Uint8Array(16).fill(1), 1000);
    const second = await deriveKeyBits('tester', 'schnee123', new Uint8Array(16).fill(2), 1000);
    expect(first).not.toEqual(second);
  });

  it('trims and lowercases the name in the key material', async () => {
    const salt = new Uint8Array(16).fill(3);
    const padded = await deriveKeyBits('  Tester ', 'schnee123', salt, 1000);
    const plain = await deriveKeyBits('tester', 'schnee123', salt, 1000);
    expect(padded).toEqual(plain);
  });

  it('uses the password as typed, without trimming', async () => {
    const salt = new Uint8Array(16).fill(4);
    const plain = await deriveKeyBits('tester', 'schnee123', salt, 1000);
    const padded = await deriveKeyBits('tester', ' schnee123', salt, 1000);
    expect(plain).not.toEqual(padded);
  });

  it('DecryptError is a named Error subclass', () => {
    const error = new DecryptError();
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('DecryptError');
  });
});

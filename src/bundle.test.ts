import { readFileSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { base64ToBytes } from './base64';
import type { Bundle } from './content';
import { DecryptError, decryptBundle, deriveKeyBits } from './crypto';

const root = process.cwd();
const bundle = JSON.parse(
  readFileSync(path.join(root, 'public', 'content.enc'), 'utf8'),
) as Bundle;

describe('public/content.enc', () => {
  it('parses as a v1 bundle with the expected algorithm and iteration count', () => {
    expect(bundle.v).toBe(1);
    expect(bundle.alg).toBe('PBKDF2-SHA256-AES-GCM');
    expect(bundle.iter).toBe(600000);
  });

  it('has base64 fields that decode to a 16-byte salt, a 12-byte iv and ciphertext', () => {
    expect(base64ToBytes(bundle.salt)).toHaveLength(16);
    expect(base64ToBytes(bundle.iv)).toHaveLength(12);
    expect(base64ToBytes(bundle.ct).length).toBeGreaterThan(0);
  });

  it('decrypts with the dummy pair tester / schnee123 into the name-free schema', async () => {
    const keyBits = await deriveKeyBits('tester', 'schnee123', base64ToBytes(bundle.salt), bundle.iter);
    const content = await decryptBundle(bundle, keyBits);
    expect(content.v).toBe(1);
    expect('name' in content).toBe(false);
    expect('greeting' in content).toBe(false);
  });

  it('contains 24 doors numbered 1..24, each with a photo and a 320x320 JPEG thumbnail', async () => {
    const keyBits = await deriveKeyBits('tester', 'schnee123', base64ToBytes(bundle.salt), bundle.iter);
    const content = await decryptBundle(bundle, keyBits);
    expect(content.doors).toHaveLength(24);
    expect(content.doors.map((door) => door.n)).toEqual(
      Array.from({ length: 24 }, (_, index) => index + 1),
    );
    for (const door of content.doors) {
      expect(door.text).toBe(`Placeholder number ${door.n}`);
      const photo = door.photo;
      expect(photo).toBeDefined();
      const data = base64ToBytes(photo?.data ?? '');
      expect(data[0]).toBe(0xff);
      expect(data[1]).toBe(0xd8);
      const thumb = base64ToBytes(photo?.thumb ?? '');
      expect(thumb[0]).toBe(0xff);
      expect(thumb[1]).toBe(0xd8);
      const metadata = await sharp(thumb).metadata();
      expect(metadata.format).toBe('jpeg');
      expect(metadata.width).toBe(320);
      expect(metadata.height).toBe(320);
    }
  });

  it('does not decrypt with a wrong password', async () => {
    const keyBits = await deriveKeyBits('tester', 'wrong', base64ToBytes(bundle.salt), bundle.iter);
    await expect(decryptBundle(bundle, keyBits)).rejects.toBeInstanceOf(DecryptError);
  });

  it('does not decrypt with a wrong name', async () => {
    const keyBits = await deriveKeyBits('other', 'schnee123', base64ToBytes(bundle.salt), bundle.iter);
    await expect(decryptBundle(bundle, keyBits)).rejects.toBeInstanceOf(DecryptError);
  });
});

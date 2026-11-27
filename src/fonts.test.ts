import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const FONTS_DIR = path.join(process.cwd(), 'public', 'fonts');

const WOFF2_400 = 'mountains-of-christmas-latin-400-normal.woff2';
const WOFF2_700 = 'mountains-of-christmas-latin-700-normal.woff2';
const LICENSE = 'LICENSE.txt';

function fontPath(name: string): string {
  return path.join(FONTS_DIR, name);
}

describe('public/fonts', () => {
  it('contains the two Mountains of Christmas woff2 files and the license text', () => {
    const entries = readdirSync(FONTS_DIR);
    expect(entries).toContain(WOFF2_400);
    expect(entries).toContain(WOFF2_700);
    expect(entries).toContain(LICENSE);
  });

  it('ships valid woff2 binaries (wOF2 magic) of plausible size', () => {
    for (const name of [WOFF2_400, WOFF2_700]) {
      const bytes = readFileSync(fontPath(name));
      expect(bytes.length).toBeGreaterThan(20000);
      expect(bytes.subarray(0, 4).toString('latin1')).toBe('wOF2');
    }
  });

  it('ships the Apache License 2.0 text that governs the font files', () => {
    const license = readFileSync(fontPath(LICENSE), 'utf8');
    expect(license).toContain('Apache License');
    expect(license).toContain('Version 2.0, January 2004');
  });
});

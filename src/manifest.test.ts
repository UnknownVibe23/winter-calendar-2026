import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const manifest = JSON.parse(
  readFileSync(path.join(root, 'public', 'manifest.webmanifest'), 'utf8'),
) as { icons: Array<{ src: string }> };

describe('manifest.webmanifest', () => {
  it('parses as JSON and lists exactly 4 icon entries', () => {
    expect(Array.isArray(manifest.icons)).toBe(true);
    expect(manifest.icons).toHaveLength(4);
  });

  it('references icon files that exist in public/icons', () => {
    for (const icon of manifest.icons) {
      const filePath = path.join(root, 'public', icon.src.replace(/^\//, ''));
      expect(existsSync(filePath)).toBe(true);
    }
  });
});

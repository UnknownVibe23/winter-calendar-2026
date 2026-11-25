import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const manifest = JSON.parse(
  readFileSync(path.join(root, 'public', 'manifest.webmanifest'), 'utf8'),
) as {
  name: string;
  short_name: string;
  description: string;
  start_url: string;
  icons: Array<{ src: string }>;
};

describe('manifest.webmanifest', () => {
  it('has English name, short_name and description', () => {
    expect(manifest.name).toBe('Winter Calendar 2026');
    expect(manifest.short_name).toBe('Winter Calendar');
    expect(manifest.description).toBe('An advent calendar with 24 doors until Christmas Eve');
  });

  it('parses as JSON and lists exactly 4 icon entries', () => {
    expect(Array.isArray(manifest.icons)).toBe(true);
    expect(manifest.icons).toHaveLength(4);
  });

  it('references icon files that exist in public/icons via subpath-relative URLs', () => {
    expect(manifest.start_url.startsWith('/')).toBe(false);
    for (const icon of manifest.icons) {
      expect(icon.src.startsWith('/')).toBe(false);
      const filePath = path.join(root, 'public', icon.src.replace(/^\//, ''));
      expect(existsSync(filePath)).toBe(true);
    }
  });
});

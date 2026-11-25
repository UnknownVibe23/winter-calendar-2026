import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const html = readFileSync(path.join(root, 'index.html'), 'utf8');

describe('index.html', () => {
  it('declares English as the document language', () => {
    expect(html).toContain('<html lang="en">');
  });

  it('has an English title and meta description', () => {
    expect(html).toContain('<title>Winter Calendar 2026</title>');
    expect(html).toMatch(
      /<meta name="description" content="Winter Calendar 2026 – advent calendar with 24 doors until Christmas Eve" \/>/,
    );
  });
});

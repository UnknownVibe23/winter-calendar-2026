import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const svg = await readFile(path.join(root, 'public', 'icon.svg'));
const outDir = path.join(root, 'public', 'icons');
await mkdir(outDir, { recursive: true });

const SIZES = [192, 512];
const SAFE_ZONE = 0.8;
const BACKGROUND = '#0b1d3a';

for (const size of SIZES) {
  await sharp(svg, { density: 300 })
    .resize(size, size)
    .png()
    .toFile(path.join(outDir, `icon-${size}.png`));

  const inner = Math.round(size * SAFE_ZONE);
  const icon = await sharp(svg, { density: 300 }).resize(inner, inner).png().toBuffer();
  const background = await sharp({
    create: { width: size, height: size, channels: 4, background: BACKGROUND },
  })
    .png()
    .toBuffer();
  await sharp(background)
    .composite([{ input: icon, gravity: 'center' }])
    .png()
    .toFile(path.join(outDir, `maskable-${size}.png`));
}

console.log(`Generated ${SIZES.length * 2} icons in public/icons/`);

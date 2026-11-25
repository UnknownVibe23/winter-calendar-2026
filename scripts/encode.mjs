import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline';
import { Writable } from 'node:stream';
import { webcrypto } from 'node:crypto';
import sharp from 'sharp';

const { subtle } = webcrypto;

const DOOR_COUNT = 24;
const DEFAULT_ITERATIONS = 600000;
const MAX_LONG_EDGE = 1600;
const JPEG_QUALITY = 82;
const MAX_TEXT_LENGTH = 4000;
const WARN_BUNDLE_BYTES = 8 * 1024 * 1024;
const PHOTO_PREFIX = 'photos/';
const PHOTO_EXTENSIONS = ['.jpg', '.jpeg', '.png'];
const PLACEHOLDER_LOGIN = 'tester';
const PLACEHOLDER_PASSWORD = 'schnee123';
const PLACEHOLDER_NAME = 'Tester';
const PLACEHOLDER_GREETING = 'Welcome';
const PLACEHOLDER_BACKGROUND = '#0b1d3a';
const PLACEHOLDER_TEXT_COLOR = '#f3e2c3';

const USAGE = `Usage: node scripts/encode.mjs [--name NAME] [--password PASSWORD] [--placeholders] [--iterations N]

Encodes the local content folder into the encrypted bundle public/content.enc.

  --name NAME          name for key derivation (prompted if omitted)
  --password PASSWORD  password for key derivation (prompted with hidden input if omitted)
  --placeholders       ignore content/ and generate 24 placeholder doors instead;
                       default login pair tester / schnee123 (overridable with
                       --name / --password)
  --iterations N       PBKDF2 iteration count; test-only override, production
                       always uses ${DEFAULT_ITERATIONS}
  -h, --help           show this help

The project root is the current working directory: content/ is read from
<cwd>/content and the bundle is written to <cwd>/public/content.enc.`;

function usage() {
  console.log(USAGE);
}

function parseArgs(argv) {
  const args = {
    name: undefined,
    password: undefined,
    placeholders: false,
    iterations: DEFAULT_ITERATIONS,
    help: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--placeholders') {
      args.placeholders = true;
    } else if (arg === '--help' || arg === '-h') {
      args.help = true;
    } else if (arg === '--name' || arg === '--password' || arg === '--iterations') {
      const value = argv[index + 1];
      if (value === undefined) {
        console.error(`Missing value for ${arg}`);
        process.exit(1);
      }
      index += 1;
      if (arg === '--name') {
        args.name = value;
      } else if (arg === '--password') {
        args.password = value;
      } else {
        args.iterations = Number(value);
      }
    } else {
      console.error(`Unknown argument: ${arg}`);
      usage();
      process.exit(1);
    }
  }
  if (!Number.isInteger(args.iterations) || args.iterations < 1) {
    console.error('--iterations must be a positive integer');
    process.exit(1);
  }
  return args;
}

function promptText(query) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

function promptHidden(query) {
  process.stdout.write(query);
  const mute = new Writable({
    write(_chunk, _encoding, callback) {
      callback();
    },
  });
  const rl = readline.createInterface({ input: process.stdin, output: mute, terminal: true });
  return new Promise((resolve) => {
    rl.question('', (answer) => {
      rl.close();
      process.stdout.write('\n');
      resolve(answer);
    });
  });
}

function checkContentIgnored(root) {
  const result = spawnSync('git', ['check-ignore', 'content/content.json'], {
    cwd: root,
    encoding: 'utf8',
  });
  return result.status === 0;
}

function validate(parsed, contentDir) {
  const problems = [];
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return ['root must be a JSON object'];
  }
  if (parsed.v !== 1) {
    problems.push(`v must be 1 (got ${JSON.stringify(parsed.v)})`);
  }
  if (typeof parsed.name !== 'string' || parsed.name.trim() === '') {
    problems.push('name must be a non-empty string');
  }
  if (typeof parsed.greeting !== 'string' || parsed.greeting.trim() === '') {
    problems.push('greeting must be a non-empty string');
  }
  if (!Array.isArray(parsed.doors)) {
    problems.push('doors must be an array');
    return problems;
  }
  if (parsed.doors.length !== DOOR_COUNT) {
    problems.push(`doors must contain exactly ${DOOR_COUNT} entries (got ${parsed.doors.length})`);
  }
  const contentRoot = path.resolve(contentDir);
  const counts = new Map();
  parsed.doors.forEach((door, index) => {
    if (door === null || typeof door !== 'object' || Array.isArray(door)) {
      problems.push(`doors[${index}] must be an object`);
      return;
    }
    const n = door.n;
    if (typeof n !== 'number' || !Number.isInteger(n) || n < 1 || n > DOOR_COUNT) {
      problems.push(
        `doors[${index}]: n must be an integer between 1 and ${DOOR_COUNT} (got ${JSON.stringify(n)})`,
      );
      return;
    }
    counts.set(n, (counts.get(n) ?? 0) + 1);
    if (typeof door.text !== 'string' || door.text.length === 0) {
      problems.push(`door ${n}: text must be a non-empty string`);
    } else if (door.text.length > MAX_TEXT_LENGTH) {
      problems.push(`door ${n}: text must be at most ${MAX_TEXT_LENGTH} characters (got ${door.text.length})`);
    }
    if (door.photo !== undefined) {
      if (typeof door.photo !== 'string' || !door.photo.startsWith(PHOTO_PREFIX)) {
        problems.push(`door ${n}: photo must be a string starting with "${PHOTO_PREFIX}"`);
      } else if (!PHOTO_EXTENSIONS.includes(path.extname(door.photo).toLowerCase())) {
        problems.push(`door ${n}: photo must end in .jpg, .jpeg or .png (got "${door.photo}")`);
      } else {
        const resolved = path.resolve(contentDir, door.photo);
        if (!resolved.startsWith(contentRoot + path.sep)) {
          problems.push(`door ${n}: photo must stay inside content/${PHOTO_PREFIX}`);
        } else if (!existsSync(resolved)) {
          problems.push(`door ${n}: photo file not found: content/${door.photo}`);
        }
      }
    }
  });
  for (let n = 1; n <= DOOR_COUNT; n += 1) {
    const count = counts.get(n) ?? 0;
    if (count === 0) {
      problems.push(`door ${n}: missing (doors must cover 1..${DOOR_COUNT} exactly once)`);
    } else if (count > 1) {
      problems.push(`door ${n}: duplicate (appears ${count} times)`);
    }
  }
  return problems;
}

async function encodePhoto(input, name) {
  const { data, info } = await sharp(input)
    .resize({ width: MAX_LONG_EDGE, height: MAX_LONG_EDGE, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: JPEG_QUALITY })
    .toBuffer({ resolveWithObject: true });
  return { name, w: info.width, h: info.height, data: data.toString('base64') };
}

async function buildRealContent(contentDir) {
  let parsed;
  try {
    parsed = JSON.parse(await readFile(path.join(contentDir, 'content.json'), 'utf8'));
  } catch (error) {
    console.error(`Could not read content/content.json: ${error.message}`);
    process.exit(1);
  }
  const problems = validate(parsed, contentDir);
  if (problems.length > 0) {
    console.error('Invalid content/content.json:');
    for (const problem of problems) {
      console.error(`- ${problem}`);
    }
    process.exit(1);
  }
  const byNumber = new Map(parsed.doors.map((door) => [door.n, door]));
  const doors = [];
  for (let n = 1; n <= DOOR_COUNT; n += 1) {
    const door = byNumber.get(n);
    const entry = { n, text: door.text };
    if (door.photo !== undefined) {
      entry.photo = await encodePhoto(
        await readFile(path.join(contentDir, door.photo)),
        path.basename(door.photo),
      );
    }
    doors.push(entry);
  }
  return { v: 1, name: parsed.name, greeting: parsed.greeting, doors };
}

const SEGMENT_MAP = {
  0: 'abcdef',
  1: 'bc',
  2: 'abged',
  3: 'abgcd',
  4: 'fgbc',
  5: 'afgcd',
  6: 'afgedc',
  7: 'abc',
  8: 'abcdefg',
  9: 'abcdfg',
};

function digitRects(digit, x0, y0, w, h, t) {
  const segments = {
    a: [x0, y0, w, t],
    b: [x0 + w - t, y0, t, h / 2],
    c: [x0 + w - t, y0 + h / 2, t, h / 2],
    d: [x0, y0 + h - t, w, t],
    e: [x0, y0 + h / 2, t, h / 2],
    f: [x0, y0, t, h / 2],
    g: [x0, y0 + h / 2 - t / 2, w, t],
  };
  return SEGMENT_MAP[digit]
    .split('')
    .map((segment) => {
      const [x, y, rectWidth, rectHeight] = segments[segment];
      return `<rect x="${Math.round(x)}" y="${Math.round(y)}" width="${Math.round(rectWidth)}" height="${Math.round(rectHeight)}"/>`;
    })
    .join('');
}

function placeholderSvg(n, width, height) {
  const digits = String(n).split('');
  const digitWidth = Math.round(Math.min(width, height) * 0.28);
  const digitHeight = Math.round(digitWidth * 1.8);
  const thickness = Math.max(2, Math.round(digitWidth * 0.18));
  const gap = Math.round(digitWidth * 0.5);
  const totalWidth = digits.length * digitWidth + (digits.length - 1) * gap;
  const startX = (width - totalWidth) / 2;
  const startY = (height - digitHeight) / 2;
  let rects = '';
  digits.forEach((digit, index) => {
    rects += digitRects(Number(digit), startX + index * (digitWidth + gap), startY, digitWidth, digitHeight, thickness);
  });
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">` +
    `<rect width="${width}" height="${height}" fill="${PLACEHOLDER_BACKGROUND}"/>` +
    `<g fill="${PLACEHOLDER_TEXT_COLOR}">${rects}</g></svg>`
  );
}

async function buildPlaceholderContent() {
  const doors = [];
  for (let n = 1; n <= DOOR_COUNT; n += 1) {
    const portrait = n <= 12;
    const width = portrait ? 1200 : 1600;
    const height = portrait ? 1600 : 1200;
    const photo = await encodePhoto(
      Buffer.from(placeholderSvg(n, width, height)),
      `${String(n).padStart(2, '0')}.jpg`,
    );
    doors.push({ n, text: `Placeholder number ${n}`, photo });
  }
  return { v: 1, name: PLACEHOLDER_NAME, greeting: PLACEHOLDER_GREETING, doors };
}

async function encryptAndWrite(content, name, password, iterations, outPath) {
  const material = new TextEncoder().encode(`${name.trim().toLowerCase()}\n${password}`);
  const salt = webcrypto.getRandomValues(new Uint8Array(16));
  const iv = webcrypto.getRandomValues(new Uint8Array(12));
  const baseKey = await subtle.importKey('raw', material, 'PBKDF2', false, ['deriveBits']);
  const keyBits = await subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    baseKey,
    256,
  );
  const key = await subtle.importKey('raw', keyBits, { name: 'AES-GCM' }, false, ['encrypt']);
  const ciphertext = await subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(JSON.stringify(content)),
  );
  const bundle = {
    v: 1,
    alg: 'PBKDF2-SHA256-AES-GCM',
    iter: iterations,
    salt: Buffer.from(salt).toString('base64'),
    iv: Buffer.from(iv).toString('base64'),
    ct: Buffer.from(ciphertext).toString('base64'),
  };
  const json = `${JSON.stringify(bundle, null, 2)}\n`;
  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, json);
  return { bytes: Buffer.byteLength(json) };
}

function report(content, bytes, outPath, root) {
  const photos = content.doors.filter((door) => door.photo !== undefined);
  const sizeMb = bytes / (1024 * 1024);
  if (bytes > WARN_BUNDLE_BYTES) {
    console.warn(`Warning: bundle exceeds 8 MB (${sizeMb.toFixed(2)} MB); consider smaller photos.`);
  }
  console.log(`Doors encoded: ${content.doors.length} (photos embedded: ${photos.length})`);
  if (photos.length > 0) {
    const totalChars = photos.reduce((sum, door) => sum + door.photo.data.length, 0);
    console.log(`Average photo payload: ${(totalChars / photos.length / 1024).toFixed(1)} KB base64 per photo`);
  }
  console.log(`Bundle written to ${path.relative(root, outPath)} (${sizeMb.toFixed(2)} MB)`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    usage();
    return;
  }
  const root = process.cwd();
  const contentDir = path.join(root, 'content');
  const outPath = path.join(root, 'public', 'content.enc');

  if (!checkContentIgnored(root)) {
    if (args.placeholders) {
      console.warn(
        'Warning: content/ is not git-ignored. Placeholder mode reads no content, continuing anyway.',
      );
    } else {
      console.error('Refusing to encode: content/ is not git-ignored. Fix .gitignore first.');
      process.exit(1);
    }
  }

  let name;
  let password;
  let content;
  if (args.placeholders) {
    name = args.name ?? PLACEHOLDER_LOGIN;
    password = args.password ?? PLACEHOLDER_PASSWORD;
    content = await buildPlaceholderContent();
  } else {
    name = args.name ?? (await promptText('Name: '));
    password = args.password ?? (await promptHidden('Password: '));
    if (name.trim() === '' || password === '') {
      console.error('Name and password must not be empty.');
      process.exit(1);
    }
    content = await buildRealContent(contentDir);
  }

  const { bytes } = await encryptAndWrite(content, name, password, args.iterations, outPath);
  report(content, bytes, outPath, root);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

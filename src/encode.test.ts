import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { afterAll, describe, expect, it } from 'vitest';
import { base64ToBytes } from './base64';
import type { Bundle, Content, DoorPhoto } from './content';
import { DecryptError, decryptBundle, deriveKeyBits } from './crypto';

const root = process.cwd();
const encodeScript = path.join(root, 'scripts', 'encode.mjs');
const TEST_TIMEOUT = 30000;

const tempDirs: string[] = [];

afterAll(async () => {
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
});

interface FixtureDoor {
  n: number;
  text: string;
  photo?: string;
}

async function makeProject(gitignore: string): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), 'wc-03-'));
  tempDirs.push(dir);
  await writeFile(path.join(dir, '.gitignore'), gitignore);
  const init = spawnSync('git', ['init'], { cwd: dir, encoding: 'utf8' });
  if (init.status !== 0) {
    throw new Error(`git init failed in ${dir}: ${init.stderr}`);
  }
  return dir;
}

function textDoors(): FixtureDoor[] {
  return Array.from({ length: 24 }, (_, index) => ({ n: index + 1, text: `Test door ${index + 1}` }));
}

function validDoors(): FixtureDoor[] {
  const doors = textDoors();
  doors[0].photo = 'photos/01.jpg';
  doors[1].photo = 'photos/02.png';
  return doors;
}

async function writeContentJson(dir: string, doc: unknown): Promise<void> {
  await mkdir(path.join(dir, 'content'), { recursive: true });
  await writeFile(path.join(dir, 'content', 'content.json'), JSON.stringify(doc));
}

async function writeValidFixture(dir: string): Promise<void> {
  await mkdir(path.join(dir, 'content', 'photos'), { recursive: true });
  await sharp({
    create: { width: 3200, height: 2400, channels: 3, background: { r: 10, g: 30, b: 60 } },
  })
    .jpeg()
    .toFile(path.join(dir, 'content', 'photos', '01.jpg'));
  await sharp({
    create: { width: 80, height: 60, channels: 3, background: { r: 200, g: 100, b: 50 } },
  })
    .png()
    .toFile(path.join(dir, 'content', 'photos', '02.png'));
  await writeContentJson(dir, {
    v: 1,
    name: 'Tester',
    greeting: 'Willkommen',
    doors: validDoors(),
  });
}

function runEncode(dir: string, args: string[]) {
  return spawnSync(process.execPath, [encodeScript, ...args], { cwd: dir, encoding: 'utf8' });
}

function outputOf(result: ReturnType<typeof runEncode>): string {
  return `${result.stdout ?? ''}${result.stderr ?? ''}`;
}

function encodeArgs(): string[] {
  return ['--name', 'tester', '--password', 'schnee123', '--iterations', '10000'];
}

async function readBundle(dir: string): Promise<Bundle> {
  return JSON.parse(await readFile(path.join(dir, 'public', 'content.enc'), 'utf8')) as Bundle;
}

async function decryptWith(bundle: Bundle, name: string, password: string): Promise<Content> {
  const keyBits = await deriveKeyBits(name, password, base64ToBytes(bundle.salt), bundle.iter);
  return decryptBundle(bundle, keyBits);
}

function expectJpeg(photo: DoorPhoto): void {
  const bytes = base64ToBytes(photo.data);
  expect(bytes[0]).toBe(0xff);
  expect(bytes[1]).toBe(0xd8);
  expect(photo.w).toBeGreaterThan(0);
  expect(photo.h).toBeGreaterThan(0);
}

function photoOf(content: Content, n: number): DoorPhoto {
  const door = content.doors.find((entry) => entry.n === n);
  if (!door?.photo) {
    throw new Error(`door ${n} should have a photo`);
  }
  return door.photo;
}

describe('scripts/encode.mjs', () => {
  it(
    'encodes a real content folder into a bundle the app crypto decrypts',
    async () => {
      const dir = await makeProject('node_modules\ndist\ncontent/\n');
      await writeValidFixture(dir);
      const result = runEncode(dir, encodeArgs());
      expect(result.status, outputOf(result)).toBe(0);

      const bundle = await readBundle(dir);
      expect(bundle.v).toBe(1);
      expect(bundle.alg).toBe('PBKDF2-SHA256-AES-GCM');
      expect(bundle.iter).toBe(10000);
      expect(base64ToBytes(bundle.salt)).toHaveLength(16);
      expect(base64ToBytes(bundle.iv)).toHaveLength(12);

      const content = await decryptWith(bundle, 'tester', 'schnee123');
      expect(content.v).toBe(1);
      expect(content.name).toBe('Tester');
      expect(content.greeting).toBe('Willkommen');
      expect(content.doors.map((door) => door.n)).toEqual(
        Array.from({ length: 24 }, (_, index) => index + 1),
      );
      for (const door of content.doors) {
        if (door.n === 1 || door.n === 2) {
          expectJpeg(photoOf(content, door.n));
        } else {
          expect(door.photo).toBeUndefined();
        }
      }
      const door1 = photoOf(content, 1);
      expect(door1.name).toBe('01.jpg');
      expect(door1.w).toBe(1600);
      expect(door1.h).toBe(1200);
      const door2 = photoOf(content, 2);
      expect(door2.name).toBe('02.png');
      expect(door2.w).toBe(80);
      expect(door2.h).toBe(60);

      const wrongBits = await deriveKeyBits('tester', 'wrong', base64ToBytes(bundle.salt), bundle.iter);
      await expect(decryptBundle(bundle, wrongBits)).rejects.toBeInstanceOf(DecryptError);
    },
    TEST_TIMEOUT,
  );

  async function expectValidationFailure(doc: unknown, pattern: RegExp): Promise<void> {
    const dir = await makeProject('content/\n');
    await writeContentJson(dir, doc);
    const result = runEncode(dir, encodeArgs());
    expect(result.status, outputOf(result)).toBe(1);
    expect(outputOf(result)).toMatch(pattern);
    expect(existsSync(path.join(dir, 'public', 'content.enc'))).toBe(false);
  }

  it(
    'rejects a missing door and names it',
    async () => {
      await expectValidationFailure(
        { v: 1, name: 'T', greeting: 'G', doors: textDoors().slice(0, 23) },
        /door 24: missing/,
      );
    },
    TEST_TIMEOUT,
  );

  it(
    'rejects a duplicate door number and names it',
    async () => {
      const doors = textDoors();
      doors[23] = { n: 5, text: 'duplicate' };
      await expectValidationFailure({ v: 1, name: 'T', greeting: 'G', doors }, /door 5: duplicate/);
    },
    TEST_TIMEOUT,
  );

  it(
    'rejects a photo file that does not exist and names the door',
    async () => {
      const doors = textDoors();
      doors[2] = { n: 3, text: 'T3', photo: 'photos/03.jpg' };
      await expectValidationFailure(
        { v: 1, name: 'T', greeting: 'G', doors },
        /door 3: photo file not found/,
      );
    },
    TEST_TIMEOUT,
  );

  it(
    'rejects an empty door text and names the door',
    async () => {
      const doors = textDoors();
      doors[6] = { n: 7, text: '' };
      await expectValidationFailure(
        { v: 1, name: 'T', greeting: 'G', doors },
        /door 7: text must be a non-empty string/,
      );
    },
    TEST_TIMEOUT,
  );

  it(
    'refuses to encode when content/ is not git-ignored and writes no bundle',
    async () => {
      const dir = await makeProject('node_modules\ndist\n');
      await writeValidFixture(dir);
      const result = runEncode(dir, encodeArgs());
      expect(result.status, outputOf(result)).toBe(1);
      expect(outputOf(result)).toContain(
        'Refusing to encode: content/ is not git-ignored. Fix .gitignore first.',
      );
      expect(existsSync(path.join(dir, 'public', 'content.enc'))).toBe(false);
    },
    TEST_TIMEOUT,
  );

  it(
    'placeholder mode produces a dev-shaped bundle that decrypts with tester/schnee123',
    async () => {
      const dir = await makeProject('content/\n');
      const result = runEncode(dir, ['--placeholders', '--iterations', '10000']);
      expect(result.status, outputOf(result)).toBe(0);

      const bundle = await readBundle(dir);
      expect(bundle.v).toBe(1);
      expect(bundle.alg).toBe('PBKDF2-SHA256-AES-GCM');
      const content = await decryptWith(bundle, 'tester', 'schnee123');
      expect(content.name).toBe('Tester');
      expect(content.greeting).toBe('Willkommen');
      expect(content.doors).toHaveLength(24);
      expect(content.doors.map((door) => door.n)).toEqual(
        Array.from({ length: 24 }, (_, index) => index + 1),
      );
      for (const door of content.doors) {
        const photo = photoOf(content, door.n);
        expectJpeg(photo);
        expect(photo.name).toBe(`${String(door.n).padStart(2, '0')}.jpg`);
      }
      expect(content.doors[0].text).toBe('Platzhalter Nummer 1');
      expect(content.doors[23].text).toBe('Platzhalter Nummer 24');
      expect(photoOf(content, 1).w).toBe(1200);
      expect(photoOf(content, 1).h).toBe(1600);
      expect(photoOf(content, 13).w).toBe(1600);
      expect(photoOf(content, 13).h).toBe(1200);
    },
    TEST_TIMEOUT,
  );

  it(
    'placeholder mode only warns when content/ is not git-ignored',
    async () => {
      const dir = await makeProject('node_modules\n');
      const result = runEncode(dir, ['--placeholders', '--iterations', '10000']);
      expect(result.status, outputOf(result)).toBe(0);
      expect(outputOf(result)).toMatch(/not git-ignored/);
      expect(existsSync(path.join(dir, 'public', 'content.enc'))).toBe(true);
    },
    TEST_TIMEOUT,
  );
});

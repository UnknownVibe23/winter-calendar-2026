import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { webcrypto } from 'node:crypto';

const { subtle } = webcrypto;

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const NAME = 'tester';
const PASSWORD = 'schnee123';
const ITERATIONS = 600000;

const content = {
  v: 1,
  name: 'Tester',
  greeting: 'Willkommen',
  doors: Array.from({ length: 24 }, (_, index) => {
    const n = index + 1;
    return { n, text: 'Platzhalter Nummer ' + n };
  }),
};

const material = new TextEncoder().encode(NAME.trim().toLowerCase() + '\n' + PASSWORD);
const salt = webcrypto.getRandomValues(new Uint8Array(16));
const iv = webcrypto.getRandomValues(new Uint8Array(12));

const baseKey = await subtle.importKey('raw', material, 'PBKDF2', false, ['deriveBits']);
const keyBits = await subtle.deriveBits(
  { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITERATIONS },
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
  iter: ITERATIONS,
  salt: Buffer.from(salt).toString('base64'),
  iv: Buffer.from(iv).toString('base64'),
  ct: Buffer.from(ciphertext).toString('base64'),
};

await writeFile(path.join(root, 'public', 'content.enc'), JSON.stringify(bundle, null, 2) + '\n');
console.log('Wrote public/content.enc (placeholder content, fresh random salt and iv)');

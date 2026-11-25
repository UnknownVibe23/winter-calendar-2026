import { bytesToBase64 } from './base64';
import type { Bundle, Content } from './content';
import { deriveKeyBits } from './crypto';

export async function encryptForTest(
  content: Content,
  name: string,
  password: string,
  iterations = 1000,
): Promise<{ bundle: Bundle; keyBits: Uint8Array }> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const keyBits = await deriveKeyBits(name, password, salt, iterations);
  const key = await crypto.subtle.importKey('raw', keyBits as BufferSource, { name: 'AES-GCM' }, false, [
    'encrypt',
  ]);
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    new TextEncoder().encode(JSON.stringify(content)),
  );
  const bundle: Bundle = {
    v: 1,
    alg: 'PBKDF2-SHA256-AES-GCM',
    iter: iterations,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    ct: bytesToBase64(new Uint8Array(ciphertext)),
  };
  return { bundle, keyBits };
}

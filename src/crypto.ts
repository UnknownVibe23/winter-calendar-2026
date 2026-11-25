import { base64ToBytes } from './base64';
import type { Bundle, Content } from './content';

export class DecryptError extends Error {
  constructor(message = 'Decryption failed') {
    super(message);
    this.name = 'DecryptError';
  }
}

export const DEFAULT_ITERATIONS = 600000;

export function keyMaterial(name: string, password: string): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(`${name.trim().toLowerCase()}\n${password}`);
}

export async function deriveKeyBits(
  name: string,
  password: string,
  saltBytes: Uint8Array,
  iterations: number = DEFAULT_ITERATIONS,
): Promise<Uint8Array> {
  const baseKey = await crypto.subtle.importKey('raw', keyMaterial(name, password), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: saltBytes as BufferSource,
      iterations,
    },
    baseKey,
    256,
  );
  return new Uint8Array(bits);
}

export async function decryptBundle(bundle: Bundle, keyBits: Uint8Array): Promise<Content> {
  try {
    const key = await crypto.subtle.importKey('raw', keyBits as BufferSource, { name: 'AES-GCM' }, false, [
      'decrypt',
    ]);
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: base64ToBytes(bundle.iv) as BufferSource },
      key,
      base64ToBytes(bundle.ct) as BufferSource,
    );
    return JSON.parse(new TextDecoder().decode(plaintext)) as Content;
  } catch {
    throw new DecryptError();
  }
}

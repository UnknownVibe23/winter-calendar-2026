import { base64ToBytes, bytesToBase64 } from './base64';

const KEY_STORAGE_KEY = 'wc.key';
const NAME_STORAGE_KEY = 'wc.name';

export function saveSession(keyBits: Uint8Array, name: string): void {
  localStorage.setItem(KEY_STORAGE_KEY, bytesToBase64(keyBits));
  localStorage.setItem(NAME_STORAGE_KEY, name);
}

export function loadSession(): { keyBits: Uint8Array; name: string } | null {
  const encodedKey = localStorage.getItem(KEY_STORAGE_KEY);
  const name = localStorage.getItem(NAME_STORAGE_KEY);
  if (encodedKey === null || name === null) {
    return null;
  }
  try {
    return { keyBits: base64ToBytes(encodedKey), name };
  } catch {
    return null;
  }
}

export function clearSession(): void {
  localStorage.removeItem(KEY_STORAGE_KEY);
  localStorage.removeItem(NAME_STORAGE_KEY);
}

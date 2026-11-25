import { base64ToBytes } from './base64';
import type { Bundle, Content } from './content';
import { decryptBundle, deriveKeyBits } from './crypto';
import { isLocked, loadLockState, registerFailure, resetLockout, saveLockState } from './lockout';

export interface LoginSuccess {
  keyBits: Uint8Array;
  name: string;
  content: Content;
}

export type OnLoginSuccess = (success: LoginSuccess) => void;

export async function loadBundle(): Promise<Bundle> {
  const response = await fetch(`${import.meta.env.BASE_URL}content.enc`);
  if (!response.ok) {
    throw new Error(`Could not load the content bundle (HTTP ${response.status})`);
  }
  return (await response.json()) as Bundle;
}

const COUNTDOWN_INTERVAL_MS = 500;
const SUBMIT_LABEL = 'Aufmachen';
const ERROR_TEXT = 'Das hat leider nicht gepasst.';

function formatCountdown(msRemaining: number): string {
  const totalSeconds = Math.max(0, Math.ceil(msRemaining / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function renderLogin(container: HTMLElement, onSuccess: OnLoginSuccess): void {
  container.replaceChildren();

  const screen = document.createElement('div');
  screen.className = 'login-screen';

  const form = document.createElement('form');
  form.className = 'login-card';

  const heading = document.createElement('h1');
  heading.textContent = 'Adventskalender';

  const nameLabel = document.createElement('label');
  nameLabel.className = 'login-field';
  const nameCaption = document.createElement('span');
  nameCaption.textContent = 'Dein Name';
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.name = 'name';
  nameInput.autocomplete = 'username';
  nameLabel.append(nameCaption, nameInput);

  const passwordLabel = document.createElement('label');
  passwordLabel.className = 'login-field';
  const passwordCaption = document.createElement('span');
  passwordCaption.textContent = 'Passwort';
  const passwordInput = document.createElement('input');
  passwordInput.type = 'password';
  passwordInput.name = 'password';
  passwordInput.autocomplete = 'current-password';
  passwordLabel.append(passwordCaption, passwordInput);

  const button = document.createElement('button');
  button.type = 'submit';
  button.className = 'login-submit';
  button.textContent = SUBMIT_LABEL;
  button.disabled = true;

  const error = document.createElement('p');
  error.className = 'login-error';
  error.setAttribute('role', 'alert');
  error.textContent = ERROR_TEXT;
  error.hidden = true;

  form.append(heading, nameLabel, passwordLabel, button, error);
  screen.append(form);
  container.append(screen);

  let busy = false;
  let countdownTimer: number | undefined;

  function stopCountdown(): void {
    if (countdownTimer !== undefined) {
      window.clearInterval(countdownTimer);
      countdownTimer = undefined;
    }
  }

  function fieldsFilled(): boolean {
    return nameInput.value.trim() !== '' && passwordInput.value !== '';
  }

  function updateButton(): void {
    const state = loadLockState();
    const now = Date.now();
    if (isLocked(state, now)) {
      button.disabled = true;
      button.textContent = formatCountdown(state.until - now);
      if (countdownTimer === undefined) {
        countdownTimer = window.setInterval(() => {
          const current = loadLockState();
          const remaining = current.until - Date.now();
          if (isLocked(current, Date.now())) {
            button.textContent = formatCountdown(remaining);
          } else {
            stopCountdown();
            updateButton();
          }
        }, COUNTDOWN_INTERVAL_MS);
      }
    } else {
      stopCountdown();
      button.disabled = busy || !fieldsFilled();
      button.textContent = SUBMIT_LABEL;
    }
  }

  async function attempt(): Promise<void> {
    if (busy || isLocked(loadLockState(), Date.now())) {
      return;
    }
    const name = nameInput.value;
    const password = passwordInput.value;
    busy = true;
    updateButton();
    try {
      const bundle = await loadBundle();
      const keyBits = await deriveKeyBits(name, password, base64ToBytes(bundle.salt), bundle.iter);
      const content = await decryptBundle(bundle, keyBits);
      resetLockout();
      onSuccess({ keyBits, name, content });
    } catch {
      saveLockState(registerFailure(loadLockState(), Date.now()));
      error.hidden = false;
    } finally {
      busy = false;
      updateButton();
    }
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    void attempt();
  });

  for (const input of [nameInput, passwordInput]) {
    input.addEventListener('input', () => {
      error.hidden = true;
      updateButton();
    });
  }

  updateButton();
}

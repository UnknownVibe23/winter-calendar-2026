import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Bundle, Content } from './content';
import { loadLockState } from './lockout';
import { renderLogin, type LoginSuccess } from './login';
import { encryptForTest } from './test-utils';

const content: Content = {
  v: 1,
  name: 'Tester',
  greeting: 'Willkommen',
  doors: Array.from({ length: 24 }, (_, index) => ({
    n: index + 1,
    text: `Platzhalter Nummer ${index + 1}`,
  })),
};

function stubBundle(bundle: Bundle): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn(
    async () => new Response(JSON.stringify(bundle), { status: 200 }),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function fillForm(container: HTMLElement, name: string, password: string): void {
  const nameInput = container.querySelector<HTMLInputElement>('input[name="name"]')!;
  const passwordInput = container.querySelector<HTMLInputElement>('input[name="password"]')!;
  nameInput.value = name;
  nameInput.dispatchEvent(new Event('input', { bubbles: true }));
  passwordInput.value = password;
  passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
}

function submitForm(container: HTMLElement): void {
  const form = container.querySelector('form')!;
  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
}

describe('renderLogin', () => {
  let container: HTMLElement;

  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    container = document.createElement('div');
    document.body.append(container);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    container.remove();
  });

  it('renders the heading, the labeled inputs and a disabled submit button', () => {
    stubBundle({} as Bundle);
    renderLogin(container, () => {});
    expect(container.querySelector('h1')?.textContent).toBe('Adventskalender');
    const labels = Array.from(container.querySelectorAll('label')).map((label) =>
      label.textContent?.trim(),
    );
    expect(labels[0]).toContain('Dein Name');
    expect(labels[1]).toContain('Passwort');
    expect(container.querySelector('input[name="name"]')).not.toBeNull();
    expect(container.querySelector<HTMLInputElement>('input[name="password"]')?.type).toBe(
      'password',
    );
    const button = container.querySelector<HTMLButtonElement>('button[type="submit"]');
    expect(button?.textContent).toBe('Aufmachen');
    expect(button?.disabled).toBe(true);
    expect(container.querySelector('.login-error')?.hasAttribute('hidden')).toBe(true);
  });

  it('enables the button only while both fields are non-empty', () => {
    stubBundle({} as Bundle);
    renderLogin(container, () => {});
    const button = container.querySelector<HTMLButtonElement>('button[type="submit"]')!;
    const nameInput = container.querySelector<HTMLInputElement>('input[name="name"]')!;
    const passwordInput = container.querySelector<HTMLInputElement>('input[name="password"]')!;

    nameInput.value = 'tester';
    nameInput.dispatchEvent(new Event('input', { bubbles: true }));
    expect(button.disabled).toBe(true);

    passwordInput.value = 'schnee123';
    passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
    expect(button.disabled).toBe(false);

    passwordInput.value = '';
    passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
    expect(button.disabled).toBe(true);
  });

  it('shows the generic error and registers a failure after a wrong pair', async () => {
    const { bundle } = await encryptForTest(content, 'tester', 'schnee123', 1000);
    stubBundle(bundle);
    const onSuccess = vi.fn();
    renderLogin(container, onSuccess);

    fillForm(container, 'tester', 'wrong-password');
    submitForm(container);

    await vi.waitFor(() => {
      const error = container.querySelector<HTMLParagraphElement>('.login-error');
      expect(error?.hidden).toBe(false);
      expect(error?.textContent).toBe('Das hat leider nicht gepasst.');
    });
    expect(onSuccess).not.toHaveBeenCalled();
    expect(loadLockState().attempts).toBe(1);
    expect(loadLockState().until).toBeGreaterThan(Date.now());
  });

  it('disables the button with a countdown while locked out', async () => {
    const { bundle } = await encryptForTest(content, 'tester', 'schnee123', 1000);
    stubBundle(bundle);
    renderLogin(container, () => {});

    fillForm(container, 'tester', 'wrong-password');
    submitForm(container);

    await vi.waitFor(() => {
      const button = container.querySelector<HTMLButtonElement>('button[type="submit"]');
      expect(button?.disabled).toBe(true);
      expect(button?.textContent).toMatch(/^00:0[12]$/);
    });
  });

  it('calls onSuccess with key bits, name and content after a correct pair', async () => {
    const { bundle } = await encryptForTest(content, 'tester', 'schnee123', 1000);
    const fetchMock = stubBundle(bundle);
    const onSuccess = vi.fn();
    renderLogin(container, onSuccess);

    fillForm(container, 'Tester', 'schnee123');
    submitForm(container);

    await vi.waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    const result = onSuccess.mock.calls[0][0] as LoginSuccess;
    expect(result.name).toBe('Tester');
    expect(result.keyBits).toHaveLength(32);
    expect(result.content).toEqual(content);
    expect(fetchMock).toHaveBeenCalledWith('/content.enc');
    expect(loadLockState()).toEqual({ attempts: 0, until: 0 });
  });
});

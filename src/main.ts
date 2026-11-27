import './styles/base.css';
import './styles/calendar.css';
import './styles/scene.css';
import './lightbox.css';
import './login.css';
import { renderApp } from './app';
import { decryptBundle } from './crypto';
import { resolveNow } from './doors';
import { loadBundle, renderLogin } from './login';
import { loadSession, saveSession } from './session';
import { snowDayForDate } from './snow';
import { attachSnowfall } from './snow-canvas';
import { renderStarLayer } from './stars';

const appElement = document.querySelector<HTMLDivElement>('#app');

if (!appElement) {
  throw new Error('Missing #app element');
}

const app: HTMLElement = appElement;

async function boot(): Promise<void> {
  const now = resolveNow();
  attachSnowfall(document.body, snowDayForDate(now));
  renderStarLayer(document.body);
  const session = loadSession();
  if (session) {
    try {
      const bundle = await loadBundle();
      const content = await decryptBundle(bundle, session.keyBits);
      renderApp(app, content, now);
      return;
    } catch {
      // Stored session does not decrypt the current bundle: show the login.
    }
  }
  renderLogin(app, ({ keyBits, name, content }) => {
    saveSession(keyBits, name);
    app.replaceChildren();
    renderApp(app, content, now);
  });
}

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  void navigator.serviceWorker
    .register(`${import.meta.env.BASE_URL}sw.js`)
    .catch((error: unknown) => {
      console.warn('Service worker registration failed', error);
    });
}

void boot();

import './styles/base.css';
import './styles/calendar.css';
import './login.css';
import { renderApp } from './app';
import { decryptBundle } from './crypto';
import { loadBundle, renderLogin } from './login';
import { loadSession, saveSession } from './session';

const appElement = document.querySelector<HTMLDivElement>('#app');

if (!appElement) {
  throw new Error('Missing #app element');
}

const app: HTMLElement = appElement;

async function boot(): Promise<void> {
  const session = loadSession();
  if (session) {
    try {
      const bundle = await loadBundle();
      const content = await decryptBundle(bundle, session.keyBits);
      renderApp(app, content);
      return;
    } catch {
      // Stored session does not decrypt the current bundle: show the login.
    }
  }
  renderLogin(app, ({ keyBits, name, content }) => {
    saveSession(keyBits, name);
    app.replaceChildren();
    renderApp(app, content);
  });
}

void boot();

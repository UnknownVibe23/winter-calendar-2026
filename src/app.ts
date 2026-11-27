import { applyDoorState, renderCalendar } from './calendar';
import type { Content } from './content';
import { loadOpened, saveOpened } from './doors';
import { openLightbox, type LightboxHandle } from './lightbox';
import { renderRestoreOptions } from './restore';

export function renderApp(container: HTMLElement, content: Content, now: Date): void {
  const opened = loadOpened();

  renderCalendar(container, {
    opened,
    now,
    doors: content.doors,
    onDoorActivate(doorNumber): LightboxHandle | undefined {
      const door = content.doors.find((entry) => entry.n === doorNumber);
      if (!door) {
        return undefined;
      }
      if (!opened.has(doorNumber)) {
        opened.add(doorNumber);
        saveOpened(opened);
      }
      const doorElement = container.querySelector<HTMLButtonElement>(
        `button.door[data-door="${doorNumber}"]`,
      );
      if (doorElement) {
        applyDoorState(doorElement, doorNumber, opened, now);
      }
      return openLightbox(container, door);
    },
  });

  renderRestoreOptions(container, {
    now,
    onRestored() {
      container.replaceChildren();
      renderApp(container, content, now);
    },
  });
}

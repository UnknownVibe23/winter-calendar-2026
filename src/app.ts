import { applyDoorState, renderCalendar } from './calendar';
import type { Content } from './content';
import { loadOpened, saveOpened } from './doors';
import { openLightbox } from './lightbox';

export function renderApp(container: HTMLElement, content: Content, now: Date): void {
  const opened = loadOpened();

  renderCalendar(container, {
    opened,
    now,
    onDoorActivate(doorNumber) {
      const door = content.doors.find((entry) => entry.n === doorNumber);
      if (!door) {
        return;
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
      openLightbox(container, door);
    },
  });

  const welcome = document.createElement('p');
  welcome.className = 'welcome';
  welcome.textContent = `${content.greeting}, ${content.name}!`;
  const grid = container.querySelector('.calendar-grid');
  if (grid) {
    container.insertBefore(welcome, grid);
  } else {
    container.append(welcome);
  }
}

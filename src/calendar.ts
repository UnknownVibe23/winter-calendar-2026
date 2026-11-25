export const DOOR_COUNT = 24;

export function renderCalendar(container: HTMLElement): void {
  const header = document.createElement('header');
  header.className = 'calendar-header';

  const title = document.createElement('h1');
  title.textContent = 'Dezember 2026';

  const subtitle = document.createElement('p');
  subtitle.className = 'calendar-subtitle';
  subtitle.textContent = '24 Türchen bis Heiligabend';

  header.append(title, subtitle);

  const grid = document.createElement('div');
  grid.className = 'calendar-grid';

  for (let doorNumber = 1; doorNumber <= DOOR_COUNT; doorNumber += 1) {
    const door = document.createElement('button');
    door.type = 'button';
    door.className = 'door';
    door.dataset.door = String(doorNumber);
    door.setAttribute('aria-label', `Türchen ${doorNumber}`);
    door.textContent = String(doorNumber);
    grid.append(door);
  }

  container.append(header, grid);
}

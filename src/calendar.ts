import { doorState, todayDoor, type DoorState } from './doors';

export const DOOR_ORDER: readonly number[] = [
  8, 13, 16, 4, 18, 3, 21, 19, 23, 20, 1, 10, 5, 24, 7, 9, 12, 15, 14, 17, 2, 11, 22, 6,
];

export interface CalendarOptions {
  opened: Set<number>;
  now: Date;
  onDoorActivate: (doorNumber: number) => void;
}

const SHAKE_CLASS = 'door--shake';
const STATE_CLASSES = ['door--locked', 'door--openable', 'door--opened', 'door--today'];

export function ariaLabelFor(n: number, state: DoorState, isToday: boolean): string {
  if (state === 'opened') {
    return `Door ${n}, opened`;
  }
  if (isToday) {
    return `Door ${n}, opens today`;
  }
  if (state === 'locked') {
    return `Door ${n}, locked`;
  }
  return `Door ${n}, open now`;
}

export function applyDoorState(door: HTMLElement, n: number, opened: Set<number>, now: Date): void {
  const state = doorState(n, opened, now);
  const isToday = todayDoor(now) === n;
  door.classList.remove(...STATE_CLASSES);
  door.classList.add(`door--${state}`);
  if (isToday) {
    door.classList.add('door--today');
  }
  door.setAttribute('aria-label', ariaLabelFor(n, state, isToday));
}

export function renderCalendar(container: HTMLElement, options: CalendarOptions): void {
  const header = document.createElement('header');
  header.className = 'calendar-header';

  const title = document.createElement('h1');
  title.textContent = 'December 2026';

  const subtitle = document.createElement('p');
  subtitle.className = 'calendar-subtitle';
  subtitle.textContent = '24 doors until Christmas Eve';

  header.append(title, subtitle);

  const grid = document.createElement('div');
  grid.className = 'calendar-grid';

  for (const doorNumber of DOOR_ORDER) {
    const door = document.createElement('button');
    door.type = 'button';
    door.className = 'door';
    door.dataset.door = String(doorNumber);
    door.textContent = String(doorNumber);
    applyDoorState(door, doorNumber, options.opened, options.now);

    door.addEventListener('click', () => {
      if (doorState(doorNumber, options.opened, options.now) === 'locked') {
        door.classList.remove(SHAKE_CLASS);
        void door.offsetWidth;
        door.classList.add(SHAKE_CLASS);
      } else {
        options.onDoorActivate(doorNumber);
      }
    });
    door.addEventListener('animationend', () => {
      door.classList.remove(SHAKE_CLASS);
    });

    grid.append(door);
  }

  container.append(header, grid);
}

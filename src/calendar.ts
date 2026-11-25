import { attachScratchOverlay, type ScratchHandle } from './scratch-canvas';
import type { Content, DoorPhoto } from './content';
import { doorState, todayDoor, type DoorState } from './doors';

export const DOOR_ORDER: readonly number[] = [
  8, 13, 16, 4, 18, 3, 21, 19, 23, 20, 1, 10, 5, 24, 7, 9, 12, 15, 14, 17, 2, 11, 22, 6,
];

export interface CalendarOptions {
  opened: Set<number>;
  now: Date;
  doors: Content['doors'];
  onDoorActivate: (doorNumber: number) => void;
}

const SHAKE_CLASS = 'door--shake';
const STATE_CLASSES = [
  'door--locked',
  'door--openable',
  'door--opened',
  'door--today',
  'door--frosted',
];

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

export function thumbDataUrl(photo: DoorPhoto): string {
  return `data:image/jpeg;base64,${photo.thumb}`;
}

export function renderCalendar(container: HTMLElement, options: CalendarOptions): void {
  const header = document.createElement('header');
  header.className = 'calendar-header';

  const title = document.createElement('h1');
  title.textContent = 'Advent Calendar';

  const subtitle = document.createElement('p');
  subtitle.className = 'calendar-subtitle';
  subtitle.textContent = '24 days until Christmas Eve';

  header.append(title, subtitle);

  const grid = document.createElement('div');
  grid.className = 'calendar-grid';

  const handles = new Map<number, ScratchHandle | null>();

  function activate(doorNumber: number): void {
    handles.get(doorNumber)?.finish();
    options.onDoorActivate(doorNumber);
  }

  for (const doorNumber of DOOR_ORDER) {
    const door = document.createElement('button');
    door.type = 'button';
    door.className = 'door';
    door.dataset.door = String(doorNumber);

    const entry = options.doors.find((candidate) => candidate.n === doorNumber);
    if (entry?.photo !== undefined) {
      door.classList.add('door--has-photo');
      const thumb = document.createElement('img');
      thumb.className = 'door-thumb';
      thumb.alt = '';
      thumb.src = thumbDataUrl(entry.photo);
      door.append(thumb);
    }

    const number = document.createElement('span');
    number.className = 'door-number';
    number.textContent = String(doorNumber);
    door.append(number);

    applyDoorState(door, doorNumber, options.opened, options.now);

    door.addEventListener('click', () => {
      if (doorState(doorNumber, options.opened, options.now) === 'locked') {
        door.classList.remove(SHAKE_CLASS);
        void door.offsetWidth;
        door.classList.add(SHAKE_CLASS);
      } else {
        activate(doorNumber);
      }
    });
    door.addEventListener('animationend', () => {
      door.classList.remove(SHAKE_CLASS);
    });

    grid.append(door);
  }

  container.append(header, grid);

  for (const doorNumber of DOOR_ORDER) {
    const door = grid.querySelector<HTMLElement>(`button.door[data-door="${doorNumber}"]`);
    if (door === null) {
      continue;
    }
    if (doorState(doorNumber, options.opened, options.now) === 'openable') {
      let scratchFired = false;
      handles.set(
        doorNumber,
        attachScratchOverlay(door, doorNumber, {
          onActivate: () => {
            if (scratchFired) {
              return;
            }
            scratchFired = true;
            activate(doorNumber);
          },
        }),
      );
    }
  }
}

import { attachScratchOverlay, attachStaticDoorSurface, type ScratchHandle } from './scratch-canvas';
import type { Content, DoorPhoto } from './content';
import { countdownPhase, countdownText, daysUntilChristmasEve } from './countdown';
import { DOOR_ORDER } from './door-order';
import { frostDensityForDoor, snowDepthForDoor, sparkleBurst, syncDoorSnow } from './door-snow';
import { doorState, todayDoor, type DoorState } from './doors';
import { tintForDoor } from './door-palette';
import type { LightboxHandle } from './lightbox';
import { newlyEarnedStages } from './reveal';
import { revealSceneGifts, revealSceneStages, renderScene, scrollToPageTop, syncSceneStages } from './scene';

export { DOOR_ORDER };

export interface CalendarOptions {
  opened: Set<number>;
  now: Date;
  doors: Content['doors'];
  onDoorActivate: (doorNumber: number) => void | LightboxHandle;
}

const SHAKE_CLASS = 'door--shake';
// door--frosted (painted surface) belongs to the locked/scratchable surface
// layer only; opened doors show the framed photo thumb or the number look
const STATE_CLASSES = [
  'door--locked',
  'door--openable',
  'door--opened',
  'door--today',
  'door--photo-frame',
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
  door.style.setProperty('--door-tint', tintForDoor(n).frost);
  if (state === 'opened' && door.classList.contains('door--has-photo')) {
    door.classList.add('door--photo-frame');
  }
  const mark = door.querySelector('.door-opened-mark');
  if (state === 'opened' && mark === null) {
    const badge = document.createElement('span');
    badge.className = 'door-opened-mark';
    badge.setAttribute('aria-hidden', 'true');
    door.append(badge);
  } else if (state !== 'opened' && mark !== null) {
    mark.remove();
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
  if (countdownPhase(options.now) === 'counting') {
    const days = daysUntilChristmasEve(options.now);
    const number = document.createElement('span');
    number.className = 'countdown-number';
    number.textContent = String(days);
    subtitle.append(number, ` ${days === 1 ? 'day' : 'days'} until Christmas Eve`);
  } else {
    subtitle.textContent = countdownText(options.now);
  }

  header.append(title, subtitle);

  const grid = document.createElement('div');
  grid.className = 'calendar-grid';

  const scene = renderScene(options.opened, options.now);

  const handles = new Map<number, ScratchHandle | null>();
  let revealBefore: Set<number> | null = null;

  function afterLightboxClose(): void {
    const before = revealBefore ?? new Set<number>();
    revealBefore = null;
    const fresh = newlyEarnedStages(before, options.opened);
    scrollToPageTop();
    if (fresh.length > 0) {
      revealSceneStages(scene, fresh);
    }
    revealSceneGifts(scene, before, options.opened);
  }

  function activate(doorNumber: number): void {
    handles.get(doorNumber)?.finish();
    const wasOpened = options.opened.has(doorNumber);
    revealBefore = new Set(options.opened);
    const handle = options.onDoorActivate(doorNumber);
    syncSceneStages(scene, options.opened, options.now);
    const doorElement = grid.querySelector<HTMLElement>(`button.door[data-door="${doorNumber}"]`);
    if (doorElement !== null) {
      syncDoorSnow(doorElement, doorNumber, options.now, options.opened);
      if (!wasOpened) {
        sparkleBurst(doorElement, doorNumber);
      }
    }
    if (handle && typeof handle.onClose === 'function') {
      handle.onClose(afterLightboxClose);
    }
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
    syncDoorSnow(door, doorNumber, options.now, options.opened);

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

  container.append(header, scene, grid);

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
          snowDepth: snowDepthForDoor(doorNumber, options.now, options.opened),
          frostDensity: frostDensityForDoor(doorNumber, options.now, options.opened),
          onActivate: () => {
            if (scratchFired) {
              return;
            }
            scratchFired = true;
            activate(doorNumber);
          },
        }),
      );
    } else if (doorState(doorNumber, options.opened, options.now) === 'locked') {
      // locked future doors still show their full colored festive surface as
      // a static painted layer (opened doors show the framed thumb / number)
      attachStaticDoorSurface(door, doorNumber, {
        frostDensity: frostDensityForDoor(doorNumber, options.now, options.opened),
      });
    }
  }
}

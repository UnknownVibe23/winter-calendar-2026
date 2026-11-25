export const DOOR_COUNT = 24;
export const CALENDAR_YEAR = 2026;
export const CALENDAR_MONTH = 11;

export type DoorState = 'locked' | 'opened' | 'openable';

const OPENED_STORAGE_KEY = 'wc.opened';

export function doorUnlockDate(n: number): Date {
  return new Date(CALENDAR_YEAR, CALENDAR_MONTH, n);
}

export function doorState(n: number, opened: Set<number>, now: Date): DoorState {
  if (opened.has(n)) {
    return 'opened';
  }
  return now < doorUnlockDate(n) ? 'locked' : 'openable';
}

export function todayDoor(now: Date): number | null {
  if (now.getFullYear() !== CALENDAR_YEAR || now.getMonth() !== CALENDAR_MONTH) {
    return null;
  }
  const day = now.getDate();
  return day >= 1 && day <= DOOR_COUNT ? day : null;
}

export function parseDateOverride(search: string): Date | null {
  const raw = new URLSearchParams(search).get('date');
  if (raw === null) {
    return null;
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (match === null) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return date;
}

export function resolveNow(
  search: string = window.location.search,
  dev: boolean = import.meta.env.DEV,
): Date {
  if (dev) {
    const raw = new URLSearchParams(search).get('date');
    if (raw !== null) {
      const override = parseDateOverride(search);
      if (override !== null) {
        return override;
      }
      console.warn(`Ignoring invalid ?date value: ${raw}`);
    }
  }
  return new Date();
}

export function loadOpened(): Set<number> {
  const raw = localStorage.getItem(OPENED_STORAGE_KEY);
  if (raw === null) {
    return new Set();
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return new Set();
  }
  if (!Array.isArray(parsed)) {
    return new Set();
  }
  const opened = new Set<number>();
  for (const entry of parsed) {
    if (typeof entry === 'number' && Number.isInteger(entry)) {
      opened.add(entry);
    }
  }
  return opened;
}

export function saveOpened(opened: Set<number>): void {
  const sorted = [...opened].sort((a, b) => a - b);
  localStorage.setItem(OPENED_STORAGE_KEY, JSON.stringify(sorted));
}

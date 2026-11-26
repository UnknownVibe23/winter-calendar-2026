import { DOOR_COUNT, doorUnlockDate, loadOpened, saveOpened } from './doors';

/**
 * Doors whose unlock date is today or earlier for the given (already
 * resolved) date — the same date the door logic uses, so the dev ?date=
 * override works. Deterministic, never includes future doors.
 */
export function restorableDoors(now: Date): number[] {
  const doors: number[] = [];
  for (let n = 1; n <= DOOR_COUNT; n += 1) {
    if (doorUnlockDate(n) <= now) {
      doors.push(n);
    }
  }
  return doors;
}

/**
 * Pure application of a restore to an opened set: adds every restorable
 * door, keeps already-opened doors, never removes anything.
 */
export function restoreOpenedDoors(opened: Set<number>, now: Date): Set<number> {
  const restored = new Set(opened);
  for (const n of restorableDoors(now)) {
    restored.add(n);
  }
  return restored;
}

export const RESTORE_BUTTON_TEXT = 'Restore opened doors';
export const RESTORE_MODAL_TEXT =
  'Restore opened doors — Use this if you cleared your browser data. It opens all doors up to today, without opening effects. This cannot be undone.';
export const RESTORE_CANCEL_TEXT = 'Cancel';
export const RESTORE_CONFIRM_TEXT = 'OK, restore';

export interface RestoreOptions {
  now: Date;
  onRestored: () => void;
}

/**
 * Small, unobtrusive options button at the bottom of the page. Opens the
 * in-page restore modal on tap.
 */
export function renderRestoreOptions(root: HTMLElement, options: RestoreOptions): void {
  const bar = document.createElement('div');
  bar.className = 'calendar-options';
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'options-restore';
  button.textContent = RESTORE_BUTTON_TEXT;
  button.addEventListener('click', () => {
    openRestoreModal(root, options);
  });
  bar.append(button);
  root.append(bar);
}

/**
 * In-page modal (no confirm()) explaining the restore. Cancel (or Escape /
 * a tap on the backdrop) does nothing; OK, restore adds all up-to-today
 * doors to the existing opened memory without any opening effects, closes
 * the modal and re-renders via onRestored.
 */
export function openRestoreModal(root: HTMLElement, options: RestoreOptions): void {
  const overlay = document.createElement('div');
  overlay.className = 'restore-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', RESTORE_BUTTON_TEXT);

  const card = document.createElement('div');
  card.className = 'restore-modal';

  const text = document.createElement('p');
  text.className = 'restore-text';
  text.textContent = RESTORE_MODAL_TEXT;

  const actions = document.createElement('div');
  actions.className = 'restore-actions';

  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.className = 'restore-cancel';
  cancel.textContent = RESTORE_CANCEL_TEXT;

  const confirm = document.createElement('button');
  confirm.type = 'button';
  confirm.className = 'restore-confirm';
  confirm.textContent = RESTORE_CONFIRM_TEXT;

  actions.append(cancel, confirm);
  card.append(text, actions);
  overlay.append(card);
  root.append(overlay);

  let closed = false;

  function onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    }
  }

  function close(): void {
    if (closed) {
      return;
    }
    closed = true;
    document.removeEventListener('keydown', onKeydown);
    overlay.remove();
  }

  cancel.addEventListener('click', close);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) {
      close();
    }
  });
  confirm.addEventListener('click', () => {
    if (closed) {
      return;
    }
    saveOpened(restoreOpenedDoors(loadOpened(), options.now));
    close();
    options.onRestored();
  });
  document.addEventListener('keydown', onKeydown);
  cancel.focus();
}

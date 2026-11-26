import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  RESTORE_BUTTON_TEXT,
  RESTORE_CANCEL_TEXT,
  RESTORE_CONFIRM_TEXT,
  RESTORE_MODAL_TEXT,
  openRestoreModal,
  renderRestoreOptions,
  restorableDoors,
  restoreOpenedDoors,
} from './restore';

const NOV_30 = new Date(2026, 10, 30, 12, 0, 0);
const DEC_1 = new Date(2026, 11, 1, 0, 0, 0);
const DEC_6 = new Date(2026, 11, 6, 0, 0, 0);
const DEC_6_EVENING = new Date(2026, 11, 6, 23, 59, 59);
const DEC_7 = new Date(2026, 11, 7, 0, 0, 0);
const DEC_24 = new Date(2026, 11, 24, 12, 0, 0);
const DEC_26 = new Date(2026, 11, 26, 12, 0, 0);

function range(from: number, to: number): number[] {
  return Array.from({ length: to - from + 1 }, (_, index) => from + index);
}

describe('restorableDoors', () => {
  it('is empty before Dec 1 and in the wrong year', () => {
    expect(restorableDoors(NOV_30)).toEqual([]);
    expect(restorableDoors(new Date(2025, 11, 24, 12))).toEqual([]);
  });

  it('contains exactly the doors whose unlock date is today or earlier', () => {
    expect(restorableDoors(DEC_1)).toEqual([1]);
    expect(restorableDoors(DEC_6)).toEqual(range(1, 6));
    expect(restorableDoors(DEC_6_EVENING)).toEqual(range(1, 6));
    expect(restorableDoors(DEC_7)).toEqual(range(1, 7));
    expect(restorableDoors(DEC_24)).toEqual(range(1, 24));
    expect(restorableDoors(DEC_26)).toEqual(range(1, 24));
    expect(restorableDoors(new Date(2027, 0, 5, 12))).toEqual(range(1, 24));
  });

  it('never includes future doors and is deterministic', () => {
    const doors = restorableDoors(DEC_6);
    expect(doors).not.toContain(7);
    expect(doors).toHaveLength(6);
    expect(restorableDoors(DEC_6)).toEqual(doors);
  });
});

describe('restoreOpenedDoors', () => {
  it('adds all restorable doors to the existing opened set without removing anything', () => {
    const restored = restoreOpenedDoors(new Set([3, 20]), DEC_6);
    expect([...restored].sort((a, b) => a - b)).toEqual(range(1, 6).concat([20]));
  });

  it('keeps already-opened doors as they are and never touches future doors', () => {
    const restored = restoreOpenedDoors(new Set([1, 2]), DEC_6);
    expect(restored.has(1)).toBe(true);
    expect(restored.has(2)).toBe(true);
    expect(restored.has(7)).toBe(false);
    expect(restored.has(24)).toBe(false);
  });

  it('is idempotent and does not mutate the input set', () => {
    const opened = new Set([5]);
    const once = restoreOpenedDoors(opened, DEC_6);
    const twice = restoreOpenedDoors(once, DEC_6);
    expect([...twice].sort((a, b) => a - b)).toEqual([...once].sort((a, b) => a - b));
    expect([...opened]).toEqual([5]);
  });
});

describe('restore modal wiring', () => {
  let root: HTMLElement;

  beforeEach(() => {
    localStorage.clear();
    root = document.createElement('div');
    document.body.append(root);
  });

  function options(onRestored = vi.fn()): { now: Date; onRestored: () => void } {
    return { now: DEC_6, onRestored };
  }

  it('renders the options button at the bottom with the English label', () => {
    renderRestoreOptions(root, options());
    const button = root.querySelector<HTMLButtonElement>('button.options-restore');
    expect(button).not.toBeNull();
    expect(button?.textContent).toBe(RESTORE_BUTTON_TEXT);
    expect(button?.textContent).toBe('Restore opened doors');
    expect(root.lastElementChild?.classList.contains('calendar-options')).toBe(true);
  });

  it('opens an in-page modal with the exact explanation and Cancel / OK buttons', () => {
    renderRestoreOptions(root, options());
    root.querySelector<HTMLButtonElement>('button.options-restore')?.click();
    const overlay = root.querySelector('.restore-overlay');
    expect(overlay).not.toBeNull();
    expect(overlay?.getAttribute('role')).toBe('dialog');
    expect(overlay?.getAttribute('aria-modal')).toBe('true');
    expect(root.querySelector('.restore-text')?.textContent).toBe(RESTORE_MODAL_TEXT);
    expect(root.querySelector('.restore-text')?.textContent).toContain(
      'It opens all doors up to today, without opening effects. This cannot be undone.',
    );
    expect(root.querySelector<HTMLButtonElement>('.restore-cancel')?.textContent).toBe(
      RESTORE_CANCEL_TEXT,
    );
    expect(root.querySelector<HTMLButtonElement>('.restore-confirm')?.textContent).toBe(
      RESTORE_CONFIRM_TEXT,
    );
    expect(root.querySelector('.restore-confirm')?.textContent).toBe('OK, restore');
  });

  it('Cancel closes the modal and changes nothing', () => {
    const onRestored = vi.fn();
    localStorage.setItem('wc.opened', '[2]');
    renderRestoreOptions(root, options(onRestored));
    root.querySelector<HTMLButtonElement>('button.options-restore')?.click();
    root.querySelector<HTMLButtonElement>('.restore-cancel')?.click();
    expect(root.querySelector('.restore-overlay')).toBeNull();
    expect(localStorage.getItem('wc.opened')).toBe('[2]');
    expect(onRestored).not.toHaveBeenCalled();
  });

  it('Escape and a backdrop tap close the modal without restoring', () => {
    const onRestored = vi.fn();
    renderRestoreOptions(root, options(onRestored));
    root.querySelector<HTMLButtonElement>('button.options-restore')?.click();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(root.querySelector('.restore-overlay')).toBeNull();
    expect(onRestored).not.toHaveBeenCalled();
    expect(localStorage.getItem('wc.opened')).toBeNull();

    root.querySelector<HTMLButtonElement>('button.options-restore')?.click();
    const overlay = root.querySelector('.restore-overlay') as HTMLElement;
    overlay.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(root.querySelector('.restore-overlay')).toBeNull();
    expect(onRestored).not.toHaveBeenCalled();
  });

  it('OK, restore writes exactly the up-to-today doors to the opened memory, closes and re-renders', () => {
    const onRestored = vi.fn();
    localStorage.setItem('wc.opened', '[2]');
    renderRestoreOptions(root, options(onRestored));
    root.querySelector<HTMLButtonElement>('button.options-restore')?.click();
    root.querySelector<HTMLButtonElement>('.restore-confirm')?.click();
    expect(localStorage.getItem('wc.opened')).toBe('[1,2,3,4,5,6]');
    expect(root.querySelector('.restore-overlay')).toBeNull();
    expect(onRestored).toHaveBeenCalledTimes(1);
  });

  it('OK, restore with empty memory opens exactly doors 1..6 on Dec 6 and never later doors', () => {
    renderRestoreOptions(root, options());
    openRestoreModal(root, options());
    root.querySelector<HTMLButtonElement>('.restore-confirm')?.click();
    expect(localStorage.getItem('wc.opened')).toBe('[1,2,3,4,5,6]');
  });

  it('the modal closes only once even on repeated confirm clicks', () => {
    const onRestored = vi.fn();
    renderRestoreOptions(root, options(onRestored));
    openRestoreModal(root, options(onRestored));
    const confirm = root.querySelector<HTMLButtonElement>('.restore-confirm');
    confirm?.click();
    confirm?.click();
    expect(onRestored).toHaveBeenCalledTimes(1);
    expect(root.querySelector('.restore-overlay')).toBeNull();
  });
});

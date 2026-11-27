/**
 * Frozen shuffled display order of the 24 doors in the calendar grid.
 * Lives in its own module so both the grid renderer (calendar.ts) and the
 * tint assignment (door-palette.ts) read the same frozen order without a
 * circular import. Do not reorder.
 */
export const DOOR_ORDER: readonly number[] = [
  8, 13, 16, 4, 18, 3, 21, 19, 23, 20, 1, 10, 5, 24, 7, 9, 12, 15, 14, 17, 2, 11, 22, 6,
];

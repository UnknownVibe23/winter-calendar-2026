import { DOOR_COUNT } from './doors';

export const SCENE_STAGE_COUNT = 24;

export const SCENE_STAGE_IDS: readonly number[] = Array.from(
  { length: SCENE_STAGE_COUNT },
  (_, index) => index + 1,
);

export function openedDoorCount(opened: Set<number>): number {
  let count = 0;
  for (const doorNumber of opened) {
    if (Number.isInteger(doorNumber) && doorNumber >= 1 && doorNumber <= DOOR_COUNT) {
      count += 1;
    }
  }
  return Math.min(count, SCENE_STAGE_COUNT);
}

export function earnedStages(opened: Set<number>): number[] {
  return SCENE_STAGE_IDS.slice(0, openedDoorCount(opened));
}

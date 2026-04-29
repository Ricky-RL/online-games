import type { Player, SnakesAndLaddersState } from './types';

const MAX_ATTEMPTS = 100;

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generateBoard(): SnakesAndLaddersState {
  const occupied = new Set<number>([1, 100]);
  const snakes: Record<number, number> = {};
  const ladders: Record<number, number> = {};

  function placeEntity(
    minStart: number,
    maxStart: number,
    goesDown: boolean
  ): [number, number] | null {
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const start = randomInt(minStart, maxStart);
      if (occupied.has(start)) continue;

      const endMin = goesDown ? 2 : start + 1;
      const endMax = goesDown ? start - 1 : 99;
      if (endMin > endMax) continue;

      const end = randomInt(endMin, endMax);
      if (occupied.has(end)) continue;

      occupied.add(start);
      occupied.add(end);
      return [start, end];
    }
    return null;
  }

  // Place 2 snakes in high range (80-99)
  for (let i = 0; i < 2; i++) {
    const result = placeEntity(80, 99, true);
    if (result) snakes[result[0]] = result[1];
  }

  // Place remaining 6 snakes anywhere (20-99 for heads)
  for (let i = 0; i < 6; i++) {
    const result = placeEntity(20, 99, true);
    if (result) snakes[result[0]] = result[1];
  }

  // Place 2 ladders in early range (2-20)
  for (let i = 0; i < 2; i++) {
    const result = placeEntity(2, 20, false);
    if (result) ladders[result[0]] = result[1];
  }

  // Place remaining 6 ladders anywhere (2-80 for bottoms)
  for (let i = 0; i < 6; i++) {
    const result = placeEntity(2, 80, false);
    if (result) ladders[result[0]] = result[1];
  }

  return {
    players: { 1: 1, 2: 1 },
    snakes,
    ladders,
    lastRoll: null,
  };
}

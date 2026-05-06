import { describe, expect, it } from 'vitest';
import { stepPhysics } from './physics';
import {
  BallState,
  CORNER_POCKET_RADIUS,
  POCKET_RADIUS,
  getPocketRadius,
} from './types';

function createBall(x: number, y: number): BallState {
  return {
    id: 1,
    x,
    y,
    vx: 0,
    vy: 0,
    pocketed: false,
  };
}

describe('pool pocket sizing', () => {
  it('uses the larger radius only for corner pockets', () => {
    expect([0, 1, 4, 5].map(getPocketRadius)).toEqual([
      CORNER_POCKET_RADIUS,
      CORNER_POCKET_RADIUS,
      CORNER_POCKET_RADIUS,
      CORNER_POCKET_RADIUS,
    ]);
    expect([2, 3].map(getPocketRadius)).toEqual([POCKET_RADIUS, POCKET_RADIUS]);
  });

  it('pockets balls inside the larger corner radius', () => {
    const { balls, pocketed } = stepPhysics([createBall(19, 27)]);

    expect(pocketed).toEqual([1]);
    expect(balls[0].pocketed).toBe(true);
  });

  it('keeps side pockets at the original smaller radius', () => {
    const { balls, pocketed } = stepPhysics([createBall(19, 214)]);

    expect(pocketed).toEqual([]);
    expect(balls[0].pocketed).toBe(false);
  });
});

import { describe, it, expect } from 'vitest';
import { createPhysicsState, stepPhysics, shootBall } from './physics';
import { Level, BALL_RADIUS, SINK_SPEED_THRESHOLD, MIN_SPEED } from './types';

const simpleLevel: Level = {
  id: 1,
  name: 'Test',
  tier: 'easy',
  par: 2,
  start: { x: 200, y: 600 },
  hole: { x: 200, y: 100, radius: 12 },
  walls: [
    { x1: 50, y1: 50, x2: 350, y2: 50 },
    { x1: 50, y1: 650, x2: 350, y2: 650 },
    { x1: 50, y1: 50, x2: 50, y2: 650 },
    { x1: 350, y1: 50, x2: 350, y2: 650 },
  ],
};

describe('createPhysicsState', () => {
  it('creates state at start position, not moving', () => {
    const state = createPhysicsState(simpleLevel);
    expect(state.x).toBe(200);
    expect(state.y).toBe(600);
    expect(state.moving).toBe(false);
    expect(state.sunk).toBe(false);
  });
});

describe('shootBall', () => {
  it('sets velocity based on angle and power', () => {
    const state = createPhysicsState(simpleLevel);
    const shot = shootBall(state, 0, 100);
    expect(shot.moving).toBe(true);
    expect(shot.vx).toBeCloseTo(0, 0);
    expect(shot.vy).toBeLessThan(0);
  });

  it('does not shoot if already moving', () => {
    const state = { ...createPhysicsState(simpleLevel), moving: true, vx: 1, vy: 1 };
    const shot = shootBall(state, 0, 100);
    expect(shot.vx).toBe(1);
    expect(shot.vy).toBe(1);
  });
});

describe('stepPhysics', () => {
  it('moves ball when velocity is set', () => {
    const state = { x: 200, y: 400, vx: 0, vy: -5, moving: true, sunk: false };
    const result = stepPhysics(state, simpleLevel);
    expect(result.y).toBeLessThan(400);
  });

  it('stops ball when speed drops below MIN_SPEED', () => {
    const state = { x: 200, y: 400, vx: 0.1, vy: 0.1, moving: true, sunk: false };
    const result = stepPhysics(state, simpleLevel);
    expect(result.moving).toBe(false);
    expect(result.vx).toBe(0);
    expect(result.vy).toBe(0);
  });

  it('reflects ball off walls', () => {
    const state = { x: 55, y: 300, vx: -5, vy: 0, moving: true, sunk: false };
    const result = stepPhysics(state, simpleLevel);
    expect(result.vx).toBeGreaterThan(0);
  });

  it('sinks ball when close to hole and slow enough', () => {
    const state = {
      x: 200, y: 101, vx: 0, vy: -(SINK_SPEED_THRESHOLD - 1),
      moving: true, sunk: false,
    };
    const result = stepPhysics(state, simpleLevel);
    expect(result.sunk).toBe(true);
    expect(result.moving).toBe(false);
  });

  it('does not sink ball when moving too fast', () => {
    const state = {
      x: 200, y: 101, vx: 0, vy: -(SINK_SPEED_THRESHOLD + 2),
      moving: true, sunk: false,
    };
    const result = stepPhysics(state, simpleLevel);
    expect(result.sunk).toBe(false);
  });
});

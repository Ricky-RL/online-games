import { describe, it, expect } from 'vitest';
import { determineShotResult, getPlayerGroup, isGameOver, getWinner } from './logic';
import { BallState, PoolBoard } from './types';
import { createInitialBalls } from './setup';

describe('determineShotResult', () => {
  it('returns scratch=true when cue ball is pocketed', () => {
    const board: PoolBoard = {
      balls: createInitialBalls(),
      player1Group: null,
      player2Group: null,
      lastShot: null,
      lastShotResult: null,
      phase: 'playing',
      version: 0,
      shotHistory: [],
    };
    const result = determineShotResult(board, 1, [0]);
    expect(result.scratch).toBe(true);
    expect(result.foul).toBe(true);
    expect(result.turnContinues).toBe(false);
  });

  it('assigns groups on first legal pocket after break', () => {
    const board: PoolBoard = {
      balls: createInitialBalls(),
      player1Group: null,
      player2Group: null,
      lastShot: null,
      lastShotResult: null,
      phase: 'playing',
      version: 0,
      shotHistory: [],
    };
    const result = determineShotResult(board, 1, [3]); // solid red
    expect(result.groupAssigned).toBe(true);
    expect(result.turnContinues).toBe(true);
  });

  it('player continues turn when pocketing own ball', () => {
    const board: PoolBoard = {
      balls: createInitialBalls(),
      player1Group: 'solids',
      player2Group: 'stripes',
      lastShot: null,
      lastShotResult: null,
      phase: 'playing',
      version: 0,
      shotHistory: [],
    };
    const result = determineShotResult(board, 1, [2]); // solid blue
    expect(result.turnContinues).toBe(true);
    expect(result.foul).toBe(false);
  });

  it('turn does not continue when pocketing opponent ball', () => {
    const board: PoolBoard = {
      balls: createInitialBalls(),
      player1Group: 'solids',
      player2Group: 'stripes',
      lastShot: null,
      lastShotResult: null,
      phase: 'playing',
      version: 0,
      shotHistory: [],
    };
    const result = determineShotResult(board, 1, [9]); // stripe
    expect(result.turnContinues).toBe(false);
  });

  it('turn does not continue when nothing pocketed', () => {
    const board: PoolBoard = {
      balls: createInitialBalls(),
      player1Group: 'solids',
      player2Group: 'stripes',
      lastShot: null,
      lastShotResult: null,
      phase: 'playing',
      version: 0,
      shotHistory: [],
    };
    const result = determineShotResult(board, 1, []);
    expect(result.turnContinues).toBe(false);
    expect(result.foul).toBe(false);
  });
});

describe('isGameOver', () => {
  it('returns false when 8-ball is not pocketed', () => {
    const balls = createInitialBalls();
    expect(isGameOver(balls)).toBe(false);
  });

  it('returns true when 8-ball is pocketed', () => {
    const balls = createInitialBalls().map((b) =>
      b.id === 8 ? { ...b, pocketed: true } : b
    );
    expect(isGameOver(balls)).toBe(true);
  });
});

describe('getWinner', () => {
  it('player wins when they pocket 8-ball after clearing their group', () => {
    const balls = createInitialBalls().map((b) => {
      if (b.id >= 1 && b.id <= 7) return { ...b, pocketed: true };
      if (b.id === 8) return { ...b, pocketed: true };
      return b;
    });
    const board: PoolBoard = {
      balls,
      player1Group: 'solids',
      player2Group: 'stripes',
      lastShot: null,
      lastShotResult: null,
      phase: 'playing',
      version: 0,
      shotHistory: [],
    };
    expect(getWinner(board, 1, [8])).toBe(1);
  });

  it('player loses when they pocket 8-ball early', () => {
    const balls = createInitialBalls().map((b) => {
      if (b.id === 8) return { ...b, pocketed: true };
      return b;
    });
    const board: PoolBoard = {
      balls,
      player1Group: 'solids',
      player2Group: 'stripes',
      lastShot: null,
      lastShotResult: null,
      phase: 'playing',
      version: 0,
      shotHistory: [],
    };
    // Player 1 pocketed 8-ball but hasn't cleared solids -> player 2 wins
    expect(getWinner(board, 1, [8])).toBe(2);
  });
});

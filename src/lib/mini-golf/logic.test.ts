import { describe, it, expect } from 'vitest';
import {
  createInitialBoard,
  recordScore,
  isHoleComplete,
  isGameComplete,
  getWinner,
  getTotalStrokes,
  playerIndex,
} from './logic';
import { Player } from '../types';

describe('createInitialBoard', () => {
  it('creates board with 3 level indices (one per tier)', () => {
    const board = createInitialBoard([0, 1, 2, 3, 4], [5, 6, 7, 8, 9], [10, 11, 12, 13, 14]);
    expect(board.levels).toHaveLength(3);
    expect(board.levels[0]).toBeGreaterThanOrEqual(0);
    expect(board.levels[0]).toBeLessThanOrEqual(4);
    expect(board.levels[1]).toBeGreaterThanOrEqual(5);
    expect(board.levels[1]).toBeLessThanOrEqual(9);
    expect(board.levels[2]).toBeGreaterThanOrEqual(10);
    expect(board.levels[2]).toBeLessThanOrEqual(14);
  });

  it('initializes with null scores and phase waiting', () => {
    const board = createInitialBoard([0], [5], [10]);
    expect(board.scores).toEqual([[null, null], [null, null], [null, null]]);
    expect(board.phase).toBe('waiting');
    expect(board.currentHole).toBe(0);
    expect(board.currentStroke).toBe(0);
    expect(board.version).toBe(1);
  });
});

describe('playerIndex', () => {
  it('maps Player 1 to index 0', () => {
    expect(playerIndex(1)).toBe(0);
  });
  it('maps Player 2 to index 1', () => {
    expect(playerIndex(2)).toBe(1);
  });
});

describe('recordScore', () => {
  it('records player 1 score for hole 0', () => {
    const board = createInitialBoard([0], [5], [10]);
    board.phase = 'aiming';
    const updated = recordScore(board, 0, 1, 3);
    expect(updated.scores[0][0]).toBe(3);
  });

  it('records player 2 score for hole 0', () => {
    const board = createInitialBoard([0], [5], [10]);
    board.phase = 'aiming';
    const updated = recordScore(board, 0, 2, 5);
    expect(updated.scores[0][1]).toBe(5);
  });
});

describe('isHoleComplete', () => {
  it('returns false when no scores recorded', () => {
    const board = createInitialBoard([0], [5], [10]);
    expect(isHoleComplete(board, 0)).toBe(false);
  });

  it('returns false when only one player scored', () => {
    const board = createInitialBoard([0], [5], [10]);
    board.scores[0][0] = 3;
    expect(isHoleComplete(board, 0)).toBe(false);
  });

  it('returns true when both players scored', () => {
    const board = createInitialBoard([0], [5], [10]);
    board.scores[0][0] = 3;
    board.scores[0][1] = 4;
    expect(isHoleComplete(board, 0)).toBe(true);
  });
});

describe('isGameComplete', () => {
  it('returns true when all holes are complete', () => {
    const board = createInitialBoard([0], [5], [10]);
    board.scores = [[3, 4], [2, 5], [4, 3]];
    expect(isGameComplete(board)).toBe(true);
  });

  it('returns false when any hole is incomplete', () => {
    const board = createInitialBoard([0], [5], [10]);
    board.scores = [[3, 4], [2, null], [null, null]];
    expect(isGameComplete(board)).toBe(false);
  });
});

describe('getTotalStrokes', () => {
  it('sums completed hole scores for a player', () => {
    const scores: [[number, number], [number, number], [null, null]] = [[3, 4], [2, 5], [null, null]];
    expect(getTotalStrokes(scores as any, 1)).toBe(5);
    expect(getTotalStrokes(scores as any, 2)).toBe(9);
  });
});

describe('getWinner', () => {
  it('returns player with lower total strokes', () => {
    const board = createInitialBoard([0], [5], [10]);
    board.scores = [[3, 4], [2, 5], [4, 3]];
    expect(getWinner(board)).toBe(1);
  });

  it('uses tiebreaker: lowest single-hole score', () => {
    const board = createInitialBoard([0], [5], [10]);
    board.scores = [[2, 3], [4, 5], [3, 1]];
    // P1 total = 9, P2 total = 9 (tied)
    // P1 best = 2, P2 best = 1
    expect(getWinner(board)).toBe(2);
  });

  it('returns null for draw', () => {
    const board = createInitialBoard([0], [5], [10]);
    board.scores = [[3, 3], [3, 3], [3, 3]];
    expect(getWinner(board)).toBeNull();
  });
});

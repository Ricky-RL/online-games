import { describe, it, expect } from 'vitest';
import { generateBoard, makeMove, checkWin, rollDice, getSquareEntity } from './snakes-and-ladders-logic';
import type { SnakesAndLaddersState } from './types';

describe('generateBoard', () => {
  it('creates initial state with players at position 1', () => {
    const state = generateBoard();
    expect(state.players[1]).toBe(1);
    expect(state.players[2]).toBe(1);
  });

  it('generates 8 snakes', () => {
    const state = generateBoard();
    expect(Object.keys(state.snakes)).toHaveLength(8);
  });

  it('generates 8 ladders', () => {
    const state = generateBoard();
    expect(Object.keys(state.ladders)).toHaveLength(8);
  });

  it('snakes always go downward (head > tail)', () => {
    const state = generateBoard();
    for (const [head, tail] of Object.entries(state.snakes)) {
      expect(Number(head)).toBeGreaterThan(tail);
    }
  });

  it('ladders always go upward (top > bottom)', () => {
    const state = generateBoard();
    for (const [bottom, top] of Object.entries(state.ladders)) {
      expect(top).toBeGreaterThan(Number(bottom));
    }
  });

  it('no endpoints overlap with each other or squares 1/100', () => {
    const state = generateBoard();
    const allEndpoints: number[] = [];
    for (const [head, tail] of Object.entries(state.snakes)) {
      allEndpoints.push(Number(head), tail);
    }
    for (const [bottom, top] of Object.entries(state.ladders)) {
      allEndpoints.push(Number(bottom), top);
    }
    const unique = new Set(allEndpoints);
    expect(unique.size).toBe(allEndpoints.length);
    expect(unique.has(1)).toBe(false);
    expect(unique.has(100)).toBe(false);
  });

  it('has at least 2 snakes in range 80-99', () => {
    const state = generateBoard();
    const highSnakes = Object.keys(state.snakes)
      .map(Number)
      .filter((h) => h >= 80 && h <= 99);
    expect(highSnakes.length).toBeGreaterThanOrEqual(2);
  });

  it('has at least 2 ladders in range 2-20', () => {
    const state = generateBoard();
    const earlyLadders = Object.keys(state.ladders)
      .map(Number)
      .filter((b) => b >= 2 && b <= 20);
    expect(earlyLadders.length).toBeGreaterThanOrEqual(2);
  });

  it('lastRoll starts as null', () => {
    const state = generateBoard();
    expect(state.lastRoll).toBeNull();
  });
});

describe('rollDice', () => {
  it('returns a number between 1 and 6', () => {
    for (let i = 0; i < 100; i++) {
      const roll = rollDice();
      expect(roll).toBeGreaterThanOrEqual(1);
      expect(roll).toBeLessThanOrEqual(6);
    }
  });
});

describe('makeMove', () => {
  const baseState: SnakesAndLaddersState = {
    players: { 1: 1, 2: 1 },
    snakes: { 50: 10 },
    ladders: { 5: 30 },
    lastRoll: null,
  };

  it('advances player by roll value', () => {
    const result = makeMove(baseState, 1, 3);
    expect(result.players[1]).toBe(4);
  });

  it('records the last roll', () => {
    const result = makeMove(baseState, 1, 3);
    expect(result.lastRoll).toEqual({ player: 1, value: 3 });
  });

  it('does not move the other player', () => {
    const result = makeMove(baseState, 1, 3);
    expect(result.players[2]).toBe(1);
  });

  it('applies ladder when landing on ladder bottom', () => {
    const state: SnakesAndLaddersState = {
      players: { 1: 2, 2: 1 },
      snakes: {},
      ladders: { 5: 30 },
      lastRoll: null,
    };
    const result = makeMove(state, 1, 3);
    expect(result.players[1]).toBe(30);
  });

  it('applies snake when landing on snake head', () => {
    const state: SnakesAndLaddersState = {
      players: { 1: 47, 2: 1 },
      snakes: { 50: 10 },
      ladders: {},
      lastRoll: null,
    };
    const result = makeMove(state, 1, 3);
    expect(result.players[1]).toBe(10);
  });

  it('bounces back when exceeding 100', () => {
    const state: SnakesAndLaddersState = {
      players: { 1: 98, 2: 1 },
      snakes: {},
      ladders: {},
      lastRoll: null,
    };
    const result = makeMove(state, 1, 5);
    expect(result.players[1]).toBe(97);
  });

  it('applies snake after bounce-back', () => {
    const state: SnakesAndLaddersState = {
      players: { 1: 98, 2: 1 },
      snakes: { 97: 20 },
      ladders: {},
      lastRoll: null,
    };
    const result = makeMove(state, 1, 5);
    expect(result.players[1]).toBe(20);
  });

  it('lands exactly on 100 to win', () => {
    const state: SnakesAndLaddersState = {
      players: { 1: 96, 2: 1 },
      snakes: {},
      ladders: {},
      lastRoll: null,
    };
    const result = makeMove(state, 1, 4);
    expect(result.players[1]).toBe(100);
  });

  it('wins via ladder landing on 100', () => {
    const state: SnakesAndLaddersState = {
      players: { 1: 92, 2: 1 },
      snakes: {},
      ladders: { 95: 100 },
      lastRoll: null,
    };
    const result = makeMove(state, 1, 3);
    expect(result.players[1]).toBe(100);
  });
});

describe('checkWin', () => {
  it('returns null when no player is on 100', () => {
    const state: SnakesAndLaddersState = {
      players: { 1: 50, 2: 60 },
      snakes: {},
      ladders: {},
      lastRoll: null,
    };
    expect(checkWin(state)).toBeNull();
  });

  it('returns 1 when player 1 is on 100', () => {
    const state: SnakesAndLaddersState = {
      players: { 1: 100, 2: 60 },
      snakes: {},
      ladders: {},
      lastRoll: null,
    };
    expect(checkWin(state)).toBe(1);
  });

  it('returns 2 when player 2 is on 100', () => {
    const state: SnakesAndLaddersState = {
      players: { 1: 50, 2: 100 },
      snakes: {},
      ladders: {},
      lastRoll: null,
    };
    expect(checkWin(state)).toBe(2);
  });
});

describe('getSquareEntity', () => {
  const state: SnakesAndLaddersState = {
    players: { 1: 1, 2: 1 },
    snakes: { 50: 10 },
    ladders: { 5: 30 },
    lastRoll: null,
  };

  it('returns snake info for a snake head', () => {
    expect(getSquareEntity(state, 50)).toEqual({ type: 'snake', destination: 10 });
  });

  it('returns ladder info for a ladder bottom', () => {
    expect(getSquareEntity(state, 5)).toEqual({ type: 'ladder', destination: 30 });
  });

  it('returns null for empty square', () => {
    expect(getSquareEntity(state, 25)).toBeNull();
  });
});

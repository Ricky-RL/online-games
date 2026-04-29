import { describe, it, expect } from 'vitest';
import { generateBoard } from './snakes-and-ladders-logic';

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

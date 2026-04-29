import { describe, it, expect } from 'vitest';
import { createInitialTower, calculateBlockRisk, pullBlock } from './jenga-logic';

describe('createInitialTower', () => {
  it('creates 18 rows of 3 blocks each', () => {
    const state = createInitialTower();
    expect(state.tower.length).toBe(18);
    for (const row of state.tower) {
      expect(row.length).toBe(3);
    }
  });

  it('all blocks exist initially', () => {
    const state = createInitialTower();
    for (const row of state.tower) {
      for (const block of row) {
        expect(block.exists).toBe(true);
      }
    }
  });

  it('block IDs are deterministic row-col format', () => {
    const state = createInitialTower();
    expect(state.tower[0][0].id).toBe('0-0');
    expect(state.tower[0][2].id).toBe('0-2');
    expect(state.tower[17][1].id).toBe('17-1');
  });

  it('wobble_score starts at 0', () => {
    const state = createInitialTower();
    expect(state.wobble_score).toBe(0);
  });

  it('move_history starts empty', () => {
    const state = createInitialTower();
    expect(state.move_history).toEqual([]);
  });
});

describe('calculateBlockRisk', () => {
  it('bottom row has higher base risk than top row', () => {
    const state = createInitialTower();
    const bottomRisk = calculateBlockRisk(state, 0, 1);
    const topRisk = calculateBlockRisk(state, 17, 1);
    expect(bottomRisk).toBeGreaterThan(topRisk);
  });

  it('edge blocks are riskier than middle blocks in same row', () => {
    const state = createInitialTower();
    const edgeRisk = calculateBlockRisk(state, 9, 0);
    const middleRisk = calculateBlockRisk(state, 9, 1);
    expect(edgeRisk).toBeGreaterThan(middleRisk);
  });

  it('blocks adjacent to gaps are riskier', () => {
    const state = createInitialTower();
    const riskBefore = calculateBlockRisk(state, 9, 0);
    state.tower[9][1].exists = false;
    const riskAfter = calculateBlockRisk(state, 9, 0);
    expect(riskAfter).toBeGreaterThan(riskBefore);
  });

  it('returns 0 for non-existent blocks', () => {
    const state = createInitialTower();
    state.tower[5][1].exists = false;
    expect(calculateBlockRisk(state, 5, 1)).toBe(0);
  });

  it('risk is between 0 and 100', () => {
    const state = createInitialTower();
    for (let row = 0; row < 18; row++) {
      for (let col = 0; col < 3; col++) {
        const risk = calculateBlockRisk(state, row, col);
        expect(risk).toBeGreaterThanOrEqual(0);
        expect(risk).toBeLessThanOrEqual(100);
      }
    }
  });
});

describe('pullBlock', () => {
  it('marks the pulled block as not existing', () => {
    const state = createInitialTower();
    const result = pullBlock(state, 10, 1, 1, 0.99);
    expect(result.tower[10][1].exists).toBe(false);
  });

  it('adds the block to a new top row when top row is full', () => {
    const state = createInitialTower();
    const result = pullBlock(state, 10, 1, 1, 0.99);
    expect(result.tower.length).toBe(19);
    const topRow = result.tower[18];
    const existingBlocks = topRow.filter(b => b.exists);
    expect(existingBlocks.length).toBe(1);
  });

  it('fills existing top row if it has space', () => {
    const state = createInitialTower();
    const after1 = pullBlock(state, 10, 0, 1, 0.99);
    expect(after1.tower.length).toBe(19);
    const after2 = pullBlock(after1, 10, 2, 2, 0.99);
    expect(after2.tower.length).toBe(19);
    const topRow = after2.tower[18];
    const existingBlocks = topRow.filter(b => b.exists);
    expect(existingBlocks.length).toBe(2);
  });

  it('creates a new row when top row has 3 blocks', () => {
    const state = createInitialTower();
    const after1 = pullBlock(state, 15, 0, 1, 0.99);
    const after2 = pullBlock(after1, 15, 1, 2, 0.99);
    const after3 = pullBlock(after2, 15, 2, 1, 0.99);
    const after4 = pullBlock(after3, 14, 0, 2, 0.99);
    expect(after4.tower.length).toBe(20);
  });

  it('increases wobble_score after a pull', () => {
    const state = createInitialTower();
    const result = pullBlock(state, 10, 1, 1, 0.99);
    expect(result.wobble_score).toBeGreaterThan(0);
  });

  it('records the move in move_history', () => {
    const state = createInitialTower();
    const result = pullBlock(state, 10, 1, 1, 0.99);
    expect(result.move_history.length).toBe(1);
    expect(result.move_history[0].row).toBe(10);
    expect(result.move_history[0].col).toBe(1);
    expect(result.move_history[0].player).toBe(1);
    expect(result.move_history[0].toppled).toBe(false);
  });

  it('topples when random value is below effective risk', () => {
    const state = createInitialTower();
    state.wobble_score = 95;
    const result = pullBlock(state, 0, 0, 1, 0.01);
    expect(result.move_history[result.move_history.length - 1].toppled).toBe(true);
  });

  it('does not topple when random value is above effective risk', () => {
    const state = createInitialTower();
    const result = pullBlock(state, 17, 1, 1, 0.99);
    expect(result.move_history[result.move_history.length - 1].toppled).toBe(false);
  });
});

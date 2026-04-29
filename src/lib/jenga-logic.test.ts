import { describe, it, expect } from 'vitest';
import { createInitialTower, calculateBlockRisk } from './jenga-logic';

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

import { describe, it, expect } from 'vitest';
import { createInitialTower } from './jenga-logic';

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

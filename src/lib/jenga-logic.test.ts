import { describe, it, expect } from 'vitest';
import {
  createInitialTower,
  calculateBlockRisk,
  pullBlock,
  getPlayableBlocks,
  getJengaGameStatus,
  generatePullPath,
  measureDragDeviation,
  computeEarlyReleaseDeviation,
  computeSkillModifier,
  computeCascadeEffects,
  getEarlyGameMultiplier,
  getMovePoints,
  getPlayerScores,
  getMinimumRiskThreshold,
  getPlayableBlocksAboveThreshold,
} from './jenga-logic';
import type { Point } from './types';

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

  it('cascade_risks initialized to zeros matching tower dimensions', () => {
    const state = createInitialTower();
    expect(state.cascade_risks).toBeDefined();
    expect(state.cascade_risks!.length).toBe(18);
    for (const row of state.cascade_risks!) {
      expect(row.length).toBe(3);
      for (const val of row) {
        expect(val).toBe(0);
      }
    }
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

  it('incorporates cascade_risks values', () => {
    const state = createInitialTower();
    const riskBefore = calculateBlockRisk(state, 9, 1);
    state.cascade_risks![9][1] = 20;
    const riskAfter = calculateBlockRisk(state, 9, 1);
    expect(riskAfter).toBe(riskBefore + 20);
  });

  it('no longer uses old gap bonus logic', () => {
    const state = createInitialTower();
    const riskBefore = calculateBlockRisk(state, 9, 0);
    // Remove adjacent block — in old code this would add +10 gap bonus
    state.tower[9][1].exists = false;
    const riskAfter = calculateBlockRisk(state, 9, 0);
    // Without cascade_risks being updated, risk should be unchanged
    expect(riskAfter).toBe(riskBefore);
  });

  it('handles undefined cascade_risks gracefully (backwards compat)', () => {
    const state = createInitialTower();
    state.cascade_risks = undefined;
    // Should not throw, should use 0 as default
    const risk = calculateBlockRisk(state, 9, 1);
    expect(risk).toBeGreaterThanOrEqual(0);
  });
});

describe('generatePullPath', () => {
  it('correct length for bottom third (rows 0-5): 120px path', () => {
    const path = generatePullPath(2, 0, 18);
    // The path has 120/2 = 60 points for a 120px path
    expect(path.length).toBe(60);
    // Compute arc length (sum of segment distances)
    let arcLength = 0;
    for (let i = 1; i < path.length; i++) {
      const dx = path[i].x - path[i - 1].x;
      const dy = path[i].y - path[i - 1].y;
      arcLength += Math.sqrt(dx * dx + dy * dy);
    }
    // Arc length should be close to 120px (slight curve adds a tiny bit)
    expect(arcLength).toBeGreaterThanOrEqual(118);
    expect(arcLength).toBeLessThanOrEqual(125);
  });

  it('correct length for middle third (rows 6-11): 90px path', () => {
    const path = generatePullPath(8, 1, 18);
    // 90/2 = 45 points
    expect(path.length).toBe(45);
    const lastPoint = path[path.length - 1];
    const pathLength = Math.sqrt(lastPoint.x * lastPoint.x + lastPoint.y * lastPoint.y);
    expect(pathLength).toBeCloseTo(90, 0);
  });

  it('correct length for top third (rows 12+): 60px path', () => {
    const path = generatePullPath(14, 1, 18);
    // 60/2 = 30 points
    expect(path.length).toBe(30);
    const lastPoint = path[path.length - 1];
    const pathLength = Math.sqrt(lastPoint.x * lastPoint.x + lastPoint.y * lastPoint.y);
    expect(pathLength).toBeCloseTo(60, 0);
  });

  it('even row col 0 goes left (negative x)', () => {
    const path = generatePullPath(0, 0, 18);
    const lastPoint = path[path.length - 1];
    expect(lastPoint.x).toBeLessThan(0);
  });

  it('even row col 2 goes right (positive x)', () => {
    const path = generatePullPath(0, 2, 18);
    const lastPoint = path[path.length - 1];
    expect(lastPoint.x).toBeGreaterThan(0);
  });

  it('odd row has primarily vertical path (positive y)', () => {
    const path = generatePullPath(1, 1, 18);
    const lastPoint = path[path.length - 1];
    expect(lastPoint.y).toBeGreaterThan(0);
    // Center col on odd row goes straight, so x should be ~0
    expect(Math.abs(lastPoint.x)).toBeLessThan(1);
  });

  it('odd row col 0 curves left (negative x peak)', () => {
    const path = generatePullPath(1, 0, 18);
    const hasNegativeX = path.some(p => p.x < -1);
    expect(hasNegativeX).toBe(true);
  });

  it('odd row col 2 curves right (positive x peak)', () => {
    const path = generatePullPath(1, 2, 18);
    const hasPositiveX = path.some(p => p.x > 1);
    expect(hasPositiveX).toBe(true);
  });

  it('samples at approximately 2px intervals', () => {
    const path = generatePullPath(0, 0, 18);
    // 120px path / 2px interval = ~60 points
    expect(path.length).toBe(60);
  });

  it('starts at origin (0,0)', () => {
    const path = generatePullPath(5, 1, 18);
    expect(path[0].x).toBe(0);
    expect(path[0].y).toBe(0);
  });
});

describe('measureDragDeviation', () => {
  it('perfect trace returns approximately 0', () => {
    const idealPath: Point[] = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 20, y: 0 },
      { x: 30, y: 0 },
    ];
    const playerTrace: Point[] = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 20, y: 0 },
      { x: 30, y: 0 },
    ];
    const deviation = measureDragDeviation(idealPath, playerTrace);
    expect(deviation).toBeCloseTo(0, 2);
  });

  it('offset trace returns proportional deviation', () => {
    const idealPath: Point[] = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 20, y: 0 },
      { x: 30, y: 0 },
    ];
    // 10px offset with 20px tolerance = 0.5 deviation
    const playerTrace: Point[] = [
      { x: 0, y: 10 },
      { x: 10, y: 10 },
      { x: 20, y: 10 },
      { x: 30, y: 10 },
    ];
    const deviation = measureDragDeviation(idealPath, playerTrace);
    expect(deviation).toBeCloseTo(0.5, 2);
  });

  it('garbage trace far from path returns 1.0', () => {
    const idealPath: Point[] = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 20, y: 0 },
    ];
    // Very far away (100px offset with 20px tolerance = 5, clamped to 1)
    const playerTrace: Point[] = [
      { x: 0, y: 100 },
      { x: 10, y: 100 },
      { x: 20, y: 100 },
    ];
    const deviation = measureDragDeviation(idealPath, playerTrace);
    expect(deviation).toBe(1.0);
  });

  it('empty trace returns 1.0', () => {
    const idealPath: Point[] = [{ x: 0, y: 0 }, { x: 10, y: 0 }];
    const deviation = measureDragDeviation(idealPath, []);
    expect(deviation).toBe(1.0);
  });

  it('empty ideal path returns 1.0', () => {
    const playerTrace: Point[] = [{ x: 0, y: 0 }, { x: 10, y: 0 }];
    const deviation = measureDragDeviation([], playerTrace);
    expect(deviation).toBe(1.0);
  });

  it('respects custom tolerance zone', () => {
    const idealPath: Point[] = [{ x: 0, y: 0 }, { x: 10, y: 0 }];
    const playerTrace: Point[] = [{ x: 0, y: 10 }, { x: 10, y: 10 }];
    // 10px offset with 40px tolerance = 0.25
    const deviation = measureDragDeviation(idealPath, playerTrace, 40);
    expect(deviation).toBeCloseTo(0.25, 2);
  });
});

describe('computeSkillModifier', () => {
  it('deviation 0 returns 0.15', () => {
    expect(computeSkillModifier(0)).toBeCloseTo(0.15, 5);
  });

  it('deviation 1 returns 1.3', () => {
    expect(computeSkillModifier(1)).toBeCloseTo(1.3, 5);
  });

  it('deviation 0.5 returns midpoint (0.725)', () => {
    expect(computeSkillModifier(0.5)).toBeCloseTo(0.725, 5);
  });

  it('is linear between 0 and 1', () => {
    const at025 = computeSkillModifier(0.25);
    const at075 = computeSkillModifier(0.75);
    // Should be 0.15 + 0.25*1.15 = 0.4375
    expect(at025).toBeCloseTo(0.4375, 5);
    // Should be 0.15 + 0.75*1.15 = 1.0125
    expect(at075).toBeCloseTo(1.0125, 5);
  });
});

describe('computeEarlyReleaseDeviation', () => {
  it('release at 90% with perfect trace = 0.07', () => {
    const result = computeEarlyReleaseDeviation(0.0, 0.9);
    expect(result).toBeCloseTo(0.07, 2);
  });

  it('release at 50% with perfect trace = 0.35', () => {
    const result = computeEarlyReleaseDeviation(0.0, 0.5);
    expect(result).toBeCloseTo(0.35, 2);
  });

  it('release at 20% with perfect trace = 0.56', () => {
    const result = computeEarlyReleaseDeviation(0.0, 0.2);
    expect(result).toBeCloseTo(0.56, 2);
  });

  it('full completion with perfect trace = 0', () => {
    const result = computeEarlyReleaseDeviation(0.0, 1.0);
    expect(result).toBeCloseTo(0.0, 5);
  });

  it('full completion with bad trace preserves measured deviation', () => {
    const result = computeEarlyReleaseDeviation(0.8, 1.0);
    expect(result).toBeCloseTo(0.8, 5);
  });

  it('zero completion always gives 0.7', () => {
    const result = computeEarlyReleaseDeviation(0.0, 0.0);
    expect(result).toBeCloseTo(0.7, 5);
  });
});

describe('computeCascadeEffects', () => {
  it('applies +15 to same-row neighbors that exist', () => {
    const state = createInitialTower();
    const effects = computeCascadeEffects(9, 1, state.tower); // middle block
    const sameRow = effects.filter(e => e.targetRow === 9);
    expect(sameRow.length).toBe(2);
    expect(sameRow.every(e => e.bonus === 15)).toBe(true);
  });

  it('applies +10 to row above', () => {
    const state = createInitialTower();
    const effects = computeCascadeEffects(9, 1, state.tower);
    const rowAbove = effects.filter(e => e.targetRow === 10);
    expect(rowAbove.length).toBe(3); // all 3 blocks exist in row 10
    expect(rowAbove.every(e => e.bonus === 10)).toBe(true);
  });

  it('applies +5 to row below', () => {
    const state = createInitialTower();
    const effects = computeCascadeEffects(9, 1, state.tower);
    const rowBelow = effects.filter(e => e.targetRow === 8);
    expect(rowBelow.length).toBe(3);
    expect(rowBelow.every(e => e.bonus === 5)).toBe(true);
  });

  it('does not target missing blocks', () => {
    const state = createInitialTower();
    state.tower[9][0].exists = false;
    state.tower[10][1].exists = false;
    const effects = computeCascadeEffects(9, 1, state.tower);
    // Same-row: only col 2 exists (col 0 removed)
    const sameRow = effects.filter(e => e.targetRow === 9);
    expect(sameRow.length).toBe(1);
    expect(sameRow[0].targetCol).toBe(2);
    // Row above: only cols 0 and 2 exist (col 1 removed)
    const rowAbove = effects.filter(e => e.targetRow === 10);
    expect(rowAbove.length).toBe(2);
  });

  it('edge block (col 0) only cascades to one same-row neighbor', () => {
    const state = createInitialTower();
    const effects = computeCascadeEffects(5, 0, state.tower);
    const sameRow = effects.filter(e => e.targetRow === 5);
    expect(sameRow.length).toBe(1);
    expect(sameRow[0].targetCol).toBe(1);
  });

  it('bottom row (row 0) has no row below effects', () => {
    const state = createInitialTower();
    const effects = computeCascadeEffects(0, 1, state.tower);
    const rowBelow = effects.filter(e => e.targetRow === -1);
    expect(rowBelow.length).toBe(0);
  });

  it('top row has no row above effects', () => {
    const state = createInitialTower();
    const effects = computeCascadeEffects(17, 1, state.tower);
    const rowAbove = effects.filter(e => e.targetRow === 18);
    expect(rowAbove.length).toBe(0);
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

  it('records the move in move_history', () => {
    const state = createInitialTower();
    const result = pullBlock(state, 10, 1, 1, 0.99);
    expect(result.move_history.length).toBe(1);
    expect(result.move_history[0].row).toBe(10);
    expect(result.move_history[0].col).toBe(1);
    expect(result.move_history[0].player).toBe(1);
    expect(result.move_history[0].toppled).toBe(false);
  });

  it('uses new skill-weighted topple formula', () => {
    const state = createInitialTower();
    // Perfect drag on a low-risk block should barely topple
    // Row 16, col 1 (center, near top) has very low base risk
    const result = pullBlock(state, 16, 1, 1, 0.99, 0.0);
    const move = result.move_history[0];
    // effectiveRisk should be min 5 (floor)
    expect(move.effectiveRisk).toBeGreaterThanOrEqual(5);
    expect(move.toppled).toBe(false);
  });

  it('terrible drag on moderate block produces high effective risk', () => {
    const state = createInitialTower();
    // Row 0 center has ~30 base risk, deviation 1.0 gives modifier 1.3
    // effectiveRisk = max(5, min(95, 30 * 1.3 + 0 * 0.3)) = 39
    const result = pullBlock(state, 0, 1, 1, 0.99, 1.0);
    const move = result.move_history[0];
    expect(move.effectiveRisk!).toBeGreaterThan(30);
  });

  it('backwards compat: no dragDeviation defaults to 0.5', () => {
    const state = createInitialTower();
    const result = pullBlock(state, 10, 1, 1, 0.99);
    const move = result.move_history[0];
    expect(move.dragDeviation).toBe(0.5);
    expect(move.effectiveRisk).toBeDefined();
  });

  it('records dragDeviation and effectiveRisk in move', () => {
    const state = createInitialTower();
    const result = pullBlock(state, 10, 1, 1, 0.99, 0.3);
    const move = result.move_history[0];
    expect(move.dragDeviation).toBe(0.3);
    expect(move.effectiveRisk).toBeGreaterThanOrEqual(5);
    expect(move.effectiveRisk).toBeLessThanOrEqual(95);
  });

  it('updates cascade_risks after pull', () => {
    const state = createInitialTower();
    const result = pullBlock(state, 9, 1, 1, 0.99, 0.5);
    // Same-row neighbors should get +15
    expect(result.cascade_risks![9][0]).toBe(15);
    expect(result.cascade_risks![9][2]).toBe(15);
    // Row above should get +10
    expect(result.cascade_risks![10][0]).toBe(10);
    expect(result.cascade_risks![10][1]).toBe(10);
    expect(result.cascade_risks![10][2]).toBe(10);
    // Row below should get +5
    expect(result.cascade_risks![8][0]).toBe(5);
    expect(result.cascade_risks![8][1]).toBe(5);
    expect(result.cascade_risks![8][2]).toBe(5);
  });

  it('cascade_risks accumulate across multiple pulls', () => {
    const state = createInitialTower();
    const after1 = pullBlock(state, 9, 0, 1, 0.99, 0.5);
    // Row 9 col 1 gets +15 from first pull
    expect(after1.cascade_risks![9][1]).toBe(15);
    const after2 = pullBlock(after1, 9, 2, 2, 0.99, 0.5);
    // Row 9 col 1 gets another +15 from second pull
    expect(after2.cascade_risks![9][1]).toBe(30);
  });

  it('topples when random value is below effective risk', () => {
    const state = createInitialTower();
    state.wobble_score = 95;
    // With wobble 95 and deviation 1.0, effective risk will be very high
    const result = pullBlock(state, 0, 0, 1, 0.01, 1.0);
    expect(result.move_history[result.move_history.length - 1].toppled).toBe(true);
  });

  it('does not topple when random value is above effective risk', () => {
    const state = createInitialTower();
    const result = pullBlock(state, 17, 1, 1, 0.99, 0.0);
    expect(result.move_history[result.move_history.length - 1].toppled).toBe(false);
  });

  it('effective risk has floor of 5', () => {
    const state = createInitialTower();
    // Near-top block with perfect drag and zero wobble
    const result = pullBlock(state, 16, 1, 1, 0.99, 0.0);
    expect(result.move_history[0].effectiveRisk).toBeGreaterThanOrEqual(5);
  });

  it('effective risk has cap of 95', () => {
    const state = createInitialTower();
    state.wobble_score = 100;
    state.cascade_risks![0][0] = 200; // very high cascade
    const result = pullBlock(state, 0, 0, 1, 0.99, 1.0);
    expect(result.move_history[0].effectiveRisk).toBeLessThanOrEqual(95);
  });

  it('wobble decreases by 3 on low-risk safe pull', () => {
    const state = createInitialTower();
    state.wobble_score = 10;
    // Row 16 col 1 is near top, low risk (baseRisk <= 10)
    const result = pullBlock(state, 16, 1, 1, 0.99, 0.0);
    expect(result.wobble_score).toBe(7);
  });
});

describe('getPlayableBlocks', () => {
  it('returns all blocks except top row on initial tower', () => {
    const state = createInitialTower();
    const playable = getPlayableBlocks(state);
    expect(playable.length).toBe(51);
  });

  it('does not include non-existent blocks', () => {
    const state = createInitialTower();
    state.tower[5][1].exists = false;
    const playable = getPlayableBlocks(state);
    const has5_1 = playable.some(([r, c]) => r === 5 && c === 1);
    expect(has5_1).toBe(false);
  });

  it('does not include blocks from the topmost row', () => {
    const state = createInitialTower();
    const playable = getPlayableBlocks(state);
    const hasTopRow = playable.some(([r]) => r === 17);
    expect(hasTopRow).toBe(false);
  });
});

describe('getJengaGameStatus', () => {
  it('returns waiting when player2 has not joined', () => {
    const status = getJengaGameStatus({ winner: null, player1_name: 'Ricky', player2_name: null });
    expect(status).toBe('waiting');
  });

  it('returns playing when both players joined and no winner', () => {
    const status = getJengaGameStatus({ winner: null, player1_name: 'Ricky', player2_name: 'Lilian' });
    expect(status).toBe('playing');
  });

  it('returns won when there is a winner', () => {
    const status = getJengaGameStatus({ winner: 1, player1_name: 'Ricky', player2_name: 'Lilian' });
    expect(status).toBe('won');
  });
});

describe('getEarlyGameMultiplier', () => {
  it('returns 3x for moves 0-3', () => {
    expect(getEarlyGameMultiplier(0)).toBe(3);
    expect(getEarlyGameMultiplier(1)).toBe(3);
    expect(getEarlyGameMultiplier(2)).toBe(3);
    expect(getEarlyGameMultiplier(3)).toBe(3);
  });

  it('returns 2x for moves 4-7', () => {
    expect(getEarlyGameMultiplier(4)).toBe(2);
    expect(getEarlyGameMultiplier(5)).toBe(2);
    expect(getEarlyGameMultiplier(7)).toBe(2);
  });

  it('returns 1.5x for moves 8-13', () => {
    expect(getEarlyGameMultiplier(8)).toBe(1.5);
    expect(getEarlyGameMultiplier(13)).toBe(1.5);
  });

  it('returns 1x for moves 14+', () => {
    expect(getEarlyGameMultiplier(14)).toBe(1);
    expect(getEarlyGameMultiplier(50)).toBe(1);
  });
});

describe('getMovePoints', () => {
  it('multiplies risk by early game multiplier', () => {
    // moveIndex 0 -> 3x
    expect(getMovePoints(20, 0)).toBe(60);
    // moveIndex 5 -> 2x
    expect(getMovePoints(20, 5)).toBe(40);
    // moveIndex 10 -> 1.5x
    expect(getMovePoints(20, 10)).toBe(30);
    // moveIndex 20 -> 1x
    expect(getMovePoints(20, 20)).toBe(20);
  });

  it('rounds to nearest integer', () => {
    // 15 * 1.5 = 22.5 -> 23
    expect(getMovePoints(15, 8)).toBe(23);
  });
});

describe('getPlayerScores', () => {
  it('returns 0 for both players with empty move history', () => {
    const state = createInitialTower();
    const scores = getPlayerScores(state);
    expect(scores.player1).toBe(0);
    expect(scores.player2).toBe(0);
  });

  it('assigns points to correct player', () => {
    const state = createInitialTower();
    // Simulate two successful moves
    const after1 = pullBlock(state, 10, 1, 1, 0.99, 0.5);
    const after2 = pullBlock(after1, 10, 0, 2, 0.99, 0.5);
    const scores = getPlayerScores(after2);
    expect(scores.player1).toBeGreaterThan(0);
    expect(scores.player2).toBeGreaterThan(0);
  });

  it('does not award points for toppled moves', () => {
    const state = createInitialTower();
    state.wobble_score = 95;
    // Force a topple with very low random value and bad drag
    const result = pullBlock(state, 0, 0, 1, 0.01, 1.0);
    expect(result.move_history[0].toppled).toBe(true);
    const scores = getPlayerScores(result);
    expect(scores.player1).toBe(0);
  });

  it('uses move.risk (baseRisk) for point calculation, not effectiveRisk', () => {
    const state = createInitialTower();
    // Pull a block with known base risk
    const baseRisk = calculateBlockRisk(state, 5, 1);
    const result = pullBlock(state, 5, 1, 1, 0.99, 0.0);
    const scores = getPlayerScores(result);
    // Move index 0 -> 3x multiplier
    expect(scores.player1).toBe(Math.round(baseRisk * 3));
  });
});

describe('getMinimumRiskThreshold', () => {
  it('starts at base value of 10 with oscillation', () => {
    const state = createInitialTower();
    // moveCount = 0, oscillation[0] = 0, growth = 0
    const threshold = getMinimumRiskThreshold(state);
    expect(threshold).toBe(10);
  });

  it('increases with more moves', () => {
    const state = createInitialTower();
    // Simulate 6 moves in history
    state.move_history = Array(6).fill({
      player: 1, row: 0, col: 0, risk: 10, wobble_after: 0, toppled: false,
    });
    const threshold = getMinimumRiskThreshold(state);
    // growth = floor(6/3) * 5 = 10, oscillation[6] = 7, base=10
    // threshold = min(60, max(5, 10 + 10 + 7)) = 27
    expect(threshold).toBe(27);
  });

  it('is capped at 60', () => {
    const state = createInitialTower();
    state.move_history = Array(100).fill({
      player: 1, row: 0, col: 0, risk: 10, wobble_after: 0, toppled: false,
    });
    const threshold = getMinimumRiskThreshold(state);
    expect(threshold).toBeLessThanOrEqual(60);
  });

  it('never goes below 5', () => {
    const state = createInitialTower();
    // moveCount = 2, oscillation[2] = -3, growth = 0
    state.move_history = Array(2).fill({
      player: 1, row: 0, col: 0, risk: 10, wobble_after: 0, toppled: false,
    });
    const threshold = getMinimumRiskThreshold(state);
    // base=10 + growth=0 + oscillation=-3 = 7, clamped to max(5, 7) = 7
    expect(threshold).toBeGreaterThanOrEqual(5);
  });
});

describe('getPlayableBlocksAboveThreshold', () => {
  it('filters blocks by risk threshold', () => {
    const state = createInitialTower();
    const threshold = 20;
    const blocks = getPlayableBlocksAboveThreshold(state, threshold);
    for (const [row, col] of blocks) {
      expect(calculateBlockRisk(state, row, col)).toBeGreaterThanOrEqual(threshold);
    }
  });

  it('returns all playable blocks when none meet threshold', () => {
    const state = createInitialTower();
    // Threshold so high no blocks qualify
    const blocks = getPlayableBlocksAboveThreshold(state, 999);
    const allPlayable = getPlayableBlocks(state);
    expect(blocks.length).toBe(allPlayable.length);
  });

  it('returns fewer blocks than total when threshold is met by some', () => {
    const state = createInitialTower();
    // Set a moderate threshold
    const allPlayable = getPlayableBlocks(state);
    const blocks = getPlayableBlocksAboveThreshold(state, 20);
    expect(blocks.length).toBeGreaterThan(0);
    expect(blocks.length).toBeLessThan(allPlayable.length);
  });
});

describe('pullBlock - wobble increase path', () => {
  it('wobble increases on high-risk pull (baseRisk > 10)', () => {
    const state = createInitialTower();
    state.wobble_score = 5;
    // Row 0, col 0 is bottom-edge — base risk is ~35
    const result = pullBlock(state, 0, 0, 1, 0.99, 0.5);
    expect(result.wobble_score).toBeGreaterThan(5);
  });

  it('wobble is capped at 100', () => {
    const state = createInitialTower();
    state.wobble_score = 99;
    const result = pullBlock(state, 0, 0, 1, 0.99, 0.5);
    expect(result.wobble_score).toBeLessThanOrEqual(100);
  });

  it('wobble never goes below 0', () => {
    const state = createInitialTower();
    state.wobble_score = 1;
    // Low-risk pull (top, center) should try to subtract 3 from wobble 1
    const result = pullBlock(state, 16, 1, 1, 0.99, 0.0);
    expect(result.wobble_score).toBe(0);
  });
});

describe('pullBlock - top row fill order', () => {
  it('fills center (index 1) first on a new top row', () => {
    const state = createInitialTower();
    const result = pullBlock(state, 10, 0, 1, 0.99, 0.5);
    // New row was created: tower[18]
    expect(result.tower.length).toBe(19);
    expect(result.tower[18][1].exists).toBe(true);
    expect(result.tower[18][0].exists).toBe(false);
    expect(result.tower[18][2].exists).toBe(false);
  });

  it('fills index 0 second when adding to partially full top row', () => {
    const state = createInitialTower();
    const after1 = pullBlock(state, 10, 0, 1, 0.99, 0.5);
    // Top row has center filled, now fill another
    const after2 = pullBlock(after1, 10, 1, 2, 0.99, 0.5);
    expect(after2.tower.length).toBe(19); // Still same row
    expect(after2.tower[18][0].exists).toBe(true); // Index 0 filled second
    expect(after2.tower[18][1].exists).toBe(true);
  });

  it('fills index 2 third, then creates new row on fourth pull', () => {
    const state = createInitialTower();
    const after1 = pullBlock(state, 15, 0, 1, 0.99, 0.5);
    const after2 = pullBlock(after1, 15, 1, 2, 0.99, 0.5);
    const after3 = pullBlock(after2, 15, 2, 1, 0.99, 0.5);
    expect(after3.tower.length).toBe(19);
    expect(after3.tower[18][2].exists).toBe(true); // index 2 filled third
    // All three full now — next pull creates row 19
    const after4 = pullBlock(after3, 14, 0, 2, 0.99, 0.5);
    expect(after4.tower.length).toBe(20);
  });
});

describe('pullBlock - cascade_risks expansion with new rows', () => {
  it('cascade_risks grows to match tower when new row is added', () => {
    const state = createInitialTower();
    const result = pullBlock(state, 10, 1, 1, 0.99, 0.5);
    // Tower grew from 18 to 19 rows
    expect(result.tower.length).toBe(19);
    expect(result.cascade_risks!.length).toBe(19);
    // New row cascade_risks initialized to 0
    expect(result.cascade_risks![18][0]).toBe(0);
    expect(result.cascade_risks![18][1]).toBe(0);
    expect(result.cascade_risks![18][2]).toBe(0);
  });
});

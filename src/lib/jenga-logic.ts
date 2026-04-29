import type { Player, JengaBlock, JengaMove, JengaGameState } from './types';

const INITIAL_ROWS = 18;
const BLOCKS_PER_ROW = 3;

export function createInitialTower(): JengaGameState {
  const tower: JengaBlock[][] = [];
  for (let row = 0; row < INITIAL_ROWS; row++) {
    const blocks: JengaBlock[] = [];
    for (let col = 0; col < BLOCKS_PER_ROW; col++) {
      blocks.push({ id: `${row}-${col}`, exists: true });
    }
    tower.push(blocks);
  }
  return { tower, wobble_score: 0, move_history: [] };
}

export function calculateBlockRisk(state: JengaGameState, row: number, col: number): number {
  const block = state.tower[row]?.[col];
  if (!block || !block.exists) return 0;

  const totalRows = state.tower.length;

  // Base risk: lower rows support more weight
  const positionRisk = (1 - row / totalRows) * 30;

  // Edge bonus: edge blocks are less stable
  const isEdge = col === 0 || col === BLOCKS_PER_ROW - 1;
  const edgeBonus = isEdge ? 5 : 0;

  // Gap bonus: adjacent empty slots increase risk
  let gapBonus = 0;
  const rowBlocks = state.tower[row];
  if (col > 0 && !rowBlocks[col - 1].exists) gapBonus += 10;
  if (col < BLOCKS_PER_ROW - 1 && !rowBlocks[col + 1].exists) gapBonus += 10;

  return Math.min(100, Math.round(positionRisk + edgeBonus + gapBonus));
}

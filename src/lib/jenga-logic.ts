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

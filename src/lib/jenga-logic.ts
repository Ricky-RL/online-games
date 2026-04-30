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

export function pullBlock(
  state: JengaGameState,
  row: number,
  col: number,
  player: Player,
  randomValue: number,
): JengaGameState {
  const tower = state.tower.map(r => r.map(b => ({ ...b })));

  // Remove the block from its position
  tower[row][col].exists = false;

  // Calculate risk and check topple
  const blockRisk = calculateBlockRisk(state, row, col);
  const effectiveRisk = Math.min(95, blockRisk + state.wobble_score);
  const toppled = randomValue * 100 < effectiveRisk;

  // Wobble: riskier pulls add more, but safe pulls let the tower settle
  const wobbleIncrease = blockRisk > 10 ? 2 + (blockRisk / 30) * 3 : -3;
  const newWobble = Math.max(0, Math.min(100, state.wobble_score + wobbleIncrease));

  // Place block on top (if not toppled)
  if (!toppled) {
    const topRow = tower[tower.length - 1];
    const existingCount = topRow.filter(b => b.exists).length;
    if (existingCount < BLOCKS_PER_ROW) {
      // Fill next empty slot in top row
      const emptyIdx = topRow.findIndex(b => !b.exists);
      topRow[emptyIdx] = { id: `${tower.length - 1}-${emptyIdx}`, exists: true };
    } else {
      // Create new row with one block
      const newRow: JengaBlock[] = [
        { id: `${tower.length}-0`, exists: true },
        { id: `${tower.length}-1`, exists: false },
        { id: `${tower.length}-2`, exists: false },
      ];
      tower.push(newRow);
    }
  }

  const move: JengaMove = {
    player,
    row,
    col,
    risk: effectiveRisk,
    wobble_after: newWobble,
    toppled,
  };

  return {
    tower,
    wobble_score: newWobble,
    move_history: [...state.move_history, move],
  };
}

export function getPlayableBlocks(state: JengaGameState): [number, number][] {
  const playable: [number, number][] = [];
  const topRowIdx = state.tower.length - 1;
  for (let row = 0; row < state.tower.length; row++) {
    if (row === topRowIdx) continue;
    for (let col = 0; col < BLOCKS_PER_ROW; col++) {
      if (state.tower[row][col].exists) {
        playable.push([row, col]);
      }
    }
  }
  return playable;
}

export function getJengaGameStatus(game: {
  winner: number | null;
  player1_name: string | null;
  player2_name: string | null;
}): 'waiting' | 'playing' | 'won' {
  if (game.winner !== null) return 'won';
  if (!game.player1_name || !game.player2_name) return 'waiting';
  return 'playing';
}

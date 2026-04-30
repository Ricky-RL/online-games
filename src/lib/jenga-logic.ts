import type { Player, JengaBlock, JengaMove, JengaGameState, Point } from './types';

const INITIAL_ROWS = 18;
const BLOCKS_PER_ROW = 3;

export function createInitialTower(): JengaGameState {
  const tower: JengaBlock[][] = [];
  const cascade_risks: number[][] = [];
  for (let row = 0; row < INITIAL_ROWS; row++) {
    const blocks: JengaBlock[] = [];
    const risks: number[] = [];
    for (let col = 0; col < BLOCKS_PER_ROW; col++) {
      blocks.push({ id: `${row}-${col}`, exists: true });
      risks.push(0);
    }
    tower.push(blocks);
    cascade_risks.push(risks);
  }
  return { tower, wobble_score: 0, move_history: [], cascade_risks };
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

  // Cascade risk from accumulated effects of previous pulls
  const cascadeBonus = state.cascade_risks?.[row]?.[col] ?? 0;

  return Math.min(100, Math.round(positionRisk + edgeBonus + cascadeBonus));
}

export function generatePullPath(row: number, col: number, totalRows: number): Point[] {
  // Determine path length by tower third
  let pathLength: number;
  if (row < 6) pathLength = 120;
  else if (row < 12) pathLength = 90;
  else pathLength = 60;

  const numPoints = Math.round(pathLength / 2);
  const points: Point[] = [];

  const isEvenRow = row % 2 === 0;

  if (isEvenRow) {
    // Wide rows: horizontal paths
    let dirX: number;
    if (col === 0) dirX = -1;
    else if (col === 2) dirX = 1;
    else dirX = col % 2 === 0 ? -1 : 1; // Use col for determinism on center block

    for (let i = 0; i < numPoints; i++) {
      const t = i / (numPoints - 1); // 0 to 1
      const x = dirX * t * pathLength;
      // Slight downward curve for edge blocks
      const curveFactor = col === 1 ? 0 : 0.15;
      const y = curveFactor * pathLength * Math.sin(t * Math.PI * 0.5);
      points.push({ x, y });
    }
  } else {
    // Odd rows: vertical paths (toward viewer)
    for (let i = 0; i < numPoints; i++) {
      const t = i / (numPoints - 1);
      const y = t * pathLength;
      // Curve direction based on col
      let curveFactor: number;
      if (col === 0) curveFactor = -0.15;
      else if (col === 2) curveFactor = 0.15;
      else curveFactor = 0;
      const x = curveFactor * pathLength * Math.sin(t * Math.PI);
      points.push({ x, y });
    }
  }

  return points;
}

export function measureDragDeviation(idealPath: Point[], playerTrace: Point[], toleranceZone: number = 20): number {
  if (playerTrace.length === 0) return 1.0;
  if (idealPath.length === 0) return 1.0;

  let totalNormalizedDistance = 0;

  for (const tracePoint of playerTrace) {
    let minDist = Infinity;
    for (const idealPoint of idealPath) {
      const dx = tracePoint.x - idealPoint.x;
      const dy = tracePoint.y - idealPoint.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDist) minDist = dist;
    }
    totalNormalizedDistance += minDist / toleranceZone;
  }

  const average = totalNormalizedDistance / playerTrace.length;
  return Math.min(1, Math.max(0, average));
}

export function computeEarlyReleaseDeviation(measuredDeviation: number, pathCompletionRatio: number): number {
  return measuredDeviation * pathCompletionRatio + 0.7 * (1 - pathCompletionRatio);
}

export function computeSkillModifier(dragDeviation: number): number {
  return 0.15 + (dragDeviation * 1.15);
}

export function computeCascadeEffects(row: number, col: number, tower: JengaBlock[][]): { targetRow: number; targetCol: number; bonus: number }[] {
  const effects: { targetRow: number; targetCol: number; bonus: number }[] = [];

  // Same-row neighbors: +15
  if (col > 0 && tower[row]?.[col - 1]?.exists) {
    effects.push({ targetRow: row, targetCol: col - 1, bonus: 15 });
  }
  if (col < BLOCKS_PER_ROW - 1 && tower[row]?.[col + 1]?.exists) {
    effects.push({ targetRow: row, targetCol: col + 1, bonus: 15 });
  }

  // Row above: +10
  if (row + 1 < tower.length) {
    for (let c = 0; c < BLOCKS_PER_ROW; c++) {
      if (tower[row + 1]?.[c]?.exists) {
        effects.push({ targetRow: row + 1, targetCol: c, bonus: 10 });
      }
    }
  }

  // Row below: +5
  if (row - 1 >= 0) {
    for (let c = 0; c < BLOCKS_PER_ROW; c++) {
      if (tower[row - 1]?.[c]?.exists) {
        effects.push({ targetRow: row - 1, targetCol: c, bonus: 5 });
      }
    }
  }

  return effects;
}

export function pullBlock(
  state: JengaGameState,
  row: number,
  col: number,
  player: Player,
  randomValue: number,
  dragDeviation?: number,
): JengaGameState {
  const tower = state.tower.map(r => r.map(b => ({ ...b })));

  // Default dragDeviation to 0.5 for backwards compatibility
  const deviation = dragDeviation ?? 0.5;

  // Calculate risk using new skill-weighted formula
  const baseRisk = calculateBlockRisk(state, row, col);
  const skillModifier = computeSkillModifier(deviation);
  const effectiveRisk = Math.min(95, Math.max(5, baseRisk * skillModifier + state.wobble_score * 0.3));
  const toppled = randomValue * 100 < effectiveRisk;

  // Remove the block from its position
  tower[row][col].exists = false;

  // Wobble: riskier pulls add more, but safe pulls let the tower settle
  const wobbleIncrease = baseRisk > 10 ? 2 + (baseRisk / 30) * 3 : -3;
  const newWobble = Math.max(0, Math.min(100, state.wobble_score + wobbleIncrease));

  // Place block on top (if not toppled)
  if (!toppled) {
    const topRow = tower[tower.length - 1];
    const existingCount = topRow.filter(b => b.exists).length;
    if (existingCount < BLOCKS_PER_ROW) {
      // Fill from center outward: 1, 0, 2
      const fillOrder = [1, 0, 2];
      const emptyIdx = fillOrder.find(i => !topRow[i].exists) ?? topRow.findIndex(b => !b.exists);
      topRow[emptyIdx] = { id: `${tower.length - 1}-${emptyIdx}`, exists: true };
    } else {
      // Create new row with one block in the center
      const newRow: JengaBlock[] = [
        { id: `${tower.length}-0`, exists: false },
        { id: `${tower.length}-1`, exists: true },
        { id: `${tower.length}-2`, exists: false },
      ];
      tower.push(newRow);
    }
  }

  // Compute cascade effects and update cascade_risks
  const cascadeEffects = computeCascadeEffects(row, col, state.tower);
  const newCascadeRisks: number[][] = tower.map((r, rIdx) =>
    r.map((_, cIdx) => {
      // Use state's cascade_risks as base (match original tower dimensions)
      if (rIdx < state.tower.length) {
        return state.cascade_risks?.[rIdx]?.[cIdx] ?? 0;
      }
      return 0;
    }),
  );
  for (const effect of cascadeEffects) {
    if (newCascadeRisks[effect.targetRow]?.[effect.targetCol] !== undefined) {
      newCascadeRisks[effect.targetRow][effect.targetCol] += effect.bonus;
    }
  }

  const move: JengaMove = {
    player,
    row,
    col,
    risk: baseRisk,
    dragDeviation: deviation,
    effectiveRisk,
    wobble_after: newWobble,
    toppled,
  };

  return {
    tower,
    wobble_score: newWobble,
    move_history: [...state.move_history, move],
    cascade_risks: newCascadeRisks,
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

export function getEarlyGameMultiplier(moveIndex: number): number {
  if (moveIndex < 4) return 3;
  if (moveIndex < 8) return 2;
  if (moveIndex < 14) return 1.5;
  return 1;
}

export function getMovePoints(risk: number, moveIndex: number): number {
  return Math.round(risk * getEarlyGameMultiplier(moveIndex));
}

export function getPlayerScores(state: JengaGameState): { player1: number; player2: number } {
  let player1 = 0;
  let player2 = 0;
  for (let i = 0; i < state.move_history.length; i++) {
    const move = state.move_history[i];
    if (!move.toppled) {
      const pts = getMovePoints(move.risk, i);
      if (move.player === 1) player1 += pts;
      else player2 += pts;
    }
  }
  return { player1, player2 };
}

const THRESHOLD_PATTERN = [0, 5, -3, 8, 2, -2, 7, 3, -1, 6];

export function getMinimumRiskThreshold(state: JengaGameState): number {
  const moveCount = state.move_history.length;
  const base = 10;
  const growth = Math.floor(moveCount / 3) * 5;
  const oscillation = THRESHOLD_PATTERN[moveCount % THRESHOLD_PATTERN.length];
  return Math.min(60, Math.max(5, base + growth + oscillation));
}

export function getPlayableBlocksAboveThreshold(
  state: JengaGameState,
  threshold: number,
): [number, number][] {
  const allPlayable = getPlayableBlocks(state);
  const filtered = allPlayable.filter(([row, col]) => {
    return calculateBlockRisk(state, row, col) >= threshold;
  });
  return filtered.length > 0 ? filtered : allPlayable;
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

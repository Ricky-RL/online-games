import type {
  Player,
  Cup,
  CupPosition,
  CupPongBoardState,
  ThrowVector,
  ThrowResult,
  TurnThrow,
} from './cup-pong-types';

// Table coordinate space is normalized 0-1 in both dimensions.
// Player 1 throws from y=0 toward y=1 (targeting player2's cups near y=0.85)
// Player 2 throws from y=1 toward y=0 (targeting player1's cups near y=0.15)

// Cup radius for hit detection (in normalized coords)
const CUP_RADIUS = 0.04;

// Ball trajectory spread — how much lateral deviation power introduces
const POWER_RANGE_MIN = 0.6;
const POWER_RANGE_MAX = 1.0;

// Hit probability modifier: at ideal power (0.5-0.7), higher accuracy
// Too soft: ball doesn't reach. Too hard: ball overshoots.
const IDEAL_POWER_LOW = 0.45;
const IDEAL_POWER_HIGH = 0.75;

/**
 * Generate the 10-cup triangle formation positions.
 * Triangle has 4 rows: 1, 2, 3, 4 cups (front to back).
 * Returns positions in normalized 0-1 space.
 * `centerY` is the center row of the triangle, `direction` is 1 (facing up) or -1 (facing down).
 */
function generateTrianglePositions(centerX: number, centerY: number, facingUp: boolean): CupPosition[] {
  const positions: CupPosition[] = [];
  const rowSpacing = 0.055;
  const cupSpacing = 0.06;
  const rows = [1, 2, 3, 4]; // front to back: 1 cup, 2 cups, 3 cups, 4 cups

  const direction = facingUp ? -1 : 1; // -1 means rows go upward (toward y=0)

  let rowOffset = 0;
  for (const numCups of rows) {
    const y = centerY + direction * rowOffset;
    const startX = centerX - (cupSpacing * (numCups - 1)) / 2;

    for (let i = 0; i < numCups; i++) {
      positions.push({
        x: startX + i * cupSpacing,
        y,
      });
    }

    rowOffset += rowSpacing;
  }

  return positions;
}

/**
 * Create the initial board state with 10 cups per side in triangle formation.
 */
export function createInitialBoard(): CupPongBoardState {
  // Player 1's cups are near y=0.15 (player 1 defends this end)
  const p1Positions = generateTrianglePositions(0.5, 0.15, false);
  const player1Cups: Cup[] = p1Positions.map((pos, i) => ({
    id: i,
    position: pos,
    standing: true,
  }));

  // Player 2's cups are near y=0.85 (player 2 defends this end)
  const p2Positions = generateTrianglePositions(0.5, 0.85, true);
  const player2Cups: Cup[] = p2Positions.map((pos, i) => ({
    id: i,
    position: pos,
    standing: true,
  }));

  return {
    player1Cups,
    player2Cups,
    throwsRemaining: 2,
    lastTurnThrows: [],
    pendingThrow: null,
  };
}

/**
 * Simulate a throw and determine if it hits a cup.
 *
 * Physics model:
 * - Ball travels from the thrower's end toward the opponent's cups.
 * - The throwVector.dx determines lateral aim (0 = center, -1/+1 = edges).
 * - Power determines reach and accuracy. Ideal power range gives best accuracy.
 * - A slight random perturbation simulates real-world inconsistency.
 *
 * @param targetCups - The opponent's cups to check for hits
 * @param throwVector - Direction of the throw
 * @param power - Throw power (0-1)
 * @param throwingFrom - Which end the player throws from ('bottom' for P1, 'top' for P2)
 * @returns ThrowResult indicating hit/miss and which cup
 */
export function simulateThrow(
  targetCups: Cup[],
  throwVector: ThrowVector,
  power: number,
  throwingFrom: 'bottom' | 'top'
): ThrowResult {
  // Clamp power
  const clampedPower = Math.max(0, Math.min(1, power));

  // Determine landing position
  // Base lateral position from direction vector
  const lateralAim = 0.5 + throwVector.dx * 0.4; // Map dx to 0.1-0.9 range

  // Power affects how far the ball travels (and introduces variance)
  const powerFactor = clampedPower >= IDEAL_POWER_LOW && clampedPower <= IDEAL_POWER_HIGH
    ? 1.0
    : 1.0 - Math.abs(clampedPower - 0.6) * 0.4;

  // Apply some deterministic spread based on power (not random, for reproducibility in tests)
  // In practice the frontend adds a small random seed to the throw vector before calling this
  const lateralSpread = (1.0 - powerFactor) * throwVector.dx * 0.1;
  const landingX = lateralAim + lateralSpread;

  // Y position where ball lands (depends on power and throwing direction)
  // Under-powered throws land short, over-powered go long
  const reachFactor = clampedPower >= POWER_RANGE_MIN && clampedPower <= POWER_RANGE_MAX
    ? 1.0
    : clampedPower < POWER_RANGE_MIN
      ? clampedPower / POWER_RANGE_MIN
      : 1.0 + (clampedPower - POWER_RANGE_MAX) * 0.3;

  let landingY: number;
  if (throwingFrom === 'bottom') {
    // Player 1 throws toward y=0.85 area
    landingY = 0.15 + reachFactor * 0.7;
  } else {
    // Player 2 throws toward y=0.15 area
    landingY = 0.85 - reachFactor * 0.7;
  }

  // Check if landing position is close enough to hit any standing cup
  const standingCups = targetCups.filter((cup) => cup.standing);

  let closestCup: Cup | null = null;
  let closestDistance = Infinity;

  for (const cup of standingCups) {
    const dx = landingX - cup.position.x;
    const dy = landingY - cup.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < closestDistance) {
      closestDistance = distance;
      closestCup = cup;
    }
  }

  // Hit detection: ball must land within cup radius
  const hitRadius = CUP_RADIUS * (powerFactor * 0.5 + 0.75); // Better power = slightly larger effective radius
  const hit = closestCup !== null && closestDistance <= hitRadius;

  return {
    hit,
    cupId: hit && closestCup ? closestCup.id : null,
    throwVector,
    power: clampedPower,
  };
}

/**
 * Apply a throw result to the board state.
 * Removes the hit cup and decrements throws remaining.
 */
export function applyThrow(
  board: CupPongBoardState,
  player: Player,
  throwResult: ThrowResult
): CupPongBoardState {
  const turnThrow: TurnThrow = { player, throwResult };

  // Determine which cups to update (player targets opponent's cups)
  const targetKey = player === 1 ? 'player2Cups' : 'player1Cups';
  let updatedCups = board[targetKey];

  if (throwResult.hit && throwResult.cupId !== null) {
    updatedCups = updatedCups.map((cup) =>
      cup.id === throwResult.cupId ? { ...cup, standing: false } : cup
    );
  }

  const newThrowsRemaining = (board.throwsRemaining - 1) as 0 | 1 | 2;

  return {
    ...board,
    [targetKey]: updatedCups,
    throwsRemaining: newThrowsRemaining,
    lastTurnThrows: [...board.lastTurnThrows, turnThrow],
    pendingThrow: null,
  };
}

/**
 * Determine what happens next after a throw.
 * Returns the next state: continue turn (throws remaining > 0) or switch turns.
 */
export function getNextState(board: CupPongBoardState): {
  turnOver: boolean;
  nextTurn: Player;
  currentTurn: Player;
} {
  // Infer current turn from last throw
  const lastThrow = board.lastTurnThrows[board.lastTurnThrows.length - 1];
  const currentTurn: Player = lastThrow ? lastThrow.player : 1;

  if (board.throwsRemaining > 0) {
    return { turnOver: false, nextTurn: currentTurn, currentTurn };
  }

  // Turn is over, switch to other player and reset throws
  const nextTurn: Player = currentTurn === 1 ? 2 : 1;
  return { turnOver: true, nextTurn, currentTurn };
}

/**
 * Check if a player has won (eliminated all opponent cups).
 */
export function checkWinner(board: CupPongBoardState): Player | null {
  const p2CupsStanding = board.player2Cups.filter((c) => c.standing).length;
  const p1CupsStanding = board.player1Cups.filter((c) => c.standing).length;

  if (p2CupsStanding === 0) return 1; // Player 1 eliminated all of Player 2's cups
  if (p1CupsStanding === 0) return 2; // Player 2 eliminated all of Player 1's cups
  return null;
}

/**
 * Get the count of standing cups for a player.
 */
export function getCupsRemaining(board: CupPongBoardState, player: Player): number {
  const cups = player === 1 ? board.player1Cups : board.player2Cups;
  return cups.filter((c) => c.standing).length;
}

/**
 * Get total number of throws made (for stale-state comparison in polling).
 */
export function totalThrows(board: CupPongBoardState): number {
  return board.lastTurnThrows.length;
}

/**
 * Prepare board for next turn: reset throwsRemaining and clear lastTurnThrows for the new turn.
 */
export function prepareBoardForNextTurn(board: CupPongBoardState): CupPongBoardState {
  return {
    ...board,
    throwsRemaining: 2,
    lastTurnThrows: [],
    pendingThrow: null,
  };
}

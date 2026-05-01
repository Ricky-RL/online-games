export interface ReactionTarget {
  x: number;  // 20-80 (percentage of play area)
  y: number;  // 20-80
}

export interface ReactionBoardState {
  targets: ReactionTarget[];        // length 6
  delays: number[];                 // length 6, 1000-4000ms each
  player1Times: [number | null, number | null, number | null];
  player2Times: [number | null, number | null, number | null];
  phase: 'p1_playing' | 'p1_done' | 'p2_playing' | 'complete';
  activeRound: number;              // 0, 1, or 2
}

export const MAX_REACTION_TIME_MS = 10000;
export const ROUNDS_PER_PLAYER = 3;

function randomInRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function createReactionBoard(): ReactionBoardState {
  const targets: ReactionTarget[] = [];
  for (let i = 0; i < 6; i++) {
    targets.push({
      x: randomInRange(20, 80),
      y: randomInRange(20, 80),
    });
  }

  const delays: number[] = [];
  for (let i = 0; i < 6; i++) {
    delays.push(randomInRange(1000, 4000));
  }

  return {
    targets,
    delays,
    player1Times: [null, null, null],
    player2Times: [null, null, null],
    phase: 'p1_playing',
    activeRound: 0,
  };
}

export function recordRoundResult(
  board: ReactionBoardState,
  player: 1 | 2,
  round: number,
  timeMs: number
): ReactionBoardState {
  // Validate correct player for current phase
  if (player === 1 && board.phase !== 'p1_playing') {
    throw new Error('Not player 1\'s turn');
  }
  if (player === 2 && board.phase !== 'p2_playing') {
    throw new Error('Not player 2\'s turn');
  }

  // Validate correct round number
  if (round !== board.activeRound) {
    throw new Error(`Expected round ${board.activeRound}, got ${round}`);
  }

  // Clamp timeMs to MAX_REACTION_TIME_MS
  const clampedTime = Math.min(timeMs, MAX_REACTION_TIME_MS);

  // Create new state
  const newState: ReactionBoardState = {
    ...board,
    player1Times: [...board.player1Times] as [number | null, number | null, number | null],
    player2Times: [...board.player2Times] as [number | null, number | null, number | null],
  };

  // Set result
  if (player === 1) {
    newState.player1Times[round] = clampedTime;
  } else {
    newState.player2Times[round] = clampedTime;
  }

  // Advance state
  if (round === 2) {
    // Final round for this player
    if (player === 1) {
      newState.phase = 'p1_done';
      newState.activeRound = 0;
    } else {
      newState.phase = 'complete';
      newState.activeRound = 0;
    }
  } else {
    newState.activeRound = round + 1;
  }

  return newState;
}

export function getActiveTargetIndex(board: ReactionBoardState): number {
  if (board.phase === 'p1_playing') {
    return board.activeRound; // 0-2
  }
  if (board.phase === 'p2_playing') {
    return board.activeRound + 3; // 3-5
  }
  return -1;
}

export function getAverageTime(times: [number | null, number | null, number | null]): number | null {
  const validTimes = times.filter((t): t is number => t !== null);
  if (validTimes.length === 0) return null;
  return validTimes.reduce((sum, t) => sum + t, 0) / validTimes.length;
}

export function computeWinner(board: ReactionBoardState): 1 | 2 | null {
  const avg1 = getAverageTime(board.player1Times);
  const avg2 = getAverageTime(board.player2Times);

  if (avg1 === null || avg2 === null) return null;
  if (avg1 < avg2) return 1;
  if (avg2 < avg1) return 2;
  return null; // draw
}

export function isGameComplete(board: ReactionBoardState): boolean {
  return board.phase === 'complete';
}

export function isDraw(board: ReactionBoardState): boolean {
  const avg1 = getAverageTime(board.player1Times);
  const avg2 = getAverageTime(board.player2Times);
  if (avg1 === null || avg2 === null) return false;
  return avg1 === avg2;
}

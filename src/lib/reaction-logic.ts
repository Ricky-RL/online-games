export interface ReactionBoardState {
  player1Score: number | null;
  player2Score: number | null;
  phase: 'p1_playing' | 'p1_done' | 'p2_playing' | 'complete';
}

export const GAME_DURATION_MS = 10000;
export const INITIAL_SPAWN_INTERVAL_MS = 1200;
export const MIN_SPAWN_INTERVAL_MS = 300;
export const ACCELERATION_FACTOR = 0.92;

export function createReactionBoard(): ReactionBoardState {
  return {
    player1Score: null,
    player2Score: null,
    phase: 'p1_playing',
  };
}

export function recordPlayerScore(
  board: ReactionBoardState,
  player: 1 | 2,
  score: number
): ReactionBoardState {
  if (player === 1 && board.phase !== 'p1_playing') {
    throw new Error('Not player 1\'s turn');
  }
  if (player === 2 && board.phase !== 'p2_playing') {
    throw new Error('Not player 2\'s turn');
  }

  const newState: ReactionBoardState = { ...board };

  if (player === 1) {
    newState.player1Score = score;
    newState.phase = 'p1_done';
  } else {
    newState.player2Score = score;
    newState.phase = 'complete';
  }

  return newState;
}

export function computeWinner(board: ReactionBoardState): 1 | 2 | null {
  if (board.player1Score === null || board.player2Score === null) return null;
  if (board.player1Score > board.player2Score) return 1;
  if (board.player2Score > board.player1Score) return 2;
  return null;
}

export function isGameComplete(board: ReactionBoardState): boolean {
  return board.phase === 'complete';
}

export function isDraw(board: ReactionBoardState): boolean {
  if (board.player1Score === null || board.player2Score === null) return false;
  return board.player1Score === board.player2Score;
}

export function getNextSpawnInterval(currentInterval: number): number {
  return Math.max(MIN_SPAWN_INTERVAL_MS, currentInterval * ACCELERATION_FACTOR);
}

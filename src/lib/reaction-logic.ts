export interface ReactionBoardState {
  player1Score: number | null;
  player2Score: number | null;
  phase: 'p1_playing' | 'p1_done' | 'p2_playing' | 'complete';
}

export const GAME_DURATION_MS = 10000;
/** Minimum delay (ms) before next circle spawns after a tap */
export const RESPAWN_DELAY_MIN_MS = 100;
/** Maximum delay (ms) before next circle spawns after a tap */
export const RESPAWN_DELAY_MAX_MS = 500;
/** How long a circle stays before disappearing if not tapped (ms) */
export const CIRCLE_LIFETIME_MS = 2000;

/** Get a random respawn delay between min and max */
export function getRandomRespawnDelay(): number {
  return Math.floor(Math.random() * (RESPAWN_DELAY_MAX_MS - RESPAWN_DELAY_MIN_MS + 1)) + RESPAWN_DELAY_MIN_MS;
}

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

export function getRandomPosition(): { x: number; y: number } {
  return {
    x: Math.floor(Math.random() * 60) + 20,
    y: Math.floor(Math.random() * 60) + 20,
  };
}

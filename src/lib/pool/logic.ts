import { Player } from '../types';
import { PoolBoard, ShotResult, BallState, BallGroup, isSolid, isStripe, isEightBall } from './types';

export function getPlayerGroup(board: PoolBoard, player: Player): BallGroup {
  return player === 1 ? board.player1Group : board.player2Group;
}

export function hasPlayerClearedGroup(balls: BallState[], group: BallGroup): boolean {
  if (!group) return false;
  const groupBalls = balls.filter((b) =>
    group === 'solids' ? isSolid(b.id) : isStripe(b.id)
  );
  return groupBalls.every((b) => b.pocketed);
}

export function determineShotResult(
  board: PoolBoard,
  currentPlayer: Player,
  pocketedBalls: number[]
): ShotResult {
  const scratch = pocketedBalls.includes(0);
  const playerGroup = getPlayerGroup(board, currentPlayer);

  // If cue ball pocketed, it's a foul
  if (scratch) {
    return {
      pocketedBalls,
      scratch: true,
      foul: true,
      turnContinues: false,
      groupAssigned: false,
    };
  }

  // No balls pocketed (other than possibly cue) - turn ends
  const objectBallsPocketed = pocketedBalls.filter((id) => id !== 0);
  if (objectBallsPocketed.length === 0) {
    return {
      pocketedBalls,
      scratch: false,
      foul: false,
      turnContinues: false,
      groupAssigned: false,
    };
  }

  // Groups not yet assigned - assign based on first pocket
  if (!playerGroup) {
    // 8-ball pocketed on non-break with no group = foul (lose turn)
    if (objectBallsPocketed.includes(8)) {
      return {
        pocketedBalls,
        scratch: false,
        foul: true,
        turnContinues: false,
        groupAssigned: false,
      };
    }

    return {
      pocketedBalls,
      scratch: false,
      foul: false,
      turnContinues: true,
      groupAssigned: true,
    };
  }

  // 8-ball pocketed
  if (objectBallsPocketed.includes(8)) {
    // This is handled by getWinner - always ends the game
    return {
      pocketedBalls,
      scratch: false,
      foul: false,
      turnContinues: false,
      groupAssigned: false,
    };
  }

  // Check if player pocketed their own ball
  const ownBalls = objectBallsPocketed.filter((id) =>
    playerGroup === 'solids' ? isSolid(id) : isStripe(id)
  );

  if (ownBalls.length > 0) {
    return {
      pocketedBalls,
      scratch: false,
      foul: false,
      turnContinues: true,
      groupAssigned: false,
    };
  }

  // Pocketed only opponent's balls - turn ends (no foul in simplified rules)
  return {
    pocketedBalls,
    scratch: false,
    foul: false,
    turnContinues: false,
    groupAssigned: false,
  };
}

export function assignGroups(
  board: PoolBoard,
  currentPlayer: Player,
  firstPocketedBallId: number
): { player1Group: BallGroup; player2Group: BallGroup } {
  const assignedGroup: BallGroup = isSolid(firstPocketedBallId) ? 'solids' : 'stripes';
  const otherGroup: BallGroup = assignedGroup === 'solids' ? 'stripes' : 'solids';

  if (currentPlayer === 1) {
    return { player1Group: assignedGroup, player2Group: otherGroup };
  } else {
    return { player1Group: otherGroup, player2Group: assignedGroup };
  }
}

export function isGameOver(balls: BallState[]): boolean {
  const eightBall = balls.find((b) => b.id === 8);
  return eightBall?.pocketed === true;
}

export function getWinner(
  board: PoolBoard,
  shootingPlayer: Player,
  pocketedThisShot: number[]
): Player | null {
  if (!pocketedThisShot.includes(8)) return null;

  const playerGroup = getPlayerGroup(board, shootingPlayer);

  // If no group assigned and 8-ball pocketed, shooter loses
  if (!playerGroup) {
    return shootingPlayer === 1 ? 2 : 1;
  }

  // Check if shooter cleared their group BEFORE pocketing 8-ball
  const prePocketBalls = board.balls.map((b) =>
    pocketedThisShot.includes(b.id) ? { ...b, pocketed: true } : b
  );

  const cleared = hasPlayerClearedGroup(prePocketBalls, playerGroup);

  if (cleared) {
    return shootingPlayer; // Legal win
  } else {
    return shootingPlayer === 1 ? 2 : 1; // Early 8-ball = lose
  }
}

export function createInitialBoard(balls: BallState[]): PoolBoard {
  return {
    balls,
    player1Group: null,
    player2Group: null,
    lastShot: null,
    lastShotResult: null,
    phase: 'playing',
    version: 0,
    shotHistory: [],
  };
}

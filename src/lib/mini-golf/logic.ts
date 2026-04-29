import { Player } from '../types';
import { MiniGolfBoard, GameScores, HoleScore, PENALTY_SCORE } from './types';

export function playerIndex(player: Player): number {
  return player - 1;
}

export function createInitialBoard(
  easyLevels: number[],
  mediumLevels: number[],
  hardLevels: number[]
): MiniGolfBoard {
  const pick = (arr: number[]) => arr[Math.floor(Math.random() * arr.length)];
  return {
    levels: [pick(easyLevels), pick(mediumLevels), pick(hardLevels)],
    currentHole: 0,
    scores: [[null, null], [null, null], [null, null]],
    currentStroke: 0,
    lastShot: null,
    ready: [false, false],
    phase: 'aiming',
    version: 1,
  };
}

export function recordScore(
  board: MiniGolfBoard,
  hole: number,
  player: Player,
  strokes: number
): MiniGolfBoard {
  const scores = board.scores.map((h, i) =>
    i === hole
      ? h.map((s, j) => (j === playerIndex(player) ? strokes : s)) as [HoleScore, HoleScore]
      : h
  ) as GameScores;
  return { ...board, scores };
}

export function isHoleComplete(board: MiniGolfBoard, hole: number): boolean {
  return board.scores[hole][0] !== null && board.scores[hole][1] !== null;
}

export function isGameComplete(board: MiniGolfBoard): boolean {
  return board.scores.every(([p1, p2]) => p1 !== null && p2 !== null);
}

export function getTotalStrokes(scores: GameScores, player: Player): number {
  const idx = playerIndex(player);
  return scores.reduce((sum, hole) => {
    const s = hole[idx];
    return s !== null ? sum + s : sum;
  }, 0);
}

export function getWinner(board: MiniGolfBoard): Player | null {
  const p1Total = getTotalStrokes(board.scores, 1);
  const p2Total = getTotalStrokes(board.scores, 2);

  if (p1Total < p2Total) return 1;
  if (p2Total < p1Total) return 2;

  const p1Best = Math.min(...board.scores.map(h => h[0]!));
  const p2Best = Math.min(...board.scores.map(h => h[1]!));

  if (p1Best < p2Best) return 1;
  if (p2Best < p1Best) return 2;

  return null;
}

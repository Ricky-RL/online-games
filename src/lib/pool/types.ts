import { Player } from '../types';

export interface Point {
  x: number;
  y: number;
}

export interface BallState {
  id: number; // 0 = cue ball, 1-15 = object balls
  x: number;
  y: number;
  vx: number;
  vy: number;
  pocketed: boolean;
}

export type BallGroup = 'solids' | 'stripes' | null;

export interface Shot {
  angle: number;
  power: number;
  cueBallX: number;
  cueBallY: number;
}

export type GamePhase = 'playing' | 'ball-in-hand' | 'finished';

export interface PoolBoard {
  balls: BallState[];
  player1Group: BallGroup; // null until first legal pocket after break
  player2Group: BallGroup;
  lastShot: Shot | null;
  lastShotResult: ShotResult | null;
  phase: GamePhase;
  version: number;
  shotHistory: Shot[]; // all shots taken this game
}

export interface ShotResult {
  pocketedBalls: number[]; // ball IDs pocketed this shot
  scratch: boolean; // cue ball pocketed
  foul: boolean; // any foul occurred
  turnContinues: boolean; // player pocketed a legal ball
  groupAssigned: boolean; // groups were assigned this shot
}

export interface PoolGame {
  id: string;
  game_type: 'pool';
  board: PoolBoard;
  current_turn: Player;
  winner: Player | null;
  player1_id: string | null;
  player2_id: string | null;
  player1_name: string | null;
  player2_name: string | null;
  created_at: string;
  updated_at: string;
}

// Table dimensions (in canvas units) — portrait orientation for mobile
export const TABLE_WIDTH = 200;
export const TABLE_HEIGHT = 400;
export const BALL_RADIUS = 7;
export const POCKET_RADIUS = 14;
export const CUSHION_WIDTH = 12;

// Physics constants
export const MAX_POWER = 100;
export const BASE_SPEED = 16;
export const FRICTION_RATE = 0.015;
export const MIN_SPEED = 0.15;
export const COLLISION_DAMPING = 0.98;

// Pocket positions (6 pockets)
export const POCKETS: Point[] = [
  { x: CUSHION_WIDTH, y: CUSHION_WIDTH }, // top-left
  { x: TABLE_WIDTH / 2, y: CUSHION_WIDTH - 2 }, // top-center
  { x: TABLE_WIDTH - CUSHION_WIDTH, y: CUSHION_WIDTH }, // top-right
  { x: CUSHION_WIDTH, y: TABLE_HEIGHT - CUSHION_WIDTH }, // bottom-left
  { x: TABLE_WIDTH / 2, y: TABLE_HEIGHT - CUSHION_WIDTH + 2 }, // bottom-center
  { x: TABLE_WIDTH - CUSHION_WIDTH, y: TABLE_HEIGHT - CUSHION_WIDTH }, // bottom-right
];

// Ball colors for rendering
export const BALL_COLORS: Record<number, string> = {
  0: '#FFFFFF', // cue ball
  1: '#FFD700', // solid yellow
  2: '#0000FF', // solid blue
  3: '#FF0000', // solid red
  4: '#800080', // solid purple
  5: '#FF8C00', // solid orange
  6: '#006400', // solid green
  7: '#8B0000', // solid maroon
  8: '#000000', // 8-ball
  9: '#FFD700', // stripe yellow
  10: '#0000FF', // stripe blue
  11: '#FF0000', // stripe red
  12: '#800080', // stripe purple
  13: '#FF8C00', // stripe orange
  14: '#006400', // stripe green
  15: '#8B0000', // stripe maroon
};

export function isSolid(ballId: number): boolean {
  return ballId >= 1 && ballId <= 7;
}

export function isStripe(ballId: number): boolean {
  return ballId >= 9 && ballId <= 15;
}

export function isEightBall(ballId: number): boolean {
  return ballId === 8;
}

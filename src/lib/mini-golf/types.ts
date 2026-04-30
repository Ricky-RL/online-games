import { Player } from '../types';

export interface Point {
  x: number;
  y: number;
}

export interface LineSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface Bumper {
  x: number;
  y: number;
  radius: number;
}

export interface PolygonZone {
  points: Point[];
}

export interface Portal {
  in: Point;
  out: Point;
}

export interface MovingWall {
  start: LineSegment;
  end: LineSegment;
  speed: number;
}

export interface Level {
  id: number;
  name: string;
  tier: 'easy' | 'medium' | 'hard';
  par: number;
  start: Point;
  hole: { x: number; y: number; radius: number };
  walls: LineSegment[];
  bumpers?: Bumper[];
  sand?: PolygonZone[];
  water?: PolygonZone[];
  portals?: Portal[];
  movingWalls?: MovingWall[];
}

export interface Shot {
  angle: number;
  power: number;
}

export type HoleScore = number | null;

export type GameScores = [[HoleScore, HoleScore], [HoleScore, HoleScore], [HoleScore, HoleScore]];

export type GamePhase = 'waiting' | 'aiming' | 'scoreboard' | 'finished';

export interface MiniGolfBoard {
  levels: [number, number, number];
  currentHole: number;
  scores: GameScores;
  currentStroke: number;
  lastShot: Shot | null;
  ready: [boolean, boolean];
  phase: GamePhase;
  version: number;
}

export interface MiniGolfGame {
  id: string;
  game_type: 'mini-golf';
  board: MiniGolfBoard;
  current_turn: Player;
  winner: Player | null;
  player1_id: string | null;
  player2_id: string | null;
  player1_name: string | null;
  player2_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface PhysicsState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  moving: boolean;
  sunk: boolean;
}

export interface GameStats {
  holesInOne: number[];
  mostBounces: { hole: number; count: number };
  closestCall: { hole: number; speed: number };
}

export const CANVAS_WIDTH = 400;
export const CANVAS_HEIGHT = 700;
export const BALL_RADIUS = 8;
export const HOLE_RADIUS = 12;
export const BASE_SPEED = 14;
export const MAX_POWER = 150;
export const FRICTION_RATE = 0.02;
export const SINK_SPEED_THRESHOLD = 5.5;
export const MIN_SPEED = 0.3;
export const SAND_FRICTION_MULTIPLIER = 3;
export const BUMPER_BOOST = 1.5;
export const MAX_STROKES = 6;
export const PENALTY_SCORE = 7;

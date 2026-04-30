export type Player = 1 | 2;
export type Cell = Player | null;
export type Column = Player[]; // bottom-to-top, max length 6
export type Board = Column[]; // 7 columns

// Tic Tac Toe types
export type TicTacToeCell = Player | null;
export type TicTacToeRow = [TicTacToeCell, TicTacToeCell, TicTacToeCell];
export type TicTacToeBoard = [TicTacToeRow, TicTacToeRow, TicTacToeRow]; // 3x3 grid

export interface Game {
  id: string;
  game_type: string;
  board: Board;
  current_turn: Player;
  winner: Player | null;
  player1_id: string | null;
  player2_id: string | null;
  player1_name: string | null;
  player2_name: string | null;
  created_at: string;
  updated_at: string;
}

export type GameStatus = 'waiting' | 'playing' | 'won' | 'draw';

// === Battleship Types ===
export type BattleshipCell = string | null;
export type BattleshipGrid = BattleshipCell[][];
export type ShipId = 'battleship' | 'cruiser' | 'destroyer';

export interface ShipDefinition {
  id: ShipId;
  name: string;
  size: number;
}

export interface ShipPlacement {
  shipId: ShipId;
  cells: [number, number][];
}

export interface Attack {
  row: number;
  col: number;
  result: 'hit' | 'miss';
  shipId?: ShipId;
}

export interface BattleshipBoardState {
  player1Ships: ShipPlacement[];
  player2Ships: ShipPlacement[];
  player1Attacks: Attack[];
  player2Attacks: Attack[];
  phase: 'setup' | 'playing' | 'finished';
}

export interface BattleshipGame {
  id: string;
  game_type: 'battleship';
  board: BattleshipBoardState;
  current_turn: Player;
  winner: Player | null;
  player1_id: string | null;
  player2_id: string | null;
  player1_name: string | null;
  player2_name: string | null;
  created_at: string;
  updated_at: string;
}

// Checkers types
export interface CheckersPiece { player: Player; king: boolean }
export type CheckersCell = CheckersPiece | null;
export type CheckersBoard = CheckersCell[][];
export interface CheckersSettings { moveCount: number; movesSinceCapture: number; continuingPiece: [number, number] | null }
export interface CheckersGameState { cells: CheckersBoard; settings: CheckersSettings }
export interface CheckersMove { from: [number, number]; to: [number, number]; captured: [number, number][] }

// === Jenga Types ===
export interface JengaBlock {
  id: string;
  exists: boolean;
}

export interface JengaMove {
  player: Player;
  row: number;
  col: number;
  risk: number;
  wobble_after: number;
  toppled: boolean;
}

export interface JengaGameState {
  tower: JengaBlock[][];
  wobble_score: number;
  move_history: JengaMove[];
}

// Snakes and Ladders types
export type PowerupType =
  | 'double_dice'
  | 'shield'
  | 'reverse'
  | 'teleport'
  | 'freeze'
  | 'swap'
  | 'earthquake'
  | 'magnet'

export interface MoveEvent {
  player: 1 | 2
  roll: number
  from: number
  to: number
  powerups: { tile: number; type: PowerupType; effect: string }[]
  snakeSlide: { from: number; to: number } | null
  ladderClimb: { from: number; to: number } | null
  shieldUsed: boolean
  skipped: boolean
}

export interface SnakesAndLaddersState {
  players: { 1: number; 2: number }
  snakes: Record<number, number>
  ladders: Record<number, number>
  lastRoll: { player: 1 | 2; value: number } | null
  moveNumber: number
  powerups: Record<number, PowerupType>
  powerupRespawns: { turnsLeft: number; type: PowerupType }[]
  lastMoveEvents: MoveEvent[]
  skipNextTurn: { player: 1 | 2 } | null
  shielded: { player: 1 | 2 } | null
  doubleDice: { player: 1 | 2 } | null
}

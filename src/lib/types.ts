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

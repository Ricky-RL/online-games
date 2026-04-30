import type { Player } from './types';

export type Direction = 'right' | 'left' | 'down' | 'up' | 'down-right' | 'down-left' | 'up-right' | 'up-left';

export interface WordPlacement {
  word: string;
  start: [number, number]; // [row, col]
  end: [number, number];   // [row, col]
  direction: Direction;
}

export interface PlayerResult {
  foundWords: string[];
  timeUsed: number; // seconds
  startedAt: string; // ISO timestamp
  submittedAt: string; // ISO timestamp
}

export interface WordSearchBoardState {
  grid: string[][]; // 10x10 uppercase letters
  words: WordPlacement[];
  theme: string;
  timeLimit: number; // seconds (300)
  foundWords: string[]; // shared between both players
  player1Result: PlayerResult | null;
  player2Result: PlayerResult | null;
}

export interface WordSearchGame {
  id: string;
  game_type: 'word-search';
  board: WordSearchBoardState;
  current_turn: Player;
  winner: Player | null;
  player1_id: string | null;
  player2_id: string | null;
  player1_name: string | null;
  player2_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface ThemePack {
  id: string;
  name: string;
  words: string[]; // pool of 15-20 words
}

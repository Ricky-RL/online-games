import { describe, it, expect } from 'vitest';
import {
  createEmptyBoard,
  makeMove,
  checkWin,
  isDraw,
  getGameStatus,
} from './game-logic';
import type { Board, Game } from './types';

describe('createEmptyBoard', () => {
  it('creates a board with 7 empty columns', () => {
    const board = createEmptyBoard();
    expect(board).toHaveLength(7);
    board.forEach((col) => {
      expect(col).toEqual([]);
    });
  });
});

describe('makeMove', () => {
  it('adds a piece to an empty column', () => {
    const board = createEmptyBoard();
    const result = makeMove(board, 3, 1);
    expect(result).not.toBeNull();
    expect(result![3]).toEqual([1]);
  });

  it('stacks pieces in a column', () => {
    let board = createEmptyBoard();
    board = makeMove(board, 0, 1)!;
    board = makeMove(board, 0, 2)!;
    board = makeMove(board, 0, 1)!;
    expect(board[0]).toEqual([1, 2, 1]);
  });

  it('returns null for a full column', () => {
    const board = createEmptyBoard();
    board[2] = [1, 2, 1, 2, 1, 2];
    const result = makeMove(board, 2, 1);
    expect(result).toBeNull();
  });

  it('returns null for out-of-range column', () => {
    const board = createEmptyBoard();
    expect(makeMove(board, -1, 1)).toBeNull();
    expect(makeMove(board, 7, 1)).toBeNull();
  });

  it('does not mutate the original board', () => {
    const board = createEmptyBoard();
    const result = makeMove(board, 0, 1);
    expect(board[0]).toEqual([]);
    expect(result![0]).toEqual([1]);
  });
});

describe('checkWin', () => {
  it('detects a horizontal win', () => {
    // Place player 1 in columns 0-3, row 0
    const board: Board = [[1], [1], [1], [1], [], [], []];
    const result = checkWin(board, 3, 0, 1);
    expect(result).not.toBeNull();
    expect(result).toHaveLength(4);
  });

  it('detects a vertical win', () => {
    // Place player 2 stacked in column 0
    const board: Board = [[2, 2, 2, 2], [], [], [], [], [], []];
    const result = checkWin(board, 0, 3, 2);
    expect(result).not.toBeNull();
    expect(result).toHaveLength(4);
  });

  it('detects a diagonal win (up-right)', () => {
    // Player 1 at positions: (0,0), (1,1), (2,2), (3,3)
    const board: Board = [[1], [2, 1], [2, 2, 1], [2, 2, 2, 1], [], [], []];
    const result = checkWin(board, 3, 3, 1);
    expect(result).not.toBeNull();
    expect(result).toHaveLength(4);
  });

  it('detects a diagonal win (down-right)', () => {
    // Player 1 at positions: (0,3), (1,2), (2,1), (3,0)
    const board: Board = [[2, 2, 2, 1], [2, 2, 1], [2, 1], [1], [], [], []];
    const result = checkWin(board, 3, 0, 1);
    expect(result).not.toBeNull();
    expect(result).toHaveLength(4);
  });

  it('returns null when no win', () => {
    const board: Board = [[1], [2], [1], [], [], [], []];
    const result = checkWin(board, 0, 0, 1);
    expect(result).toBeNull();
  });

  it('detects win from middle of the line', () => {
    // Player 1 at columns 1,2,3,4, row 0
    const board: Board = [[], [1], [1], [1], [1], [], []];
    // Check from column 2 (middle of sequence)
    const result = checkWin(board, 2, 0, 1);
    expect(result).not.toBeNull();
    expect(result).toHaveLength(4);
  });
});

describe('isDraw', () => {
  it('returns false for non-full board', () => {
    const board = createEmptyBoard();
    expect(isDraw(board)).toBe(false);
  });

  it('returns true when all columns are full', () => {
    const board: Board = Array(7).fill(null).map(() => [1, 2, 1, 2, 1, 2]);
    expect(isDraw(board)).toBe(true);
  });

  it('returns false when one column is not full', () => {
    const board: Board = Array(7).fill(null).map(() => [1, 2, 1, 2, 1, 2]);
    board[3] = [1, 2, 1, 2, 1]; // only 5 pieces
    expect(isDraw(board)).toBe(false);
  });
});

describe('getGameStatus', () => {
  const baseGame: Game = {
    id: 'test-id',
    game_type: 'connect-four',
    board: createEmptyBoard(),
    current_turn: 1,
    winner: null,
    player1_id: 'p1',
    player2_id: null,
    player1_name: 'Player 1',
    player2_name: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  it('returns "waiting" when player2 has not joined', () => {
    expect(getGameStatus(baseGame)).toBe('waiting');
  });

  it('returns "playing" when both players joined and no winner', () => {
    const game = { ...baseGame, player2_id: 'p2', player2_name: 'Player 2' };
    expect(getGameStatus(game)).toBe('playing');
  });

  it('returns "won" when there is a winner', () => {
    const game = { ...baseGame, winner: 1 as const, player2_id: 'p2' };
    expect(getGameStatus(game)).toBe('won');
  });

  it('returns "draw" when board is full with no winner', () => {
    const fullBoard: Board = Array(7).fill(null).map(() => [1, 2, 1, 2, 1, 2]);
    const game = {
      ...baseGame,
      board: fullBoard,
      player2_id: 'p2',
      player2_name: 'Player 2',
    };
    expect(getGameStatus(game)).toBe('draw');
  });
});

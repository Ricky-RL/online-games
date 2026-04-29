import { describe, it, expect } from 'vitest';
import {
  createEmptyBoard,
  makeMove,
  checkWin,
  isDraw,
  getWinningCells,
} from './tic-tac-toe-logic';
import type { TicTacToeBoard } from './types';

describe('createEmptyBoard', () => {
  it('creates a 3x3 board of nulls', () => {
    const board = createEmptyBoard();
    expect(board).toHaveLength(3);
    board.forEach((row) => {
      expect(row).toHaveLength(3);
      expect(row).toEqual([null, null, null]);
    });
  });
});

describe('makeMove', () => {
  it('places a piece on an empty cell', () => {
    const board = createEmptyBoard();
    const result = makeMove(board, 0, 0, 1);
    expect(result[0][0]).toBe(1);
  });

  it('places player 2 on a different cell', () => {
    const board = createEmptyBoard();
    const result = makeMove(board, 1, 2, 2);
    expect(result[1][2]).toBe(2);
  });

  it('throws when cell is already occupied', () => {
    const board = createEmptyBoard();
    const afterMove = makeMove(board, 1, 1, 1);
    expect(() => makeMove(afterMove, 1, 1, 2)).toThrow('already occupied');
  });

  it('throws for out-of-range position', () => {
    const board = createEmptyBoard();
    expect(() => makeMove(board, -1, 0, 1)).toThrow('Invalid position');
    expect(() => makeMove(board, 3, 0, 1)).toThrow('Invalid position');
    expect(() => makeMove(board, 0, -1, 1)).toThrow('Invalid position');
    expect(() => makeMove(board, 0, 3, 1)).toThrow('Invalid position');
  });

  it('does not mutate the original board', () => {
    const board = createEmptyBoard();
    const result = makeMove(board, 0, 0, 1);
    expect(board[0][0]).toBeNull();
    expect(result[0][0]).toBe(1);
  });
});

describe('checkWin', () => {
  it('detects a win in the top row', () => {
    const board: TicTacToeBoard = [
      [1, 1, 1],
      [null, null, null],
      [null, null, null],
    ];
    expect(checkWin(board)).toBe(1);
  });

  it('detects a win in the middle row', () => {
    const board: TicTacToeBoard = [
      [null, null, null],
      [2, 2, 2],
      [null, null, null],
    ];
    expect(checkWin(board)).toBe(2);
  });

  it('detects a win in the bottom row', () => {
    const board: TicTacToeBoard = [
      [null, null, null],
      [null, null, null],
      [1, 1, 1],
    ];
    expect(checkWin(board)).toBe(1);
  });

  it('detects a win in the left column', () => {
    const board: TicTacToeBoard = [
      [2, null, null],
      [2, null, null],
      [2, null, null],
    ];
    expect(checkWin(board)).toBe(2);
  });

  it('detects a win in the middle column', () => {
    const board: TicTacToeBoard = [
      [null, 1, null],
      [null, 1, null],
      [null, 1, null],
    ];
    expect(checkWin(board)).toBe(1);
  });

  it('detects a win in the right column', () => {
    const board: TicTacToeBoard = [
      [null, null, 2],
      [null, null, 2],
      [null, null, 2],
    ];
    expect(checkWin(board)).toBe(2);
  });

  it('detects a win on the main diagonal', () => {
    const board: TicTacToeBoard = [
      [1, null, null],
      [null, 1, null],
      [null, null, 1],
    ];
    expect(checkWin(board)).toBe(1);
  });

  it('detects a win on the anti-diagonal', () => {
    const board: TicTacToeBoard = [
      [null, null, 2],
      [null, 2, null],
      [2, null, null],
    ];
    expect(checkWin(board)).toBe(2);
  });

  it('returns null when no winner', () => {
    const board: TicTacToeBoard = [
      [1, 2, null],
      [null, 1, null],
      [null, null, 2],
    ];
    expect(checkWin(board)).toBeNull();
  });

  it('returns null for an empty board', () => {
    const board = createEmptyBoard();
    expect(checkWin(board)).toBeNull();
  });
});

describe('isDraw', () => {
  it('returns false for an empty board', () => {
    const board = createEmptyBoard();
    expect(isDraw(board)).toBe(false);
  });

  it('returns false when board is partially filled', () => {
    const board: TicTacToeBoard = [
      [1, 2, 1],
      [null, null, null],
      [null, null, null],
    ];
    expect(isDraw(board)).toBe(false);
  });

  it('returns true when board is full with no winner', () => {
    const board: TicTacToeBoard = [
      [1, 2, 1],
      [1, 1, 2],
      [2, 1, 2],
    ];
    // Verify there is no winner first
    expect(checkWin(board)).toBeNull();
    expect(isDraw(board)).toBe(true);
  });

  it('returns false when board is full but there is a winner', () => {
    const board: TicTacToeBoard = [
      [1, 1, 1],
      [2, 2, 1],
      [1, 2, 2],
    ];
    expect(isDraw(board)).toBe(false);
  });
});

describe('getWinningCells', () => {
  it('returns row cells for a row win', () => {
    const board: TicTacToeBoard = [
      [1, 1, 1],
      [null, null, null],
      [null, null, null],
    ];
    expect(getWinningCells(board)).toEqual([[0, 0], [0, 1], [0, 2]]);
  });

  it('returns column cells for a column win', () => {
    const board: TicTacToeBoard = [
      [null, 2, null],
      [null, 2, null],
      [null, 2, null],
    ];
    expect(getWinningCells(board)).toEqual([[0, 1], [1, 1], [2, 1]]);
  });

  it('returns diagonal cells for a main diagonal win', () => {
    const board: TicTacToeBoard = [
      [1, null, null],
      [null, 1, null],
      [null, null, 1],
    ];
    expect(getWinningCells(board)).toEqual([[0, 0], [1, 1], [2, 2]]);
  });

  it('returns diagonal cells for an anti-diagonal win', () => {
    const board: TicTacToeBoard = [
      [null, null, 2],
      [null, 2, null],
      [2, null, null],
    ];
    expect(getWinningCells(board)).toEqual([[0, 2], [1, 1], [2, 0]]);
  });

  it('returns null when there is no winner', () => {
    const board = createEmptyBoard();
    expect(getWinningCells(board)).toBeNull();
  });
});

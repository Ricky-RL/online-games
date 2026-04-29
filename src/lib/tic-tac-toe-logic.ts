import type { Player, TicTacToeBoard } from './types';

export function createEmptyBoard(): TicTacToeBoard {
  return [
    [null, null, null],
    [null, null, null],
    [null, null, null],
  ];
}

export function makeMove(
  board: TicTacToeBoard,
  row: number,
  col: number,
  player: Player
): TicTacToeBoard {
  if (row < 0 || row >= 3 || col < 0 || col >= 3) {
    throw new Error(`Invalid position: row ${row}, col ${col}`);
  }
  if (board[row][col] !== null) {
    throw new Error(`Cell (${row}, ${col}) is already occupied`);
  }

  const newBoard = board.map((r, ri) =>
    ri === row ? r.map((c, ci) => (ci === col ? player : c)) : [...r]
  ) as TicTacToeBoard;

  return newBoard;
}

export function checkWin(board: TicTacToeBoard): Player | null {
  // Check rows
  for (let r = 0; r < 3; r++) {
    if (board[r][0] !== null && board[r][0] === board[r][1] && board[r][1] === board[r][2]) {
      return board[r][0];
    }
  }

  // Check columns
  for (let c = 0; c < 3; c++) {
    if (board[0][c] !== null && board[0][c] === board[1][c] && board[1][c] === board[2][c]) {
      return board[0][c];
    }
  }

  // Check diagonals
  if (board[0][0] !== null && board[0][0] === board[1][1] && board[1][1] === board[2][2]) {
    return board[0][0];
  }
  if (board[0][2] !== null && board[0][2] === board[1][1] && board[1][1] === board[2][0]) {
    return board[0][2];
  }

  return null;
}

export function isDraw(board: TicTacToeBoard): boolean {
  if (checkWin(board) !== null) return false;
  return board.every((row) => row.every((cell) => cell !== null));
}

export function getWinningCells(board: TicTacToeBoard): [number, number][] | null {
  // Check rows
  for (let r = 0; r < 3; r++) {
    if (board[r][0] !== null && board[r][0] === board[r][1] && board[r][1] === board[r][2]) {
      return [[r, 0], [r, 1], [r, 2]];
    }
  }

  // Check columns
  for (let c = 0; c < 3; c++) {
    if (board[0][c] !== null && board[0][c] === board[1][c] && board[1][c] === board[2][c]) {
      return [[0, c], [1, c], [2, c]];
    }
  }

  // Check diagonals
  if (board[0][0] !== null && board[0][0] === board[1][1] && board[1][1] === board[2][2]) {
    return [[0, 0], [1, 1], [2, 2]];
  }
  if (board[0][2] !== null && board[0][2] === board[1][1] && board[1][1] === board[2][0]) {
    return [[0, 2], [1, 1], [2, 0]];
  }

  return null;
}

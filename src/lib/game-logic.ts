import type { Board, Player, Game, GameStatus } from './types';

export function createEmptyBoard(): Board {
  return [[], [], [], [], [], [], []];
}

export function makeMove(
  board: Board,
  column: number,
  player: Player
): Board | null {
  if (column < 0 || column >= 7) return null;
  if (board[column].length >= 6) return null;

  const newBoard = board.map((col, i) =>
    i === column ? [...col, player] : [...col]
  );
  return newBoard;
}

export function checkWin(
  board: Board,
  column: number,
  row: number,
  player: Player
): [number, number][] | null {
  const directions: [number, number][] = [
    [1, 0], // horizontal
    [0, 1], // vertical
    [1, 1], // diagonal up-right
    [1, -1], // diagonal down-right
  ];

  for (const [dc, dr] of directions) {
    const positions: [number, number][] = [[column, row]];

    // Check positive direction
    for (let i = 1; i < 4; i++) {
      const c = column + dc * i;
      const r = row + dr * i;
      if (c < 0 || c >= 7 || r < 0 || r >= 6) break;
      if (board[c][r] !== player) break;
      positions.push([c, r]);
    }

    // Check negative direction
    for (let i = 1; i < 4; i++) {
      const c = column - dc * i;
      const r = row - dr * i;
      if (c < 0 || c >= 7 || r < 0 || r >= 6) break;
      if (board[c][r] !== player) break;
      positions.push([c, r]);
    }

    if (positions.length >= 4) {
      return positions.slice(0, 4);
    }
  }

  return null;
}

export function isDraw(board: Board): boolean {
  return board.every((col) => col.length >= 6);
}

export function getGameStatus(game: Game): GameStatus {
  if (game.winner !== null) return 'won';
  if (isDraw(game.board)) return 'draw';
  if (game.player1_id && game.player2_id) return 'playing';
  return 'waiting';
}

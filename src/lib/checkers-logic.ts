import type { Player, CheckersGameState, CheckersMove, CheckersBoard, CheckersCell } from './types';

export function createInitialBoard(forcedJumps: boolean): CheckersGameState {
  const cells: CheckersBoard = Array.from({ length: 8 }, (_, row) =>
    Array.from({ length: 8 }, (_, col): CheckersCell => {
      if ((row + col) % 2 !== 1) return null;
      if (row <= 2) return { player: 2, king: false };
      if (row >= 5) return { player: 1, king: false };
      return null;
    })
  );

  return {
    cells,
    settings: { forcedJumps, moveCount: 0, movesSinceCapture: 0, continuingPiece: null },
  };
}

export function shouldKing(row: number, player: Player): boolean {
  return (player === 1 && row === 0) || (player === 2 && row === 7);
}

function getDirections(piece: { player: Player; king: boolean }): [number, number][] {
  if (piece.king) return [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  if (piece.player === 1) return [[-1, -1], [-1, 1]];
  return [[1, -1], [1, 1]];
}

function inBounds(row: number, col: number): boolean {
  return row >= 0 && row < 8 && col >= 0 && col < 8;
}

export function getSimpleMoves(state: CheckersGameState, row: number, col: number): CheckersMove[] {
  const piece = state.cells[row][col];
  if (!piece) return [];

  const moves: CheckersMove[] = [];
  for (const [dr, dc] of getDirections(piece)) {
    const nr = row + dr;
    const nc = col + dc;
    if (inBounds(nr, nc) && state.cells[nr][nc] === null) {
      moves.push({ from: [row, col], to: [nr, nc], captured: [] });
    }
  }
  return moves;
}

export function getJumpMoves(state: CheckersGameState, row: number, col: number): CheckersMove[] {
  const piece = state.cells[row][col];
  if (!piece) return [];

  const moves: CheckersMove[] = [];
  for (const [dr, dc] of getDirections(piece)) {
    const midR = row + dr;
    const midC = col + dc;
    const landR = row + dr * 2;
    const landC = col + dc * 2;
    if (
      inBounds(landR, landC) &&
      state.cells[midR][midC] !== null &&
      state.cells[midR][midC]!.player !== piece.player &&
      state.cells[landR][landC] === null
    ) {
      moves.push({ from: [row, col], to: [landR, landC], captured: [[midR, midC]] });
    }
  }
  return moves;
}

export function getValidMoves(state: CheckersGameState, row: number, col: number): CheckersMove[] {
  const jumps = getJumpMoves(state, row, col);
  if (state.settings.forcedJumps && jumps.length > 0) return jumps;
  return [...jumps, ...getSimpleMoves(state, row, col)];
}

export function getMovablePieces(state: CheckersGameState, player: Player): [number, number][] {
  if (state.settings.continuingPiece) {
    const [r, c] = state.settings.continuingPiece;
    if (getJumpMoves(state, r, c).length > 0) return [[r, c]];
    return [];
  }

  const withJumps: [number, number][] = [];
  const withMoves: [number, number][] = [];

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = state.cells[r][c];
      if (!piece || piece.player !== player) continue;
      if (getJumpMoves(state, r, c).length > 0) {
        withJumps.push([r, c]);
      } else if (getSimpleMoves(state, r, c).length > 0) {
        withMoves.push([r, c]);
      }
    }
  }

  if (state.settings.forcedJumps && withJumps.length > 0) return withJumps;
  return [...withJumps, ...withMoves];
}

export function canContinueJump(state: CheckersGameState, row: number, col: number): boolean {
  return getJumpMoves(state, row, col).length > 0;
}

export function applyMove(state: CheckersGameState, move: CheckersMove, player: Player): CheckersGameState {
  const cells = state.cells.map(r => [...r]);

  const piece = { ...cells[move.from[0]][move.from[1]]! };
  cells[move.from[0]][move.from[1]] = null;

  for (const [cr, cc] of move.captured) {
    cells[cr][cc] = null;
  }

  const wasKing = piece.king;
  if (!piece.king && shouldKing(move.to[0], player)) {
    piece.king = true;
  }
  cells[move.to[0]][move.to[1]] = piece;

  const justKinged = !wasKing && piece.king;
  const hasContinuation = !justKinged && move.captured.length > 0 && canContinueJump({ cells, settings: state.settings }, move.to[0], move.to[1]);

  return {
    cells,
    settings: {
      forcedJumps: state.settings.forcedJumps,
      moveCount: state.settings.moveCount + 1,
      movesSinceCapture: move.captured.length > 0 ? 0 : state.settings.movesSinceCapture + 1,
      continuingPiece: hasContinuation ? [move.to[0], move.to[1]] : null,
    },
  };
}

export function checkWin(state: CheckersGameState, currentPlayer: Player): Player | null {
  const opponent = (3 - currentPlayer) as Player;

  let opponentHasPieces = false;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (state.cells[r][c]?.player === opponent) {
        opponentHasPieces = true;
        break;
      }
    }
    if (opponentHasPieces) break;
  }

  if (!opponentHasPieces) return currentPlayer;

  const opponentMoves = getMovablePieces(state, opponent);
  if (opponentMoves.length === 0) return currentPlayer;

  return null;
}

export function getCheckersGameStatus(game: { winner: number | null; player1_name: string | null; player2_name: string | null; board: CheckersGameState }): 'waiting' | 'playing' | 'won' | 'draw' {
  if (!game.player1_name || !game.player2_name) return 'waiting';
  if (game.winner) return 'won';
  if (game.board.settings.movesSinceCapture >= 40) return 'draw';
  return 'playing';
}

import { describe, it, expect } from 'vitest';
import {
  createInitialBoard,
  shouldKing,
  getSimpleMoves,
  getJumpMoves,
  getValidMoves,
  getMovablePieces,
  canContinueJump,
  applyMove,
  checkWin,
  getCheckersGameStatus,
} from './checkers-logic';
import type { CheckersGameState } from './types';

describe('createInitialBoard', () => {
  it('places 12 pieces per player on dark squares', () => {
    const state = createInitialBoard(true);
    let p1 = 0, p2 = 0;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const cell = state.cells[r][c];
        if (cell) {
          expect((r + c) % 2).toBe(1);
          if (cell.player === 1) p1++;
          else p2++;
        }
      }
    }
    expect(p1).toBe(12);
    expect(p2).toBe(12);
  });

  it('places player 2 on rows 0-2 and player 1 on rows 5-7', () => {
    const state = createInitialBoard(false);
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 8; c++) {
        if (state.cells[r][c]) expect(state.cells[r][c]!.player).toBe(2);
      }
    }
    for (let r = 5; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (state.cells[r][c]) expect(state.cells[r][c]!.player).toBe(1);
      }
    }
  });
});

describe('shouldKing', () => {
  it('player 1 kings at row 0', () => {
    expect(shouldKing(0, 1)).toBe(true);
    expect(shouldKing(3, 1)).toBe(false);
  });
  it('player 2 kings at row 7', () => {
    expect(shouldKing(7, 2)).toBe(true);
    expect(shouldKing(4, 2)).toBe(false);
  });
});

describe('getSimpleMoves', () => {
  it('player 1 moves forward (toward row 0)', () => {
    const state = createInitialBoard(false);
    // Player 1 piece at row 5, find a piece on a dark square
    const moves = getSimpleMoves(state, 5, 0);
    expect(moves.length).toBeGreaterThan(0);
    for (const m of moves) {
      expect(m.to[0]).toBe(4);
      expect(m.captured).toEqual([]);
    }
  });

  it('player 2 moves forward (toward row 7)', () => {
    const state = createInitialBoard(false);
    const moves = getSimpleMoves(state, 2, 1);
    expect(moves.length).toBeGreaterThan(0);
    for (const m of moves) {
      expect(m.to[0]).toBe(3);
    }
  });

  it('regular pieces cannot move backward', () => {
    const cells = Array.from({ length: 8 }, () => Array(8).fill(null));
    cells[4][3] = { player: 1, king: false };
    const state: CheckersGameState = {
      cells,
      settings: { forcedJumps: false, moveCount: 0, movesSinceCapture: 0, continuingPiece: null },
    };
    const moves = getSimpleMoves(state, 4, 3);
    for (const m of moves) {
      expect(m.to[0]).toBeLessThan(4);
    }
  });

  it('kings move in all 4 directions', () => {
    const cells = Array.from({ length: 8 }, () => Array(8).fill(null));
    cells[4][3] = { player: 1, king: true };
    const state: CheckersGameState = {
      cells,
      settings: { forcedJumps: false, moveCount: 0, movesSinceCapture: 0, continuingPiece: null },
    };
    const moves = getSimpleMoves(state, 4, 3);
    expect(moves.length).toBe(4);
    const rows = moves.map(m => m.to[0]);
    expect(rows).toContain(3);
    expect(rows).toContain(5);
  });
});

describe('getJumpMoves', () => {
  it('single jump captures opponent piece', () => {
    const cells = Array.from({ length: 8 }, () => Array(8).fill(null));
    cells[4][3] = { player: 1, king: false };
    cells[3][2] = { player: 2, king: false };
    const state: CheckersGameState = {
      cells,
      settings: { forcedJumps: false, moveCount: 0, movesSinceCapture: 0, continuingPiece: null },
    };
    const moves = getJumpMoves(state, 4, 3);
    expect(moves.length).toBe(1);
    expect(moves[0].to).toEqual([2, 1]);
    expect(moves[0].captured).toEqual([[3, 2]]);
  });

  it('cannot jump own piece', () => {
    const cells = Array.from({ length: 8 }, () => Array(8).fill(null));
    cells[4][3] = { player: 1, king: false };
    cells[3][2] = { player: 1, king: false };
    const state: CheckersGameState = {
      cells,
      settings: { forcedJumps: false, moveCount: 0, movesSinceCapture: 0, continuingPiece: null },
    };
    const moves = getJumpMoves(state, 4, 3);
    expect(moves.length).toBe(0);
  });
});

describe('canContinueJump', () => {
  it('returns true when piece can jump again', () => {
    const cells = Array.from({ length: 8 }, () => Array(8).fill(null));
    cells[4][3] = { player: 1, king: false };
    cells[3][2] = { player: 2, king: false };
    const state: CheckersGameState = {
      cells,
      settings: { forcedJumps: true, moveCount: 0, movesSinceCapture: 0, continuingPiece: null },
    };
    expect(canContinueJump(state, 4, 3)).toBe(true);
  });

  it('returns false when no jumps available', () => {
    const cells = Array.from({ length: 8 }, () => Array(8).fill(null));
    cells[4][3] = { player: 1, king: false };
    const state: CheckersGameState = {
      cells,
      settings: { forcedJumps: true, moveCount: 0, movesSinceCapture: 0, continuingPiece: null },
    };
    expect(canContinueJump(state, 4, 3)).toBe(false);
  });
});

describe('applyMove', () => {
  it('moves piece and removes captured', () => {
    const cells = Array.from({ length: 8 }, () => Array(8).fill(null));
    cells[4][3] = { player: 1, king: false };
    cells[3][2] = { player: 2, king: false };
    const state: CheckersGameState = {
      cells,
      settings: { forcedJumps: true, moveCount: 0, movesSinceCapture: 0, continuingPiece: null },
    };
    const result = applyMove(state, { from: [4, 3], to: [2, 1], captured: [[3, 2]] }, 1);
    expect(result.cells[4][3]).toBeNull();
    expect(result.cells[3][2]).toBeNull();
    expect(result.cells[2][1]).toEqual({ player: 1, king: false });
    expect(result.settings.movesSinceCapture).toBe(0);
    expect(result.settings.moveCount).toBe(1);
  });

  it('kinging stops the chain (continuingPiece is null)', () => {
    const cells = Array.from({ length: 8 }, () => Array(8).fill(null));
    cells[2][1] = { player: 1, king: false };
    cells[1][2] = { player: 2, king: false };
    // After jump, lands on row 0 → gets kinged
    const state: CheckersGameState = {
      cells,
      settings: { forcedJumps: true, moveCount: 5, movesSinceCapture: 0, continuingPiece: null },
    };
    const result = applyMove(state, { from: [2, 1], to: [0, 3], captured: [[1, 2]] }, 1);
    expect(result.cells[0][3]).toEqual({ player: 1, king: true });
    expect(result.settings.continuingPiece).toBeNull();
  });

  it('sets continuingPiece when multi-jump available', () => {
    const cells = Array.from({ length: 8 }, () => Array(8).fill(null));
    cells[6][1] = { player: 1, king: false };
    cells[5][2] = { player: 2, king: false };
    cells[3][4] = { player: 2, king: false };
    const state: CheckersGameState = {
      cells,
      settings: { forcedJumps: true, moveCount: 0, movesSinceCapture: 0, continuingPiece: null },
    };
    const result = applyMove(state, { from: [6, 1], to: [4, 3], captured: [[5, 2]] }, 1);
    expect(result.settings.continuingPiece).toEqual([4, 3]);
  });

  it('increments movesSinceCapture for non-capture moves', () => {
    const cells = Array.from({ length: 8 }, () => Array(8).fill(null));
    cells[4][3] = { player: 1, king: false };
    const state: CheckersGameState = {
      cells,
      settings: { forcedJumps: false, moveCount: 5, movesSinceCapture: 10, continuingPiece: null },
    };
    const result = applyMove(state, { from: [4, 3], to: [3, 2], captured: [] }, 1);
    expect(result.settings.movesSinceCapture).toBe(11);
  });
});

describe('getMovablePieces', () => {
  it('forced jumps: returns only pieces with jumps', () => {
    const cells = Array.from({ length: 8 }, () => Array(8).fill(null));
    cells[4][3] = { player: 1, king: false };
    cells[3][2] = { player: 2, king: false };
    cells[6][5] = { player: 1, king: false }; // can only simple move
    const state: CheckersGameState = {
      cells,
      settings: { forcedJumps: true, moveCount: 0, movesSinceCapture: 0, continuingPiece: null },
    };
    const pieces = getMovablePieces(state, 1);
    expect(pieces).toEqual([[4, 3]]);
  });

  it('free moves: returns all movable pieces', () => {
    const cells = Array.from({ length: 8 }, () => Array(8).fill(null));
    cells[4][3] = { player: 1, king: false };
    cells[3][2] = { player: 2, king: false };
    cells[6][5] = { player: 1, king: false };
    const state: CheckersGameState = {
      cells,
      settings: { forcedJumps: false, moveCount: 0, movesSinceCapture: 0, continuingPiece: null },
    };
    const pieces = getMovablePieces(state, 1);
    expect(pieces.length).toBe(2);
  });

  it('continuingPiece: returns only that piece', () => {
    const cells = Array.from({ length: 8 }, () => Array(8).fill(null));
    cells[4][3] = { player: 1, king: false };
    cells[3][2] = { player: 2, king: false };
    cells[6][5] = { player: 1, king: false };
    const state: CheckersGameState = {
      cells,
      settings: { forcedJumps: true, moveCount: 0, movesSinceCapture: 0, continuingPiece: [4, 3] },
    };
    const pieces = getMovablePieces(state, 1);
    expect(pieces).toEqual([[4, 3]]);
  });
});

describe('checkWin', () => {
  it('wins when opponent has no pieces', () => {
    const cells = Array.from({ length: 8 }, () => Array(8).fill(null));
    cells[4][3] = { player: 1, king: false };
    const state: CheckersGameState = {
      cells,
      settings: { forcedJumps: true, moveCount: 20, movesSinceCapture: 0, continuingPiece: null },
    };
    expect(checkWin(state, 1)).toBe(1);
  });

  it('wins when opponent has no valid moves', () => {
    const cells = Array.from({ length: 8 }, () => Array(8).fill(null));
    // Player 2 piece trapped: surrounded so no simple or jump moves
    cells[7][0] = { player: 2, king: false };
    // Block forward moves (toward row 7 — but it's already at row 7, can't go further)
    // Player 2 at row 7 can't move forward (off board), can't move backward (not king)
    cells[4][3] = { player: 1, king: false };
    const state: CheckersGameState = {
      cells,
      settings: { forcedJumps: false, moveCount: 20, movesSinceCapture: 0, continuingPiece: null },
    };
    expect(checkWin(state, 1)).toBe(1);
  });

  it('returns null when game is ongoing', () => {
    const state = createInitialBoard(true);
    expect(checkWin(state, 1)).toBeNull();
  });
});

describe('getCheckersGameStatus', () => {
  it('returns waiting when player missing', () => {
    const state = createInitialBoard(true);
    expect(getCheckersGameStatus({ winner: null, player1_name: 'Ricky', player2_name: null, board: state })).toBe('waiting');
  });

  it('returns won when winner set', () => {
    const state = createInitialBoard(true);
    expect(getCheckersGameStatus({ winner: 1, player1_name: 'Ricky', player2_name: 'Lilian', board: state })).toBe('won');
  });

  it('returns draw when movesSinceCapture >= 40', () => {
    const state = createInitialBoard(true);
    state.settings.movesSinceCapture = 40;
    expect(getCheckersGameStatus({ winner: null, player1_name: 'Ricky', player2_name: 'Lilian', board: state })).toBe('draw');
  });

  it('returns playing normally', () => {
    const state = createInitialBoard(true);
    expect(getCheckersGameStatus({ winner: null, player1_name: 'Ricky', player2_name: 'Lilian', board: state })).toBe('playing');
  });
});

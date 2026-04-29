'use client';

import { CheckersPiece } from './Piece';
import { getJumpMoves } from '@/lib/checkers-logic';
import type { CheckersGameState, CheckersMove, Player } from '@/lib/types';

interface CheckersBoardProps {
  state: CheckersGameState;
  myPlayer: Player | null;
  isMyTurn: boolean;
  selectedPiece: [number, number] | null;
  validMoves: CheckersMove[];
  movablePieces: [number, number][];
  onSquareClick: (row: number, col: number) => void;
  lastMove: CheckersMove | null;
  disabled: boolean;
}

export function CheckersBoard({
  state,
  myPlayer,
  isMyTurn,
  selectedPiece,
  validMoves,
  movablePieces,
  onSquareClick,
  lastMove,
  disabled,
}: CheckersBoardProps) {
  const isValidDestination = (row: number, col: number) =>
    validMoves.some(m => m.to[0] === row && m.to[1] === col);

  const isMovablePiece = (row: number, col: number) =>
    movablePieces.some(([r, c]) => r === row && c === col);

  const isForcedJumperPiece = (row: number, col: number) => {
    if (!state.settings.forcedJumps || !isMyTurn || disabled) return false;
    const piece = state.cells[row][col];
    if (!piece || piece.player !== myPlayer) return false;
    return getJumpMoves(state, row, col).length > 0;
  };

  const isLastMoveSquare = (row: number, col: number) =>
    lastMove && (
      (lastMove.from[0] === row && lastMove.from[1] === col) ||
      (lastMove.to[0] === row && lastMove.to[1] === col)
    );

  return (
    <div className="w-full max-w-[min(90vw,480px)] aspect-square rounded-2xl overflow-hidden shadow-xl border border-border">
      <div className="grid grid-cols-8 grid-rows-8 w-full h-full">
        {Array.from({ length: 8 }, (_, row) =>
          Array.from({ length: 8 }, (_, col) => {
            const isDark = (row + col) % 2 === 1;
            const piece = state.cells[row][col];
            const isSelected = selectedPiece?.[0] === row && selectedPiece?.[1] === col;
            const isDestination = isValidDestination(row, col);
            const isMovable = isMyTurn && !disabled && isMovablePiece(row, col);
            const isForcedJumper = isForcedJumperPiece(row, col);
            const isLast = isLastMoveSquare(row, col);

            return (
              <div
                key={`${row}-${col}`}
                className={`relative flex items-center justify-center ${isDark ? 'bg-checkers-dark' : 'bg-checkers-light'} ${isSelected ? 'bg-amber-600/70' : ''} ${isLast && isDark ? 'bg-amber-700/50' : ''}`}
                onClick={() => {
                  if (disabled) return;
                  if (isDark) onSquareClick(row, col);
                }}
              >
                {piece && (
                  <CheckersPiece
                    player={piece.player}
                    isKing={piece.king}
                    isSelected={isSelected}
                    isMovable={isMovable}
                    isForcedJumper={isForcedJumper}
                    onClick={
                      !disabled && isMyTurn && piece.player === myPlayer
                        ? () => onSquareClick(row, col)
                        : undefined
                    }
                  />
                )}
                {isDestination && !piece && (
                  <div className="w-[30%] h-[30%] rounded-full bg-green-500/40" />
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

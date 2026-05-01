'use client';

import { CheckersPiece } from './Piece';
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
  replayMove: CheckersMove | null;
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
  replayMove,
  disabled,
}: CheckersBoardProps) {
  const isValidDestination = (row: number, col: number) =>
    validMoves.some(m => m.to[0] === row && m.to[1] === col);

  const isMovablePiece = (row: number, col: number) =>
    movablePieces.some(([r, c]) => r === row && c === col);

  const isLastMoveSquare = (row: number, col: number) =>
    lastMove && (
      (lastMove.from[0] === row && lastMove.from[1] === col) ||
      (lastMove.to[0] === row && lastMove.to[1] === col)
    );

  const isReplayFrom = (row: number, col: number) =>
    replayMove && replayMove.from[0] === row && replayMove.from[1] === col;

  const isReplayTo = (row: number, col: number) =>
    replayMove && replayMove.to[0] === row && replayMove.to[1] === col;

  const isReplayCaptured = (row: number, col: number) =>
    replayMove && replayMove.captured.some(([r, c]) => r === row && c === col);

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
            const isLast = isLastMoveSquare(row, col);
            const isRFrom = isReplayFrom(row, col);
            const isRTo = isReplayTo(row, col);
            const isRCaptured = isReplayCaptured(row, col);

            return (
              <div
                key={`${row}-${col}`}
                className={`relative flex items-center justify-center ${isDark ? 'bg-checkers-dark' : 'bg-checkers-light'} ${isSelected ? 'bg-amber-600/70' : ''} ${isLast && isDark ? 'bg-amber-700/50' : ''} ${isRFrom ? 'bg-blue-500/50' : ''} ${isRTo ? 'bg-blue-400/60' : ''} ${isRCaptured ? 'bg-red-500/40' : ''}`}
                onClick={() => {
                  if (disabled) return;
                  if (isDark) onSquareClick(row, col);
                }}
              >
                {isRFrom && !piece && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-[60%] h-[60%] rounded-full border-2 border-dashed border-blue-300/70" />
                  </div>
                )}
                {isRTo && piece && (
                  <div className="absolute inset-[2px] rounded-full ring-2 ring-blue-300 animate-pulse pointer-events-none" />
                )}
                {piece && (
                  <CheckersPiece
                    player={piece.player}
                    isKing={piece.king}
                    isSelected={isSelected}
                    isMovable={isMovable}
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

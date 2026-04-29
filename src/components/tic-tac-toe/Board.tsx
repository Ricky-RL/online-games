'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Player, TicTacToeBoard } from '@/lib/types';
import { Mark } from './Mark';
import { WinLine } from './WinLine';

interface BoardProps {
  board: TicTacToeBoard;
  currentPlayer: Player;
  onCellClick: (row: number, col: number) => void;
  disabled?: boolean;
  winningCells?: [number, number][] | null;
  lastMove?: { row: number; col: number } | null;
}

export function TicTacToeGameBoard({
  board,
  currentPlayer,
  onCellClick,
  disabled = false,
  winningCells = null,
  lastMove = null,
}: BoardProps) {
  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number } | null>(null);

  const isWinningCell = (row: number, col: number): boolean => {
    if (!winningCells) return false;
    return winningCells.some(([r, c]) => r === row && c === col);
  };

  const handleCellClick = (row: number, col: number) => {
    if (!disabled && board[row][col] === null) {
      onCellClick(row, col);
    }
  };

  const isLastMove = (row: number, col: number): boolean => {
    return lastMove !== null && lastMove.row === row && lastMove.col === col;
  };

  return (
    <motion.div
      className="w-full max-w-[320px] mx-auto"
      animate={lastMove ? { scale: [1, 1.01, 1] } : {}}
      transition={{ duration: 0.2 }}
    >
      <div className="relative aspect-square">
        {/* 3x3 Grid */}
        <div className="grid grid-cols-3 grid-rows-3 h-full w-full rounded-3xl overflow-hidden border border-border bg-surface shadow-xl">
          {Array.from({ length: 3 }, (_, row) =>
            Array.from({ length: 3 }, (_, col) => {
              const cellValue = board[row][col];
              const canHover = !disabled && cellValue === null;
              const isHovered =
                hoveredCell !== null &&
                hoveredCell.row === row &&
                hoveredCell.col === col;

              return (
                <div
                  key={`${row}-${col}`}
                  className={`relative p-4 sm:p-5 ${
                    canHover ? 'cursor-pointer' : ''
                  } ${
                    col < 2 ? 'border-r border-border/60' : ''
                  } ${row < 2 ? 'border-b border-border/60' : ''}`}
                  onClick={() => handleCellClick(row, col)}
                  onMouseEnter={() => canHover && setHoveredCell({ row, col })}
                  onMouseLeave={() => setHoveredCell(null)}
                >
                  {/* Placed mark */}
                  {cellValue !== null && (
                    <div className="absolute inset-4 sm:inset-5 flex items-center justify-center">
                      <Mark
                        player={cellValue}
                        animate={isLastMove(row, col)}
                      />
                    </div>
                  )}

                  {/* Ghost preview on hover */}
                  <AnimatePresence>
                    {isHovered && cellValue === null && !disabled && (
                      <motion.div
                        key="ghost"
                        className="absolute inset-4 sm:inset-5 flex items-center justify-center"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.15 }}
                      >
                        <Mark player={currentPlayer} ghost />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Winning cell glow */}
                  {isWinningCell(row, col) && (
                    <motion.div
                      className="absolute inset-0"
                      animate={{
                        backgroundColor: [
                          'rgba(255, 255, 255, 0)',
                          'rgba(255, 255, 255, 0.15)',
                          'rgba(255, 255, 255, 0)',
                        ],
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                    />
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Win line overlay */}
        {winningCells && winningCells.length === 3 && (
          <WinLine cells={winningCells as [[number, number], [number, number], [number, number]]} />
        )}
      </div>
    </motion.div>
  );
}

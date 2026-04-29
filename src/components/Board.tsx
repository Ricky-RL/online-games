'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Board, Player } from '@/lib/types';
import { Cell } from './Cell';

interface BoardProps {
  board: Board;
  currentPlayer: Player;
  onColumnClick: (column: number) => void;
  disabled?: boolean;
  winningCells?: [number, number][] | null;
  lastMove?: { col: number; row: number } | null;
}

export function GameBoard({
  board,
  currentPlayer,
  onColumnClick,
  disabled = false,
  winningCells = null,
  lastMove = null,
}: BoardProps) {
  const [hoveredColumn, setHoveredColumn] = useState<number | null>(null);

  const isWinningCell = (col: number, row: number): boolean => {
    if (!winningCells) return false;
    return winningCells.some(([c, r]) => c === col && r === row);
  };

  const isColumnFull = (col: number): boolean => {
    return board[col].length >= 6;
  };

  const handleColumnClick = (col: number) => {
    if (!disabled && !isColumnFull(col)) {
      onColumnClick(col);
    }
  };

  return (
    <motion.div
      className="w-full max-w-md mx-auto"
      animate={lastMove ? { x: [0, -1, 1, -1, 0] } : {}}
      transition={{ duration: 0.2 }}
    >
      {/* Column hover indicators */}
      <div className="grid grid-cols-7 gap-1 px-2 mb-1">
        {Array.from({ length: 7 }, (_, col) => (
          <div
            key={col}
            className="aspect-square flex items-center justify-center"
            onMouseEnter={() => setHoveredColumn(col)}
            onMouseLeave={() => setHoveredColumn(null)}
            onClick={() => handleColumnClick(col)}
          >
            <AnimatePresence>
              {hoveredColumn === col && !disabled && !isColumnFull(col) && (
                <motion.div
                  key="ghost"
                  className={`w-8 h-8 rounded-full ${
                    currentPlayer === 1 ? 'bg-player1' : 'bg-player2'
                  }`}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 0.3, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                />
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      {/* Board */}
      <div className="bg-board rounded-2xl p-2 shadow-xl">
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 7 }, (_, col) => (
            <div
              key={col}
              className={`flex flex-col gap-1 ${!disabled && !isColumnFull(col) ? 'cursor-pointer' : ''}`}
              onClick={() => handleColumnClick(col)}
              onMouseEnter={() => setHoveredColumn(col)}
              onMouseLeave={() => setHoveredColumn(null)}
            >
              {/* Render rows top-to-bottom (row 5 at top, row 0 at bottom) */}
              {Array.from({ length: 6 }, (_, rowIdx) => {
                const row = 5 - rowIdx;
                const cellValue = board[col][row] ?? null;
                const isNew =
                  lastMove !== null &&
                  lastMove.col === col &&
                  lastMove.row === row;

                return (
                  <Cell
                    key={`${col}-${row}`}
                    player={cellValue}
                    row={row}
                    isNew={isNew}
                    isWinning={isWinningCell(col, row)}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

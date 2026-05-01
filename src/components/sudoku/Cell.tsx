'use client';

import { motion } from 'framer-motion';
import type { SudokuCell as SudokuCellType } from '@/lib/sudoku-logic';

interface CellProps {
  cell: SudokuCellType;
  row: number;
  col: number;
  isSelected: boolean;
  isConflict: boolean;
  isSameNumber: boolean;
  isHighlightedRowCol: boolean;
  onSelect: (row: number, col: number) => void;
}

export function Cell({ cell, row, col, isSelected, isConflict, isSameNumber, isHighlightedRowCol, onSelect }: CellProps) {
  const borderRight = col === 2 || col === 5 ? 'border-r-2 border-r-text-primary/30' : 'border-r border-r-border';
  const borderBottom = row === 2 || row === 5 ? 'border-b-2 border-b-text-primary/30' : 'border-b border-b-border';

  let bg = 'bg-surface';
  if (isSelected) bg = 'bg-blue-500/20';
  else if (isConflict) bg = 'bg-red-500/15';
  else if (isSameNumber) bg = 'bg-blue-500/10';
  else if (isHighlightedRowCol) bg = 'bg-text-primary/[0.03]';

  const textColor = cell.isGiven
    ? 'text-text-primary font-bold'
    : cell.placedBy
      ? 'text-blue-400 font-semibold'
      : '';

  return (
    <button
      onClick={() => onSelect(row, col)}
      className={`relative aspect-square flex items-center justify-center ${bg} ${borderRight} ${borderBottom} transition-colors duration-100 cursor-pointer outline-none focus:ring-1 focus:ring-blue-400/50 ${isSelected ? 'ring-2 ring-blue-400' : ''}`}
    >
      {cell.value !== null ? (
        <motion.span
          key={`${row}-${col}-${cell.value}`}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 25 }}
          className={`text-lg sm:text-xl leading-none ${textColor} ${isConflict ? 'text-red-400' : ''}`}
        >
          {cell.value}
        </motion.span>
      ) : cell.pencilMarks.length > 0 ? (
        <div className="grid grid-cols-3 grid-rows-3 w-full h-full p-0.5">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <span
              key={n}
              className="flex items-center justify-center text-[8px] sm:text-[10px] text-text-secondary/70 leading-none"
            >
              {cell.pencilMarks.includes(n) ? n : ''}
            </span>
          ))}
        </div>
      ) : null}
    </button>
  );
}

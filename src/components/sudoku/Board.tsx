'use client';

import { useMemo } from 'react';
import { Cell } from './Cell';
import { getConflicts, type SudokuGrid } from '@/lib/sudoku-logic';

interface BoardProps {
  grid: SudokuGrid;
  selectedCell: [number, number] | null;
  onCellSelect: (row: number, col: number) => void;
}

export function Board({ grid, selectedCell, onCellSelect }: BoardProps) {
  const conflicts = useMemo(() => getConflicts(grid), [grid]);

  const selectedNumber = useMemo(() => {
    if (!selectedCell) return null;
    return grid[selectedCell[0]][selectedCell[1]].value;
  }, [grid, selectedCell]);

  return (
    <div className="w-full max-w-[360px] sm:max-w-[420px] aspect-square mx-auto">
      <div className="grid grid-cols-9 grid-rows-9 w-full h-full border-2 border-text-primary/40 rounded-lg overflow-hidden">
        {grid.map((row, rowIdx) =>
          row.map((cell, colIdx) => {
            const isSelected = selectedCell?.[0] === rowIdx && selectedCell?.[1] === colIdx;
            const isConflict = conflicts.has(`${rowIdx},${colIdx}`);
            const isSameNumber = !isSelected && selectedNumber !== null && cell.value === selectedNumber && cell.value !== null;
            const isHighlightedRowCol = !isSelected && selectedCell !== null && (selectedCell[0] === rowIdx || selectedCell[1] === colIdx);

            return (
              <Cell
                key={`${rowIdx}-${colIdx}`}
                cell={cell}
                row={rowIdx}
                col={colIdx}
                isSelected={isSelected}
                isConflict={isConflict}
                isSameNumber={isSameNumber}
                isHighlightedRowCol={isHighlightedRowCol}
                onSelect={onCellSelect}
              />
            );
          })
        )}
      </div>
    </div>
  );
}

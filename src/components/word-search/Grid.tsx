'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import type { WordPlacement } from '@/lib/word-search-types';
import { getWordCells } from '@/lib/word-search-logic';

interface GridProps {
  grid: string[][];
  words: WordPlacement[];
  foundWords: string[];
  onWordFound: (word: string) => void;
  onFirstInteraction?: () => void;
  disabled?: boolean;
}

export function Grid({ grid, words, foundWords, onWordFound, onFirstInteraction, disabled }: GridProps) {
  const [selectedCells, setSelectedCells] = useState<[number, number][]>([]);
  const [interacted, setInteracted] = useState(false);

  const foundCellsMap = new Map<string, string>();
  for (const placement of words) {
    if (foundWords.includes(placement.word)) {
      const cells = getWordCells(placement);
      cells.forEach(([r, c]) => foundCellsMap.set(`${r},${c}`, placement.word));
    }
  }

  const selectedSet = new Set(selectedCells.map(([r, c]) => `${r},${c}`));

  const checkForMatch = (cells: [number, number][]) => {
    if (cells.length < 2) return;
    const cellSet = new Set(cells.map(([r, c]) => `${r},${c}`));

    for (const placement of words) {
      if (foundWords.includes(placement.word)) continue;
      const wordCells = getWordCells(placement);
      if (wordCells.length > cells.length) continue;
      if (wordCells.every(([r, c]) => cellSet.has(`${r},${c}`))) {
        onWordFound(placement.word);
        // Remove matched cells from selection, keep any extras
        const matchedSet = new Set(wordCells.map(([r, c]) => `${r},${c}`));
        const remaining = cells.filter(([r, c]) => !matchedSet.has(`${r},${c}`));
        setSelectedCells(remaining);
        return;
      }
    }
  };

  const isValidSelection = (cells: [number, number][], newCell: [number, number]): boolean => {
    if (cells.length === 0) return true;

    const allCells = [...cells, newCell];
    const [r0, c0] = allCells[0];

    // Check all cells lie on a single row, column, or diagonal
    const allSameRow = allCells.every(([r]) => r === r0);
    if (allSameRow) return true;

    const allSameCol = allCells.every(([, c]) => c === c0);
    if (allSameCol) return true;

    // Check diagonal: every cell must have |row - r0| === |col - c0| and same sign pattern
    const [r1, c1] = allCells.find(([r, c]) => r !== r0 || c !== c0) || allCells[1];
    const rowSign = Math.sign(r1 - r0);
    const colSign = Math.sign(c1 - c0);

    return allCells.every(([r, c]) => {
      const dr = r - r0;
      const dc = c - c0;
      if (dr === 0 && dc === 0) return true;
      if (Math.abs(dr) !== Math.abs(dc)) return false;
      // Must be on the same diagonal line (not an anti-diagonal)
      return Math.sign(dr) * colSign === Math.sign(dc) * rowSign;
    });
  };

  const handleCellClick = (row: number, col: number) => {
    if (disabled) return;

    const key = `${row},${col}`;

    if (!interacted) {
      setInteracted(true);
      if (onFirstInteraction) onFirstInteraction();
    }

    if (selectedSet.has(key)) {
      const updated = selectedCells.filter(([r, c]) => !(r === row && c === col));
      setSelectedCells(updated);
      return;
    }

    const newCell: [number, number] = [row, col];

    // If adding this cell breaks the line, start a new selection from this cell
    if (!isValidSelection(selectedCells, newCell)) {
      setSelectedCells([newCell]);
      return;
    }

    const updated = [...selectedCells, newCell];
    setSelectedCells(updated);
    checkForMatch(updated);
  };

  const handleDeselectAll = () => {
    setSelectedCells([]);
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="grid gap-0.5 select-none"
        style={{ gridTemplateColumns: `repeat(${grid[0].length}, minmax(0, 1fr))` }}
      >
        {grid.map((row, rowIdx) =>
          row.map((letter, colIdx) => {
            const key = `${rowIdx},${colIdx}`;
            const isFound = foundCellsMap.has(key);
            const isSelected = selectedSet.has(key);

            return (
              <motion.button
                key={key}
                type="button"
                onClick={() => handleCellClick(rowIdx, colIdx)}
                disabled={disabled}
                className={`w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded text-sm sm:text-base font-bold cursor-pointer transition-colors disabled:cursor-not-allowed ${
                  isSelected
                    ? 'bg-blue-500/40 text-blue-100 ring-1 ring-blue-400/60'
                    : isFound
                    ? 'bg-green-500/30 text-green-300'
                    : 'bg-surface/50 text-text-primary hover:bg-surface'
                }`}
              >
                {letter}
              </motion.button>
            );
          })
        )}
      </div>

      {selectedCells.length > 0 && (
        <button
          onClick={handleDeselectAll}
          className="px-4 py-1.5 text-xs font-medium rounded-lg bg-surface border border-border text-text-secondary hover:text-text-primary hover:bg-background transition-colors cursor-pointer"
        >
          Deselect all ({selectedCells.length})
        </button>
      )}
    </div>
  );
}

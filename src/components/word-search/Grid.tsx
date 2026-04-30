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
    const first = cells[0];
    const last = cells[cells.length - 1];

    for (const placement of words) {
      if (foundWords.includes(placement.word)) continue;
      const { start, end } = placement;
      if (
        (start[0] === first[0] && start[1] === first[1] && end[0] === last[0] && end[1] === last[1]) ||
        (start[0] === last[0] && start[1] === last[1] && end[0] === first[0] && end[1] === first[1])
      ) {
        onWordFound(placement.word);
        setSelectedCells([]);
        return;
      }
    }
  };

  const handleCellClick = (row: number, col: number) => {
    if (disabled) return;

    const key = `${row},${col}`;
    if (foundCellsMap.has(key)) return;

    if (!interacted) {
      setInteracted(true);
      if (onFirstInteraction) onFirstInteraction();
    }

    if (selectedSet.has(key)) {
      const updated = selectedCells.filter(([r, c]) => !(r === row && c === col));
      setSelectedCells(updated);
      return;
    }

    const updated = [...selectedCells, [row, col] as [number, number]];
    setSelectedCells(updated);

    if (updated.length >= 2) {
      const first = updated[0];
      const last = updated[updated.length - 1];
      const dr = Math.sign(last[0] - first[0]);
      const dc = Math.sign(last[1] - first[1]);
      const rowDiff = Math.abs(last[0] - first[0]);
      const colDiff = Math.abs(last[1] - first[1]);

      const isLine = (rowDiff === colDiff || rowDiff === 0 || colDiff === 0) && (rowDiff > 0 || colDiff > 0);
      if (isLine) {
        const length = Math.max(rowDiff, colDiff);
        const expectedCells: [number, number][] = [];
        for (let i = 0; i <= length; i++) {
          expectedCells.push([first[0] + dr * i, first[1] + dc * i]);
        }
        const allMatch = expectedCells.length === updated.length &&
          expectedCells.every(([r, c], i) => updated[i][0] === r && updated[i][1] === c);

        if (allMatch) {
          checkForMatch(updated);
        }
      }
    }
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
                  isFound
                    ? 'bg-green-500/30 text-green-300'
                    : isSelected
                    ? 'bg-blue-500/40 text-blue-100 ring-1 ring-blue-400/60'
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

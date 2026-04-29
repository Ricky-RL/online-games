'use client';

import { useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import type { WordPlacement } from '@/lib/word-search-types';
import { getWordCells } from '@/lib/word-search-logic';

interface GridProps {
  grid: string[][];
  words: WordPlacement[];
  foundWords: string[];
  onWordFound: (word: string) => void;
  disabled?: boolean;
}

export function Grid({ grid, words, foundWords, onWordFound, disabled }: GridProps) {
  const [selecting, setSelecting] = useState(false);
  const [startCell, setStartCell] = useState<[number, number] | null>(null);
  const [currentCell, setCurrentCell] = useState<[number, number] | null>(null);
  const [shakeCell, setShakeCell] = useState<[number, number] | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // Get highlighted cells for found words
  const foundCells = new Map<string, string>(); // "r,c" -> word
  for (const placement of words) {
    if (foundWords.includes(placement.word)) {
      const cells = getWordCells(placement);
      cells.forEach(([r, c]) => foundCells.set(`${r},${c}`, placement.word));
    }
  }

  // Get cells in current selection line
  const getSelectionCells = useCallback((): [number, number][] => {
    if (!startCell || !currentCell) return [];
    const [r1, c1] = startCell;
    const [r2, c2] = currentCell;
    const dr = Math.sign(r2 - r1);
    const dc = Math.sign(c2 - c1);

    // Only allow straight lines (horizontal, vertical, diagonal)
    const rowDiff = Math.abs(r2 - r1);
    const colDiff = Math.abs(c2 - c1);
    if (rowDiff !== colDiff && rowDiff !== 0 && colDiff !== 0) return [];

    const length = Math.max(rowDiff, colDiff);
    const cells: [number, number][] = [];
    for (let i = 0; i <= length; i++) {
      cells.push([r1 + dr * i, c1 + dc * i]);
    }
    return cells;
  }, [startCell, currentCell]);

  const selectionCells = getSelectionCells();
  const selectionSet = new Set(selectionCells.map(([r, c]) => `${r},${c}`));

  const handlePointerDown = (row: number, col: number) => {
    if (disabled) return;
    setSelecting(true);
    setStartCell([row, col]);
    setCurrentCell([row, col]);
  };

  const handlePointerEnter = (row: number, col: number) => {
    if (!selecting) return;
    setCurrentCell([row, col]);
  };

  const handlePointerUp = () => {
    if (!selecting || !startCell || !currentCell) {
      setSelecting(false);
      return;
    }

    // Check if selection matches a word
    const [r1, c1] = startCell;
    const [r2, c2] = currentCell;

    let matched = false;
    for (const placement of words) {
      if (foundWords.includes(placement.word)) continue;
      const { start, end } = placement;
      if (
        (start[0] === r1 && start[1] === c1 && end[0] === r2 && end[1] === c2) ||
        (start[0] === r2 && start[1] === c2 && end[0] === r1 && end[1] === c1)
      ) {
        onWordFound(placement.word);
        matched = true;
        break;
      }
    }

    if (!matched && (r1 !== r2 || c1 !== c2)) {
      setShakeCell(startCell);
      setTimeout(() => setShakeCell(null), 400);
    }

    setSelecting(false);
    setStartCell(null);
    setCurrentCell(null);
  };

  return (
    <div
      ref={gridRef}
      className="grid gap-0.5 select-none touch-none"
      style={{ gridTemplateColumns: `repeat(${grid[0].length}, minmax(0, 1fr))` }}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {grid.map((row, rowIdx) =>
        row.map((letter, colIdx) => {
          const key = `${rowIdx},${colIdx}`;
          const isFound = foundCells.has(key);
          const isSelecting = selectionSet.has(key);
          const isShaking = shakeCell && shakeCell[0] === rowIdx && shakeCell[1] === colIdx;

          return (
            <motion.div
              key={key}
              animate={isShaking ? { x: [-2, 2, -2, 2, 0] } : {}}
              transition={{ duration: 0.3 }}
              onPointerDown={() => handlePointerDown(rowIdx, colIdx)}
              onPointerEnter={() => handlePointerEnter(rowIdx, colIdx)}
              className={`w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded text-sm sm:text-base font-bold cursor-pointer transition-colors ${
                isFound
                  ? 'bg-green-500/30 text-green-300'
                  : isSelecting
                  ? 'bg-blue-500/30 text-blue-200'
                  : 'bg-surface/50 text-text-primary hover:bg-surface'
              }`}
            >
              {letter}
            </motion.div>
          );
        })
      )}
    </div>
  );
}

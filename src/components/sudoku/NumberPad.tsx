'use client';

import { useMemo } from 'react';
import type { SudokuGrid } from '@/lib/sudoku-logic';

interface NumberPadProps {
  grid: SudokuGrid;
  onNumber: (n: number) => void;
  onErase: () => void;
  isPencilMode: boolean;
  onTogglePencilMode: () => void;
}

export function NumberPad({ grid, onNumber, onErase, isPencilMode, onTogglePencilMode }: NumberPadProps) {
  const numberCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    for (let n = 1; n <= 9; n++) counts[n] = 0;
    for (const row of grid) {
      for (const cell of row) {
        if (cell.value !== null) counts[cell.value]++;
      }
    }
    return counts;
  }, [grid]);

  return (
    <div className="w-full max-w-[360px] sm:max-w-[420px] mx-auto space-y-3">
      <div className="grid grid-cols-9 gap-1.5">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => {
          const remaining = 9 - numberCounts[n];
          const isComplete = remaining <= 0;

          return (
            <button
              key={n}
              onClick={() => onNumber(n)}
              disabled={isComplete}
              className={`aspect-square rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                isPencilMode
                  ? 'bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30'
                  : 'bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30'
              }`}
            >
              <span className="text-lg sm:text-xl font-bold text-text-primary">{n}</span>
              {remaining > 0 && remaining < 9 && (
                <span className="text-[9px] text-text-secondary/60">{remaining}</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onErase}
          className="flex-1 py-3 rounded-xl border border-border bg-surface hover:bg-background text-sm font-medium text-text-secondary hover:text-text-primary transition-all cursor-pointer"
        >
          Erase
        </button>
        <button
          onClick={onTogglePencilMode}
          className={`flex-1 py-3 rounded-xl border text-sm font-medium transition-all cursor-pointer ${
            isPencilMode
              ? 'border-amber-500/50 bg-amber-500/15 text-amber-400'
              : 'border-border bg-surface hover:bg-background text-text-secondary hover:text-text-primary'
          }`}
        >
          {isPencilMode ? 'Pencil ON' : 'Pencil'}
        </button>
      </div>
    </div>
  );
}

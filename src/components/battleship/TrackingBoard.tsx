'use client';

import { motion } from 'framer-motion';
import type { Attack, ShipPlacement } from '@/lib/types';
import { Cell } from './Cell';
import { BOARD_SIZE } from '@/lib/battleship-logic';

interface TrackingBoardProps {
  myAttacks: Attack[];
  sunkShips: ShipPlacement[];
  onCellClick: (row: number, col: number) => void;
  disabled: boolean;
  lastAttack?: Attack | null;
}

const COL_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

export function TrackingBoard({
  myAttacks,
  sunkShips,
  onCellClick,
  disabled,
  lastAttack = null,
}: TrackingBoardProps) {
  const sunkCells = new Set<string>();
  for (const ship of sunkShips) {
    for (const [r, c] of ship.cells) {
      sunkCells.add(`${r},${c}`);
    }
  }

  const getAttack = (row: number, col: number): Attack | undefined => {
    return myAttacks.find((a) => a.row === row && a.col === col);
  };

  const getCellState = (row: number, col: number) => {
    const attack = getAttack(row, col);

    if (attack?.result === 'hit' && sunkCells.has(`${row},${col}`)) {
      return 'sunk' as const;
    }
    if (attack?.result === 'hit') return 'hit' as const;
    if (attack?.result === 'miss') return 'miss' as const;
    return 'water' as const;
  };

  const isNewAttack = (row: number, col: number): boolean => {
    return lastAttack !== null && lastAttack.row === row && lastAttack.col === col;
  };

  return (
    <motion.div
      className="flex flex-col items-center gap-2"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.21, 0.47, 0.32, 0.98] }}
    >
      <h3 className="text-sm font-medium text-text-secondary uppercase tracking-wide">
        Attack Board
      </h3>

      <div className="bg-slate-900 rounded-xl p-2 border border-border">
        {/* Column labels */}
        <div className="grid grid-cols-[auto_repeat(7,1fr)] gap-0.5 mb-0.5">
          <div className="w-5" />
          {COL_LABELS.map((label) => (
            <div
              key={label}
              className="flex items-center justify-center text-xs text-text-secondary font-mono"
            >
              {label}
            </div>
          ))}
        </div>

        {/* Grid with row labels */}
        {Array.from({ length: BOARD_SIZE }, (_, row) => (
          <div key={row} className="grid grid-cols-[auto_repeat(7,1fr)] gap-0.5">
            {/* Row label */}
            <div className="w-5 flex items-center justify-center text-xs text-text-secondary font-mono">
              {row + 1}
            </div>
            {/* Cells */}
            {Array.from({ length: BOARD_SIZE }, (_, col) => {
              const state = getCellState(row, col);
              return (
                <Cell
                  key={`${row}-${col}`}
                  state={state}
                  onClick={
                    state === 'water'
                      ? () => onCellClick(row, col)
                      : undefined
                  }
                  disabled={disabled}
                  isNew={isNewAttack(row, col)}
                  size="md"
                />
              );
            })}
          </div>
        ))}
      </div>
    </motion.div>
  );
}

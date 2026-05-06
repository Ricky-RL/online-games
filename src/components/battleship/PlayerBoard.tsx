'use client';

import { motion } from 'framer-motion';
import type { BattleshipGrid, Attack } from '@/lib/types';
import { Cell } from './Cell';
import { BOARD_SIZE } from '@/lib/battleship-logic';

interface PlayerBoardProps {
  shipGrid: BattleshipGrid;
  opponentAttacks: Attack[];
  lastAttack?: Attack | null;
}

const COL_LABELS = Array.from({ length: BOARD_SIZE }, (_, index) => String.fromCharCode(65 + index));

export function PlayerBoard({
  shipGrid,
  opponentAttacks,
  lastAttack = null,
}: PlayerBoardProps) {
  const isAttacked = (row: number, col: number): Attack | undefined => {
    return opponentAttacks.find((a) => a.row === row && a.col === col);
  };

  const getCellState = (row: number, col: number) => {
    const attack = isAttacked(row, col);
    const hasShip = shipGrid[row][col] !== null;

    if (hasShip && attack?.result === 'hit') return 'hit' as const;
    if (hasShip) return 'ship' as const;
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
        Your Fleet
      </h3>

      <div className="bg-slate-900 rounded-xl p-2 border border-border">
        {/* Column labels */}
        <div
          className="grid gap-0.5 mb-0.5"
          style={{ gridTemplateColumns: `auto repeat(${BOARD_SIZE}, minmax(0, 1fr))` }}
        >
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
          <div
            key={row}
            className="grid gap-0.5"
            style={{ gridTemplateColumns: `auto repeat(${BOARD_SIZE}, minmax(0, 1fr))` }}
          >
            {/* Row label */}
            <div className="w-5 flex items-center justify-center text-xs text-text-secondary font-mono">
              {row + 1}
            </div>
            {/* Cells */}
            {Array.from({ length: BOARD_SIZE }, (_, col) => (
              <Cell
                key={`${row}-${col}`}
                state={getCellState(row, col)}
                isNew={isNewAttack(row, col)}
                size="sm"
              />
            ))}
          </div>
        ))}
      </div>
    </motion.div>
  );
}

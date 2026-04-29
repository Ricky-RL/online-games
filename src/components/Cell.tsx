'use client';

import { motion } from 'framer-motion';
import type { Player } from '@/lib/types';
import { Piece } from './Piece';

interface CellProps {
  player: Player | null;
  row: number;
  isNew?: boolean;
  isWinning?: boolean;
}

export function Cell({ player, row, isNew = false, isWinning = false }: CellProps) {
  return (
    <div className="relative aspect-square p-1">
      {/* Board cell background */}
      <div className="w-full h-full rounded-full bg-board-surface relative overflow-hidden">
        {player && (
          <div className="absolute inset-1.5">
            <Piece player={player} row={row} animate={isNew} />
          </div>
        )}
        {!player && (
          <div
            className="absolute inset-1.5 rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(0,0,0,0.2) 0%, transparent 70%)',
            }}
          />
        )}
      </div>
      {/* Winning cell glow */}
      {isWinning && (
        <motion.div
          className="absolute inset-0 rounded-full"
          animate={{
            boxShadow: [
              '0 0 0 0 rgba(255, 255, 255, 0)',
              '0 0 12px 4px rgba(255, 255, 255, 0.5)',
              '0 0 0 0 rgba(255, 255, 255, 0)',
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
}

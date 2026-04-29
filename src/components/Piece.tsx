'use client';

import { motion } from 'framer-motion';
import type { Player } from '@/lib/types';

interface PieceProps {
  player: Player;
  row: number;
  animate?: boolean;
}

export function Piece({ player, row, animate = false }: PieceProps) {
  const color = player === 1 ? 'bg-player1' : 'bg-player2';
  const shadowColor = player === 1 ? 'rgba(230, 57, 70, 0.4)' : 'rgba(255, 190, 11, 0.4)';

  // Drop distance: each cell is roughly 60px, piece starts from top of board
  const dropDistance = -(row + 1) * 64;

  return (
    <motion.div
      className={`w-full h-full rounded-full ${color} relative`}
      initial={animate ? { y: dropDistance, scale: 0.9 } : false}
      animate={{ y: 0, scale: 1 }}
      transition={
        animate
          ? {
              type: 'spring',
              stiffness: 200,
              damping: 12,
            }
          : { duration: 0 }
      }
      style={{
        boxShadow: `inset 0 -4px 8px ${shadowColor}, inset 0 4px 6px rgba(255,255,255,0.3)`,
      }}
    >
      {/* Inner highlight for depth */}
      <div
        className="absolute inset-2 rounded-full opacity-30"
        style={{
          background: 'radial-gradient(circle at 35% 35%, rgba(255,255,255,0.6), transparent 60%)',
        }}
      />
    </motion.div>
  );
}

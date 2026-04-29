'use client';

import { motion } from 'framer-motion';
import type { Player } from '@/lib/types';

interface TurnIndicatorProps {
  currentPlayer: Player;
  isMyTurn: boolean;
  playerName?: string | null;
  label?: string;
}

export function TurnIndicator({ currentPlayer, isMyTurn, playerName, label: labelProp }: TurnIndicatorProps) {
  const color = currentPlayer === 1 ? 'bg-player1' : 'bg-player2';
  const label = labelProp ?? (isMyTurn ? 'Your turn' : `${playerName ?? 'Opponent'}'s turn`);

  return (
    <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-surface border border-border">
      <motion.div
        className={`w-4 h-4 rounded-full ${color}`}
        animate={
          isMyTurn
            ? { scale: [1, 1.3, 1] }
            : { scale: 1 }
        }
        transition={
          isMyTurn
            ? { duration: 1.2, repeat: Infinity, ease: 'easeInOut' }
            : {}
        }
      />
      <motion.span
        className="text-sm font-medium text-text-primary"
        key={label}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {label}
      </motion.span>
    </div>
  );
}

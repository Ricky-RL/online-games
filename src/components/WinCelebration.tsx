'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import type { Player } from '@/lib/types';
import { useConfetti } from '@/hooks/useConfetti';

interface WinCelebrationProps {
  winner: Player;
  winnerName: string | null;
  isMe: boolean;
  onPlayAgain: () => void;
  onHome: () => void;
}

export function WinCelebration({ winner, winnerName, isMe, onPlayAgain, onHome }: WinCelebrationProps) {
  const { fireConfetti } = useConfetti();

  useEffect(() => {
    fireConfetti();
  }, [fireConfetti]);

  const message = isMe ? 'You won!' : `${winnerName ?? 'Opponent'} wins!`;
  const color = winner === 1 ? 'text-player1' : 'text-player2';

  return (
    <motion.div
      className="flex flex-col items-center gap-6"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 15 }}
    >
      <motion.h2
        className={`text-3xl font-bold ${color}`}
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        {message}
      </motion.h2>

      <div className="flex items-center gap-3">
        <button
          onClick={onHome}
          className="px-6 py-3 text-base font-medium rounded-xl border border-border bg-surface text-text-secondary hover:text-text-primary hover:border-text-secondary/30 shadow-sm hover:shadow transition-all cursor-pointer"
        >
          Home
        </button>
        <button
          onClick={onPlayAgain}
          className="px-6 py-3 text-base font-medium rounded-xl bg-board text-white hover:bg-board-surface transition-colors shadow-lg cursor-pointer"
        >
          Play Again
        </button>
      </div>
    </motion.div>
  );
}

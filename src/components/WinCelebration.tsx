'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import type { Player } from '@/lib/types';

interface WinCelebrationProps {
  winner: Player;
  winnerName: string | null;
  isMe: boolean;
  onPlayAgain: () => void;
  actionLabel?: string;
}

export function WinCelebration({ winner, winnerName, isMe, onPlayAgain, actionLabel = 'Play Again' }: WinCelebrationProps) {
  useEffect(() => {
    // Fire confetti on mount
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { x: 0.5, y: 0.5 },
      colors: winner === 1 ? ['#E63946', '#FF6B6B', '#FF9999'] : ['#FFBE0B', '#FFD93D', '#FFF3B0'],
    });

    // Fire a second burst after a short delay
    const timer = setTimeout(() => {
      confetti({
        particleCount: 50,
        spread: 100,
        origin: { x: 0.5, y: 0.6 },
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [winner]);

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

      <button
        onClick={onPlayAgain}
        className="px-6 py-3 text-base font-medium rounded-xl bg-board text-white hover:bg-board-surface transition-colors shadow-lg cursor-pointer"
      >
        {actionLabel}
      </button>
    </motion.div>
  );
}

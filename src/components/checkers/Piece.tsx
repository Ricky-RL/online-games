'use client';

import { motion } from 'framer-motion';

interface CheckersPieceProps {
  player: 1 | 2;
  isKing: boolean;
  isSelected: boolean;
  isMovable: boolean;
  isForcedJumper: boolean;
  onClick?: () => void;
}

function CrownIcon() {
  return (
    <svg width="16" height="12" viewBox="0 0 16 12" fill="none" className="absolute">
      <path d="M1 10L3 4L5.5 7L8 2L10.5 7L13 4L15 10H1Z" fill="white" stroke="white" strokeWidth="0.5" />
    </svg>
  );
}

export function CheckersPiece({ player, isKing, isSelected, isMovable, isForcedJumper, onClick }: CheckersPieceProps) {
  const colorClass = player === 1 ? 'bg-player1' : 'bg-player2';

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`w-[80%] h-[80%] rounded-full ${colorClass} flex items-center justify-center relative cursor-pointer disabled:cursor-default shadow-md ${isSelected ? 'ring-2 ring-white ring-offset-2 ring-offset-transparent' : ''} ${isForcedJumper && !isSelected ? 'ring-3 ring-red-400 ring-offset-1 ring-offset-transparent' : ''}`}
      animate={{
        scale: isSelected ? 1.1 : isForcedJumper ? [1, 1.05, 1] : 1,
        opacity: isMovable && !isSelected && !isForcedJumper ? [0.8, 1, 0.8] : 1,
      }}
      transition={
        isForcedJumper && !isSelected
          ? { scale: { duration: 0.8, repeat: Infinity, ease: 'easeInOut' } }
          : isMovable && !isSelected
            ? { opacity: { duration: 1.2, repeat: Infinity, ease: 'easeInOut' } }
            : { type: 'spring', stiffness: 300, damping: 20 }
      }
      whileTap={onClick ? { scale: 0.95 } : undefined}
    >
      {isKing && <CrownIcon />}
    </motion.button>
  );
}

'use client';

import { motion } from 'framer-motion';

interface MemoryCardProps {
  card: { id: number; emoji: string; matched: boolean; matchedBy: 1 | 2 | null };
  isRevealed: boolean;
  disabled: boolean;
  onClick: () => void;
}

export function MemoryCard({ card, isRevealed, disabled, onClick }: MemoryCardProps) {
  const showFace = isRevealed || card.matched;

  const matchRingColor =
    card.matchedBy === 1
      ? 'ring-2 ring-[#457B9D]'
      : card.matchedBy === 2
        ? 'ring-2 ring-[#E07A8A]'
        : '';

  return (
    <motion.button
      type="button"
      className={`relative w-[70px] h-[70px] sm:w-[90px] sm:h-[90px] cursor-pointer [perspective:600px] ${
        disabled ? 'pointer-events-none' : ''
      }`}
      onClick={onClick}
      disabled={disabled}
      whileTap={!disabled ? { scale: 0.95 } : undefined}
    >
      <motion.div
        className="relative w-full h-full [transform-style:preserve-3d]"
        initial={false}
        animate={{ rotateY: showFace ? 180 : 0 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      >
        {/* Card Back */}
        <div className="absolute inset-0 [backface-visibility:hidden] rounded-xl bg-board border border-border shadow-md flex items-center justify-center">
          <div className="grid grid-cols-3 grid-rows-3 gap-1 opacity-30">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-white/60" />
            ))}
          </div>
        </div>

        {/* Card Face */}
        <div
          className={`absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] rounded-xl bg-surface border border-border shadow-md flex items-center justify-center ${matchRingColor} ${
            card.matched ? 'opacity-60' : ''
          }`}
        >
          <span className="text-3xl sm:text-4xl select-none">{card.emoji}</span>
        </div>
      </motion.div>
    </motion.button>
  );
}

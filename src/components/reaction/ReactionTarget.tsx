'use client';

import { motion } from 'framer-motion';

interface ReactionTargetProps {
  x: number;
  y: number;
  onTap: () => void;
}

export function ReactionTarget({ x, y, onTap }: ReactionTargetProps) {
  return (
    <motion.button
      className="absolute w-[60px] h-[60px] rounded-full bg-[#FF6B35] cursor-pointer focus:outline-none"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: 'translate(-50%, -50%)',
        boxShadow: '0 0 20px rgba(255, 107, 53, 0.6), 0 0 40px rgba(255, 107, 53, 0.3)',
      }}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      exit={{ scale: 1.5, opacity: 0 }}
      transition={{
        scale: { type: 'spring', stiffness: 500, damping: 20 },
      }}
      whileTap={{ scale: 1.3 }}
      onClick={onTap}
      aria-label="Reaction target - tap now!"
    />
  );
}

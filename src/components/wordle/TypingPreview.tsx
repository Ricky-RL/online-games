'use client';

import { motion } from 'framer-motion';

interface TypingPreviewProps {
  playerName: string;
  isTyping: boolean;
}

export function TypingPreview({ playerName, isTyping }: TypingPreviewProps) {
  if (!isTyping) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      className="flex items-center gap-2 text-sm text-text-secondary"
    >
      <span>{playerName} is thinking</span>
      <motion.span
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        ...
      </motion.span>
    </motion.div>
  );
}

'use client';

import { motion } from 'framer-motion';

interface BallInHandOverlayProps {
  visible: boolean;
}

export function BallInHandOverlay({ visible }: BallInHandOverlayProps) {
  if (!visible) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute top-2 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-black/70 text-white text-xs font-medium rounded-full"
    >
      Tap the table to place the cue ball
    </motion.div>
  );
}

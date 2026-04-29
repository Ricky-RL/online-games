'use client';

import { motion } from 'framer-motion';

interface GameSetupWaitingProps {
  playerName: string;
}

export function GameSetupWaiting({ playerName }: GameSetupWaitingProps) {
  return (
    <motion.div
      className="flex flex-col items-center justify-center gap-4 py-12"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.21, 0.47, 0.32, 0.98] }}
    >
      <div className="flex items-center gap-2">
        {/* Pulsing dots */}
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full bg-text-secondary"
              animate={{
                scale: [1, 1.4, 1],
                opacity: [0.4, 1, 0.4],
              }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: i * 0.2,
              }}
            />
          ))}
        </div>
      </div>

      <p className="text-text-secondary text-center text-sm">
        Waiting for opponent to join...
      </p>

      <p className="text-text-primary text-center text-lg font-medium">
        {playerName}, your fleet is ready!
      </p>
    </motion.div>
  );
}

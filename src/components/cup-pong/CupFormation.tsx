'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { Cup } from '@/lib/cup-pong-types';

interface CupFormationProps {
  /** Array of Cup objects from game state */
  cups: Cup[];
  /** Player number to determine cup color */
  player: 1 | 2;
  /** Container size for rendering (table width drives this) */
  containerWidth: number;
  containerHeight: number;
}

const CUP_SIZE = 28;

export function CupFormation({ cups, player, containerWidth, containerHeight }: CupFormationProps) {
  const cupColor = player === 1 ? 'var(--color-player1)' : 'var(--color-player2)';
  const cupRingColor = player === 1 ? 'rgba(230, 57, 70, 0.4)' : 'rgba(255, 190, 11, 0.4)';

  return (
    <div className="absolute inset-0 pointer-events-none">
      <AnimatePresence>
        {cups.map((cup) =>
          cup.standing ? (
            <motion.div
              key={cup.id}
              className="absolute rounded-full border-2 flex items-center justify-center"
              style={{
                width: CUP_SIZE,
                height: CUP_SIZE,
                left: cup.position.x * containerWidth - CUP_SIZE / 2,
                top: cup.position.y * containerHeight - CUP_SIZE / 2,
                backgroundColor: cupColor,
                borderColor: cupRingColor,
                boxShadow: `inset 0 0 6px rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.2)`,
              }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{
                scale: 0,
                opacity: 0,
                transition: { duration: 0.4, ease: 'easeIn' },
              }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              {/* Inner circle — liquid surface from above */}
              <div
                className="rounded-full"
                style={{
                  width: CUP_SIZE * 0.55,
                  height: CUP_SIZE * 0.55,
                  backgroundColor: 'rgba(0,0,0,0.2)',
                }}
              />
            </motion.div>
          ) : null
        )}
      </AnimatePresence>
    </div>
  );
}

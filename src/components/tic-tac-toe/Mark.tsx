'use client';

import { motion } from 'framer-motion';
import type { Player } from '@/lib/types';

interface MarkProps {
  player: Player;
  animate?: boolean;
  ghost?: boolean;
}

export function Mark({ player, animate = false, ghost = false }: MarkProps) {
  const opacity = ghost ? 0.3 : 1;

  if (player === 1) {
    return <XMark animate={animate} opacity={opacity} />;
  }
  return <OMark animate={animate} opacity={opacity} />;
}

function XMark({ animate, opacity }: { animate: boolean; opacity: number }) {
  const strokeColor = '#E63946';

  return (
    <motion.svg
      viewBox="0 0 100 100"
      className="w-full h-full"
      initial={animate ? { opacity: 0 } : false}
      animate={{ opacity }}
      transition={{ duration: 0.15 }}
    >
      {/* First stroke: top-left to bottom-right */}
      <motion.line
        x1="22"
        y1="22"
        x2="78"
        y2="78"
        stroke={strokeColor}
        strokeWidth="10"
        strokeLinecap="round"
        initial={animate ? { pathLength: 0 } : { pathLength: 1 }}
        animate={{ pathLength: 1 }}
        transition={
          animate
            ? { type: 'spring', stiffness: 200, damping: 12, duration: 0.3 }
            : { duration: 0 }
        }
      />
      {/* Second stroke: top-right to bottom-left */}
      <motion.line
        x1="78"
        y1="22"
        x2="22"
        y2="78"
        stroke={strokeColor}
        strokeWidth="10"
        strokeLinecap="round"
        initial={animate ? { pathLength: 0 } : { pathLength: 1 }}
        animate={{ pathLength: 1 }}
        transition={
          animate
            ? { type: 'spring', stiffness: 200, damping: 12, duration: 0.3, delay: 0.1 }
            : { duration: 0 }
        }
      />
    </motion.svg>
  );
}

function OMark({ animate, opacity }: { animate: boolean; opacity: number }) {
  const strokeColor = '#FFBE0B';

  return (
    <motion.svg
      viewBox="0 0 100 100"
      className="w-full h-full"
      initial={animate ? { scale: 0.5, rotate: -45, opacity: 0 } : false}
      animate={{ scale: 1, rotate: 0, opacity }}
      transition={
        animate
          ? { type: 'spring', stiffness: 200, damping: 12 }
          : { duration: 0 }
      }
    >
      <circle
        cx="50"
        cy="50"
        r="30"
        fill="none"
        stroke={strokeColor}
        strokeWidth="10"
        strokeLinecap="round"
      />
    </motion.svg>
  );
}

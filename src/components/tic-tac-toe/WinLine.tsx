'use client';

import { motion } from 'framer-motion';

interface WinLineProps {
  cells: [[number, number], [number, number], [number, number]];
}

/**
 * Draws an animated SVG line through the three winning cells.
 * Positioned absolutely over the board grid.
 */
export function WinLine({ cells }: WinLineProps) {
  const [start, , end] = cells;

  // Convert grid position to percentage coordinates
  // Each cell is 1/3 of the board, center of cell is at (col + 0.5) / 3
  const x1 = ((start[1] + 0.5) / 3) * 100;
  const y1 = ((start[0] + 0.5) / 3) * 100;
  const x2 = ((end[1] + 0.5) / 3) * 100;
  const y2 = ((end[0] + 0.5) / 3) * 100;

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none z-10"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      <motion.line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke="rgba(45, 42, 38, 0.7)"
        strokeWidth="3"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{
          type: 'spring',
          stiffness: 100,
          damping: 12,
          delay: 0.2,
        }}
      />
    </svg>
  );
}

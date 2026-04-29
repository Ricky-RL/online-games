'use client';

import { motion } from 'framer-motion';
import { WordleCell } from './WordleCell';
import type { LetterState } from '@/lib/wordle-types';

interface WordleRowProps {
  letters: string;
  evaluation?: LetterState[];
  isActive?: boolean;
  isPreview?: boolean;
  animate?: boolean;
  shake?: boolean;
}

export function WordleRow({ letters, evaluation, isActive, isPreview, animate, shake }: WordleRowProps) {
  const cells = Array.from({ length: 5 }, (_, i) => ({
    letter: letters[i] || undefined,
    state: evaluation?.[i],
  }));

  return (
    <motion.div
      className="flex gap-[5px]"
      animate={shake ? { x: [0, -4, 4, -4, 4, -2, 2, 0] } : {}}
      transition={shake ? { duration: 0.4 } : {}}
    >
      {cells.map((cell, i) => (
        <WordleCell
          key={i}
          letter={cell.letter}
          state={cell.state}
          isActive={isActive}
          isPreview={isPreview}
          delay={animate ? i * 0.3 : 0}
        />
      ))}
    </motion.div>
  );
}

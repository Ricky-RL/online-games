'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { LetterState } from '@/lib/wordle-types';

interface WordleCellProps {
  letter?: string;
  state?: LetterState;
  isActive?: boolean;
  isPreview?: boolean;
  delay?: number;
}

function getBackgroundColor(state?: LetterState): string {
  switch (state) {
    case 'correct': return 'var(--color-wordle-correct)';
    case 'present': return 'var(--color-wordle-present)';
    case 'absent': return 'var(--color-wordle-absent)';
    default: return 'transparent';
  }
}

export function WordleCell({ letter, state, isActive, isPreview, delay = 0 }: WordleCellProps) {
  const hasLetter = !!letter;
  const isEvaluated = !!state;
  const [phase, setPhase] = useState<'idle' | 'flipping' | 'revealed'>(
    isEvaluated ? 'idle' : 'idle'
  );

  useEffect(() => {
    if (!isEvaluated) return;

    const flipStart = setTimeout(() => {
      setPhase('flipping');
    }, delay * 1000);

    const flipMid = setTimeout(() => {
      setPhase('revealed');
    }, (delay + 0.4) * 1000);

    return () => {
      clearTimeout(flipStart);
      clearTimeout(flipMid);
    };
  }, [isEvaluated, delay]);

  const showColor = phase === 'revealed';

  return (
    <motion.div
      className="relative w-[52px] h-[52px] sm:w-[62px] sm:h-[62px] flex items-center justify-center text-2xl sm:text-3xl font-bold uppercase select-none"
      style={{
        border: showColor
          ? 'none'
          : hasLetter
            ? '2px solid var(--color-text-secondary)'
            : '2px solid var(--color-border)',
        backgroundColor: showColor ? getBackgroundColor(state) : 'var(--color-surface)',
        color: showColor ? '#ffffff' : isPreview ? 'var(--color-text-secondary)' : 'var(--color-text-primary)',
        opacity: isPreview ? 0.4 : 1,
        borderRadius: '8px',
        perspective: '400px',
      }}
      initial={false}
      animate={
        phase === 'flipping'
          ? { rotateX: 90, transition: { duration: 0.35, ease: 'easeIn' } }
          : phase === 'revealed'
            ? { rotateX: 0, transition: { duration: 0.35, ease: 'easeOut' } }
            : hasLetter && isActive
              ? { scale: [1, 1.1, 1], transition: { duration: 0.15 } }
              : { rotateX: 0 }
      }
    >
      {letter || ''}
    </motion.div>
  );
}

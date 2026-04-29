'use client';

import { motion } from 'framer-motion';
import type { KeyboardState } from '@/lib/wordle-types';

interface WordleKeyboardProps {
  keyboardState: KeyboardState;
  onKeyPress: (key: string) => void;
  onEnter: () => void;
  onBackspace: () => void;
  disabled?: boolean;
}

const ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACK'],
];

function getKeyColor(key: string, state: KeyboardState): string {
  const letterState = state[key];
  switch (letterState) {
    case 'correct': return 'var(--color-wordle-correct)';
    case 'present': return 'var(--color-wordle-present)';
    case 'absent': return 'var(--color-wordle-absent)';
    default: return 'var(--color-border)';
  }
}

function getKeyTextColor(key: string, state: KeyboardState): string {
  const letterState = state[key];
  if (letterState) return '#ffffff';
  return 'var(--color-text-primary)';
}

export function WordleKeyboard({ keyboardState, onKeyPress, onEnter, onBackspace, disabled }: WordleKeyboardProps) {
  const handleClick = (key: string) => {
    if (disabled) return;
    if (key === 'ENTER') {
      onEnter();
    } else if (key === 'BACK') {
      onBackspace();
    } else {
      onKeyPress(key);
    }
  };

  return (
    <div className="flex flex-col items-center gap-1.5 w-full max-w-[500px]">
      {ROWS.map((row, rowIdx) => (
        <div key={rowIdx} className="flex gap-1 sm:gap-1.5 justify-center w-full">
          {row.map((key) => {
            const isWide = key === 'ENTER' || key === 'BACK';
            return (
              <motion.button
                key={key}
                onClick={() => handleClick(key)}
                disabled={disabled}
                whileTap={{ scale: 0.95 }}
                className="flex items-center justify-center rounded-md font-semibold text-xs sm:text-sm cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 select-none"
                style={{
                  backgroundColor: isWide ? 'var(--color-border)' : getKeyColor(key, keyboardState),
                  color: isWide ? 'var(--color-text-primary)' : getKeyTextColor(key, keyboardState),
                  minWidth: isWide ? '58px' : '30px',
                  width: isWide ? '58px' : 'clamp(30px, 8vw, 43px)',
                  height: '52px',
                }}
              >
                {key === 'BACK' ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l-7-7 7-7M19 12H5" />
                  </svg>
                ) : key}
              </motion.button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

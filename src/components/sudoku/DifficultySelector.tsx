'use client';

import { motion } from 'framer-motion';
import type { Difficulty } from '@/lib/sudoku-logic';

interface DifficultySelectorProps {
  onSelect: (difficulty: Difficulty) => void;
}

const difficulties: { value: Difficulty; label: string; description: string; color: string }[] = [
  { value: 'easy', label: 'Easy', description: '40 cells revealed — a relaxing solve', color: '#06D6A0' },
  { value: 'medium', label: 'Medium', description: '32 cells revealed — a good challenge', color: '#FFBE0B' },
  { value: 'hard', label: 'Hard', description: '26 cells revealed — for experts', color: '#E63946' },
];

export function DifficultySelector({ onSelect }: DifficultySelectorProps) {
  return (
    <div className="flex flex-col items-center gap-6">
      <p className="text-lg text-text-secondary">Choose difficulty</p>
      <div className="flex flex-col sm:flex-row items-stretch gap-3 w-full max-w-md">
        {difficulties.map(({ value, label, description, color }, i) => (
          <motion.button
            key={value}
            onClick={() => onSelect(value)}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.3 }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="flex-1 p-5 rounded-2xl border border-border bg-surface hover:shadow-lg transition-shadow cursor-pointer text-left"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-base font-semibold text-text-primary">{label}</span>
            </div>
            <p className="text-xs text-text-secondary">{description}</p>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

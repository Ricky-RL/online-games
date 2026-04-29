'use client';

import { motion } from 'framer-motion';

interface WordListProps {
  words: string[];
  foundWords: string[];
}

export function WordList({ words, foundWords }: WordListProps) {
  const sortedWords = [...words].sort((a, b) => a.localeCompare(b));

  return (
    <div className="flex flex-wrap gap-2 justify-center max-w-md">
      {sortedWords.map((word) => {
        const isFound = foundWords.includes(word);
        return (
          <motion.span
            key={word}
            animate={isFound ? { scale: [1, 1.1, 1] } : {}}
            transition={{ duration: 0.3 }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              isFound
                ? 'bg-green-500/20 text-green-400 line-through'
                : 'bg-surface border border-border text-text-primary'
            }`}
          >
            {word}
          </motion.span>
        );
      })}
    </div>
  );
}

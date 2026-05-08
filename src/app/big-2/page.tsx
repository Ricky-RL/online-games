'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { AutoMatchmakingPage } from '@/components/AutoMatchmakingPage';
import { createBigTwoBoard, type BigTwoRuleset } from '@/lib/big-2-rules';

export default function Big2Lobby() {
  const [mode, setMode] = useState<BigTwoRuleset | null>(null);

  if (mode) {
    const modeLabel = mode === 'classic' ? 'Classic' : 'Chaotic';
    return (
      <AutoMatchmakingPage
        gameType="big-2"
        label={`Big 2 (${modeLabel})`}
        filterGame={(game) => {
          const board = (game as { board?: { ruleset?: BigTwoRuleset } }).board;
          return (board?.ruleset ?? 'classic') === mode;
        }}
        createData={() => ({
          game_type: 'big-2',
          board: createBigTwoBoard(1, Math.random, mode),
          current_turn: 1,
          winner: null,
        })}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xl rounded-3xl border border-border bg-surface p-8 shadow-sm"
      >
        <h1 className="text-3xl font-bold tracking-tight text-text-primary">Big 2</h1>
        <p className="mt-2 text-sm text-text-secondary">Choose your ruleset</p>

        <div className="mt-6 grid gap-3">
          <button
            onClick={() => setMode('classic')}
            className="w-full rounded-2xl border border-border bg-background px-4 py-4 text-left hover:border-text-secondary/30 hover:bg-surface-hover transition-all cursor-pointer"
          >
            <p className="text-base font-semibold text-text-primary">Classic</p>
            <p className="mt-1 text-sm text-text-secondary">Original Big 2 in this app.</p>
          </button>
          <button
            onClick={() => setMode('chaotic')}
            className="w-full rounded-2xl border border-player1/25 bg-player1/5 px-4 py-4 text-left hover:bg-player1/10 hover:border-player1/40 transition-all cursor-pointer"
          >
            <p className="text-base font-semibold text-text-primary">Chaotic</p>
            <p className="mt-1 text-sm text-text-secondary">Single deck with 4-card burn, level wild heart, and bombs.</p>
          </button>
        </div>
      </motion.div>
    </div>
  );
}

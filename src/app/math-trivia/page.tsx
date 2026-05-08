'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { createMathTriviaBoard } from '@/lib/math-trivia-logic';
import { SettingsButton } from '@/components/SettingsButton';
import { getStoredUser } from '@/lib/players';
import { findOrCreateBoundGame } from '@/lib/matchmaking';

export default function MathTriviaLobby() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  const handleStart = useCallback(async () => {
    const currentUser = getStoredUser();
    if (!currentUser?.boundUserId) {
      router.push('/');
      return;
    }

    setCreating(true);
    const gameId = await findOrCreateBoundGame({
      gameType: 'math-trivia',
      currentUser,
      createData: () => ({
        game_type: 'math-trivia',
        board: createMathTriviaBoard(),
        current_turn: 0,
        winner: null,
      }),
    });

    if (gameId) router.push(`/math-trivia/${gameId}`);
    else setCreating(false);
  }, [router]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-screen px-4 py-8">
      <SettingsButton />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.21, 0.47, 0.32, 0.98] }}
        className="w-full max-w-md space-y-8 text-center"
      >
        <div>
          <h1 className="text-3xl font-bold text-text-primary mb-2">Math Trivia</h1>
          <p className="text-text-secondary">Answer 15 math questions as fast as you can. Fastest correct answers wins!</p>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-surface p-6 space-y-3 text-left">
            <InfoRow value="15" label="Questions (mix of easy & medium)" />
            <InfoRow value="3m" label="Time limit for all questions" />
            <InfoRow value="4" label="Multiple choice options each" />
          </div>

          <motion.button
            onClick={handleStart}
            disabled={creating}
            className="w-full py-4 px-6 rounded-2xl bg-[#F97316] text-white font-semibold text-lg hover:opacity-90 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-wait"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {creating ? 'Starting...' : 'Start Quiz'}
          </motion.button>
        </div>

        <button
          onClick={() => router.push('/')}
          className="w-full py-3 text-sm text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
        >
          Back to games
        </button>
      </motion.div>
    </div>
  );
}

function InfoRow({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-full bg-[#F97316]/10 flex items-center justify-center text-sm font-bold text-[#F97316]">
        {value}
      </div>
      <span className="text-sm text-text-secondary">{label}</span>
    </div>
  );
}

'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { THEME_PACKS } from '@/lib/word-search-themes';
import { createWordSearchBoard } from '@/lib/word-search-logic';
import { SettingsButton } from '@/components/SettingsButton';
import { getStoredUser } from '@/lib/players';
import { findOrCreateBoundGame } from '@/lib/matchmaking';

export default function WordSearchLobby() {
  const router = useRouter();
  const [creating, setCreating] = useState<string | null>(null);

  const handleSelectTheme = useCallback(async (themeId: string) => {
    const currentUser = getStoredUser();
    if (!currentUser?.boundUserId) {
      router.push('/');
      return;
    }

    setCreating(themeId);
    const pack = THEME_PACKS.find((p) => p.id === themeId);
    if (!pack) {
      setCreating(null);
      return;
    }

    const gameId = await findOrCreateBoundGame({
      gameType: 'word-search',
      currentUser,
      joinData: () => ({ current_turn: 2 }),
      createData: () => ({
        game_type: 'word-search',
        board: createWordSearchBoard(themeId, pack.words),
        current_turn: 1,
        winner: null,
      }),
    });

    if (gameId) router.push(`/word-search/${gameId}`);
    else setCreating(null);
  }, [router]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-screen px-4 py-8">
      <SettingsButton />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.21, 0.47, 0.32, 0.98] }}
        className="w-full max-w-md space-y-8"
      >
        <div className="text-center">
          <h1 className="text-3xl font-bold text-text-primary mb-2">Word Search</h1>
          <p className="text-text-secondary">Pick a theme pack</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {THEME_PACKS.map((pack, index) => (
            <motion.button
              key={pack.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => handleSelectTheme(pack.id)}
              disabled={creating !== null}
              className="p-4 rounded-2xl border border-border bg-surface hover:bg-background hover:border-border/80 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-wait text-left"
            >
              <div className="text-base font-semibold text-text-primary">{pack.name}</div>
              <div className="text-xs text-text-secondary mt-1">{pack.words.length} words</div>
              {creating === pack.id && (
                <div className="text-xs text-text-secondary mt-2">Creating...</div>
              )}
            </motion.button>
          ))}
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

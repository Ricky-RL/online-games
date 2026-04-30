'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { THEME_PACKS } from '@/lib/word-search-themes';
import { createWordSearchBoard } from '@/lib/word-search-logic';
import { SettingsButton } from '@/components/SettingsButton';
import { PLAYER_IDS, type PlayerName } from '@/lib/players';

export default function WordSearchLobby() {
  const router = useRouter();
  const [creating, setCreating] = useState<string | null>(null);

  const playerName = typeof window !== 'undefined'
    ? (sessionStorage.getItem('player-name') || localStorage.getItem('player-name'))
    : null;

  const handleSelectTheme = useCallback(async (themeId: string) => {
    if (!playerName || (playerName !== 'Ricky' && playerName !== 'Lilian')) return;
    setCreating(themeId);

    const { supabase } = await import('@/lib/supabase');
    const myId = PLAYER_IDS[playerName as PlayerName];

    // Check for existing active word-search game
    const { data: existing } = await supabase
      .from('games')
      .select('*')
      .eq('game_type', 'word-search')
      .is('winner', null)
      .order('created_at', { ascending: false })
      .limit(10);

    if (existing) {
      // Resume my game
      const myGame = existing.find((g) =>
        g.player1_name === playerName || g.player2_name === playerName
      );
      if (myGame) {
        router.push(`/word-search/${myGame.id}`);
        return;
      }

      // Join opponent's game (player2 slot is open)
      const joinable = existing.find((g) =>
        g.player2_name === null && g.player1_name !== null && g.player1_name !== playerName
      );
      if (joinable) {
        await supabase
          .from('games')
          .update({
            player2_id: myId,
            player2_name: playerName,
            updated_at: new Date().toISOString(),
          })
          .eq('id', joinable.id);

        router.push(`/word-search/${joinable.id}`);
        return;
      }
    }

    // Create new game. Creator is always player1 and goes first.
    const pack = THEME_PACKS.find((p) => p.id === themeId)!;
    const board = createWordSearchBoard(themeId, pack.words);

    const insertData = {
      game_type: 'word-search',
      board,
      current_turn: 1 as const,
      winner: null,
      player1_id: myId,
      player1_name: playerName,
      player2_id: null,
      player2_name: null,
    };

    const { data, error } = await supabase
      .from('games')
      .insert(insertData)
      .select('id')
      .single();

    if (error || !data) {
      console.error('Error creating word search game:', error);
      setCreating(null);
      return;
    }

    router.push(`/word-search/${data.id}`);
  }, [playerName, router]);

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

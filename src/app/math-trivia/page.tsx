'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { createMathTriviaBoard } from '@/lib/math-trivia-logic';
import { SettingsButton } from '@/components/SettingsButton';
import { PLAYER_IDS, type PlayerName } from '@/lib/players';

export default function MathTriviaLobby() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  const playerName = typeof window !== 'undefined'
    ? (sessionStorage.getItem('player-name') || localStorage.getItem('player-name'))
    : null;

  const handleStart = useCallback(async () => {
    if (!playerName || (playerName !== 'Ricky' && playerName !== 'Lilian')) return;
    setCreating(true);

    const { supabase } = await import('@/lib/supabase');
    const myId = PLAYER_IDS[playerName as PlayerName];

    // Check for existing active math-trivia game
    const { data: existing } = await supabase
      .from('games')
      .select('*')
      .eq('game_type', 'math-trivia')
      .is('winner', null)
      .order('created_at', { ascending: false })
      .limit(10);

    if (existing) {
      // Resume my game
      const myGame = existing.find((g) =>
        g.player1_name === playerName || g.player2_name === playerName
      );
      if (myGame) {
        router.push(`/math-trivia/${myGame.id}`);
        return;
      }

      // Join opponent's game (player2 slot is open)
      const joinable = existing.find((g) =>
        g.player2_name === null && g.player1_name !== null && g.player1_name !== playerName
      );
      if (joinable) {
        // BUG 3 FIX: Don't override current_turn when P2 joins — let P1 keep their turn
        await supabase
          .from('games')
          .update({
            player2_id: myId,
            player2_name: playerName,
            updated_at: new Date().toISOString(),
          })
          .eq('id', joinable.id);

        router.push(`/math-trivia/${joinable.id}`);
        return;
      }
    }

    // Create new game. Creator is always player1 and goes first.
    const board = createMathTriviaBoard();

    const insertData = {
      game_type: 'math-trivia',
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
      console.error('Error creating math trivia game:', error);
      setCreating(false);
      return;
    }

    router.push(`/math-trivia/${data.id}`);
  }, [playerName, router]);

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
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#F97316]/10 flex items-center justify-center text-sm font-bold text-[#F97316]">15</div>
              <span className="text-sm text-text-secondary">Questions (mix of easy & medium)</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#F97316]/10 flex items-center justify-center text-sm font-bold text-[#F97316]">3m</div>
              <span className="text-sm text-text-secondary">Time limit for all questions</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#F97316]/10 flex items-center justify-center text-sm font-bold text-[#F97316]">4</div>
              <span className="text-sm text-text-secondary">Multiple choice options each</span>
            </div>
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

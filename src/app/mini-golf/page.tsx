'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { createInitialBoard } from '@/lib/mini-golf/logic';
import { EASY_LEVEL_IDS, MEDIUM_LEVEL_IDS, HARD_LEVEL_IDS } from '@/lib/mini-golf/levels';

type PlayerName = 'Ricky' | 'Lilian';

const PLAYER_IDS: Record<PlayerName, string> = {
  Ricky: '00000000-0000-0000-0000-000000000001',
  Lilian: '00000000-0000-0000-0000-000000000002',
};

export default function MiniGolfLobby() {
  const router = useRouter();
  const [playerName, setPlayerName] = useState<PlayerName | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem('player-name') || localStorage.getItem('player-name');
    if (stored === 'Ricky' || stored === 'Lilian') {
      setPlayerName(stored);
    } else {
      router.push('/');
    }
  }, [router]);

  useEffect(() => {
    if (playerName) {
      connect(playerName);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerName]);

  async function connect(name: PlayerName) {
    const playerId = PLAYER_IDS[name];

    const { data: games } = await supabase
      .from('games')
      .select('*')
      .eq('game_type', 'mini-golf')
      .is('winner', null)
      .order('created_at', { ascending: false })
      .limit(10);

    if (games && games.length > 0) {
      const myGame = games.find(
        (g) => g.player1_id === playerId || g.player2_id === playerId
      );
      if (myGame) {
        router.push(`/mini-golf/${myGame.id}`);
        return;
      }

      const joinable = games.find(
        (g) => g.player1_id !== playerId && !g.player2_id
      );
      if (joinable) {
        await supabase
          .from('games')
          .update({
            player2_id: playerId,
            player2_name: name,
            board: { ...joinable.board, phase: 'aiming' },
            updated_at: new Date().toISOString(),
          })
          .eq('id', joinable.id)
          .is('player2_id', null);

        router.push(`/mini-golf/${joinable.id}`);
        return;
      }
    }

    await new Promise(resolve => setTimeout(resolve, 1000));

    const { data: retryGames } = await supabase
      .from('games')
      .select('*')
      .eq('game_type', 'mini-golf')
      .is('winner', null)
      .order('created_at', { ascending: false })
      .limit(10);

    if (retryGames && retryGames.length > 0) {
      const joinable = retryGames.find(
        (g) => g.player1_id !== playerId && !g.player2_id
      );
      if (joinable) {
        await supabase
          .from('games')
          .update({
            player2_id: playerId,
            player2_name: name,
            board: { ...joinable.board, phase: 'aiming' },
            updated_at: new Date().toISOString(),
          })
          .eq('id', joinable.id)
          .is('player2_id', null);

        router.push(`/mini-golf/${joinable.id}`);
        return;
      }
    }

    const board = createInitialBoard(EASY_LEVEL_IDS, MEDIUM_LEVEL_IDS, HARD_LEVEL_IDS);

    const { data: newGame } = await supabase
      .from('games')
      .insert({
        game_type: 'mini-golf',
        board,
        current_turn: 1,
        player1_id: playerId,
        player1_name: name,
      })
      .select()
      .single();

    if (newGame) {
      router.push(`/mini-golf/${newGame.id}`);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center"
      >
        <div className="w-8 h-8 border-2 border-board border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-text-secondary">Finding a game...</p>
      </motion.div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getPlayerId } from '@/lib/player-id';
import { createEmptyBoard } from '@/lib/game-logic';

export function NewGameButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    setLoading(true);
    try {
      const playerId = getPlayerId();
      const { data, error } = await supabase
        .from('games')
        .insert({
          game_type: 'connect-four',
          board: createEmptyBoard(),
          current_turn: 1,
          winner: null,
          player1_id: playerId,
          player1_name: 'Player 1',
          player2_id: null,
          player2_name: null,
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error creating game:', error);
        setLoading(false);
        return;
      }

      router.push(`/connect-four/${data.id}`);
    } catch (err) {
      console.error('Error creating game:', err);
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleCreate}
      disabled={loading}
      className="px-8 py-4 text-lg font-semibold rounded-2xl bg-board text-white hover:bg-board-surface transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
    >
      {loading ? 'Creating...' : 'New Game'}
    </button>
  );
}

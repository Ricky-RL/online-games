'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { createEmptyBoard } from '@/lib/game-logic';

type PlayerName = 'Ricky' | 'Lilian';

const PLAYER_IDS: Record<PlayerName, string> = {
  Ricky: '00000000-0000-0000-0000-000000000001',
  Lilian: '00000000-0000-0000-0000-000000000002',
};

export default function Home() {
  const router = useRouter();
  const [connecting, setConnecting] = useState<PlayerName | null>(null);

  const connect = useCallback(
    async (name: PlayerName) => {
      setConnecting(name);
      sessionStorage.setItem('player-name', name);
      localStorage.setItem('player-name', name);

      const isRicky = name === 'Ricky';
      const myId = PLAYER_IDS[name];

      // Look for an active game I'm already part of, or one waiting for me
      const { data: existingGames } = await supabase
        .from('games')
        .select('*')
        .eq('game_type', 'connect-four')
        .is('winner', null)
        .order('created_at', { ascending: false })
        .limit(10);

      // Find a game that's in progress with me already in it (resume)
      const myActiveGame = existingGames?.find((g) => {
        if (isRicky) return g.player1_name === 'Ricky';
        return g.player2_name === 'Lilian';
      });

      if (myActiveGame) {
        router.push(`/connect-four/${myActiveGame.id}`);
        return;
      }

      // Find a game the other player started that I can join
      const joinableGame = existingGames?.find((g) => {
        if (isRicky) {
          return g.player1_name === null && g.player2_name === 'Lilian';
        } else {
          return g.player2_name === null && g.player1_name === 'Ricky';
        }
      });

      if (joinableGame) {
        const updateField = isRicky
          ? { player1_id: myId, player1_name: name }
          : { player2_id: myId, player2_name: name };

        const { error: joinError } = await supabase
          .from('games')
          .update({
            ...updateField,
            updated_at: new Date().toISOString(),
          })
          .eq('id', joinableGame.id)
          .select()
          .single();

        if (joinError) {
          console.error('Error joining game:', joinError);
          setConnecting(null);
          return;
        }

        router.push(`/connect-four/${joinableGame.id}`);
        return;
      }

      // No game exists — create one and go straight to the board
      // Creator always gets first turn
      const insertData = isRicky
        ? {
            game_type: 'connect-four',
            board: createEmptyBoard(),
            current_turn: 1 as const,
            winner: null,
            player1_id: myId,
            player1_name: name,
            player2_id: null,
            player2_name: null,
          }
        : {
            game_type: 'connect-four',
            board: createEmptyBoard(),
            current_turn: 2 as const,
            winner: null,
            player1_id: null,
            player1_name: null,
            player2_id: myId,
            player2_name: name,
          };

      const { data, error } = await supabase
        .from('games')
        .insert(insertData)
        .select('id')
        .single();

      if (error || !data) {
        console.error('Error creating game:', error);
        setConnecting(null);
        return;
      }

      router.push(`/connect-four/${data.id}`);
    },
    [router]
  );

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6">
      <main className="flex flex-col items-center gap-12 text-center">
        {/* Decorative circles */}
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-full bg-player1 opacity-60" />
          <div className="w-6 h-6 rounded-full bg-player2 opacity-60" />
          <div className="w-6 h-6 rounded-full bg-player1 opacity-60" />
          <div className="w-6 h-6 rounded-full bg-player2 opacity-60" />
        </div>

        {/* Title */}
        <div className="space-y-3">
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-text-primary">
            Connect Four
          </h1>
          <p className="text-lg text-text-secondary">Who are you?</p>
        </div>

        {/* Player selection */}
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <button
            onClick={() => connect('Ricky')}
            disabled={connecting !== null}
            className="px-8 py-4 text-lg font-semibold rounded-2xl bg-player1 text-white hover:opacity-90 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer min-w-[160px]"
          >
            {connecting === 'Ricky' ? 'Connecting...' : "I'm Ricky"}
          </button>
          <span className="text-text-secondary font-medium">or</span>
          <button
            onClick={() => connect('Lilian')}
            disabled={connecting !== null}
            className="px-8 py-4 text-lg font-semibold rounded-2xl bg-player2 text-text-primary hover:opacity-90 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer min-w-[160px]"
          >
            {connecting === 'Lilian' ? 'Connecting...' : "I'm Lilian"}
          </button>
        </div>

        {/* Footer decoration */}
        <div className="flex items-center gap-2 mt-8">
          <div className="w-3 h-3 rounded-full bg-board opacity-20" />
          <div className="w-2 h-2 rounded-full bg-board opacity-10" />
          <div className="w-1.5 h-1.5 rounded-full bg-board opacity-5" />
        </div>
      </main>
    </div>
  );
}

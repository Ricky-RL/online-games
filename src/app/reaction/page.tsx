'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { createReactionBoard } from '@/lib/reaction-logic';
import { type PlayerName, PLAYER_IDS, getStoredPlayerName } from '@/lib/players';

export default function ReactionLobby() {
  const router = useRouter();
  const [connecting, setConnecting] = useState<PlayerName | null>(null);
  const [checkedStorage, setCheckedStorage] = useState(false);

  const connect = useCallback(
    async (name: PlayerName) => {
      setConnecting(name);
      sessionStorage.setItem('player-name', name);
      localStorage.setItem('player-name', name);

      const myId = PLAYER_IDS[name];

      async function findGames() {
        const { data } = await supabase
          .from('games')
          .select('*')
          .eq('game_type', 'reaction')
          .is('winner', null)
          .order('created_at', { ascending: false })
          .limit(10);
        return data;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      function findMyGame(games: any[] | null) {
        if (!games) return { activeGame: null, joinableGame: null };

        const activeGame = games.find((g) => {
          return g.player1_name === name || g.player2_name === name;
        }) || null;

        const joinableGame = games.find((g) => {
          return g.player2_name === null && g.player1_name !== null && g.player1_name !== name;
        }) || null;

        return { activeGame, joinableGame };
      }

      // First attempt: look for existing games
      const existingGames = await findGames();
      let { activeGame, joinableGame } = findMyGame(existingGames);

      if (activeGame) {
        router.push(`/reaction/${activeGame.id}`);
        return;
      }

      if (joinableGame) {
        const boardUpdate = joinableGame.board?.phase === 'p1_done'
          ? { ...joinableGame.board, phase: 'p2_playing' }
          : undefined;
        const { error: joinError } = await supabase
          .from('games')
          .update({
            player2_id: myId,
            player2_name: name,
            ...(boardUpdate ? { board: boardUpdate } : {}),
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

        router.push(`/reaction/${joinableGame.id}`);
        return;
      }

      // Wait and retry to avoid race condition
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const retryGames = await findGames();
      ({ activeGame, joinableGame } = findMyGame(retryGames));

      if (activeGame) {
        router.push(`/reaction/${activeGame.id}`);
        return;
      }

      if (joinableGame) {
        const boardUpdate = joinableGame.board?.phase === 'p1_done'
          ? { ...joinableGame.board, phase: 'p2_playing' }
          : undefined;
        const { error: joinError } = await supabase
          .from('games')
          .update({
            player2_id: myId,
            player2_name: name,
            ...(boardUpdate ? { board: boardUpdate } : {}),
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

        router.push(`/reaction/${joinableGame.id}`);
        return;
      }

      // Still no game — create one
      const insertData = {
        game_type: 'reaction',
        board: createReactionBoard(),
        current_turn: 1 as const,
        winner: null,
        player1_id: myId,
        player1_name: name,
        player2_id: null,
        player2_name: null,
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

      router.push(`/reaction/${data.id}`);
    },
    [router]
  );

  // Auto-connect if player name is already stored
  const hasAutoConnected = useRef(false);
  useEffect(() => {
    if (hasAutoConnected.current) return;
    const stored = getStoredPlayerName();
    if (stored) {
      hasAutoConnected.current = true;
      connect(stored);
    } else {
      setCheckedStorage(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!checkedStorage && connecting === null) {
    return null;
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6">
      <main className="flex flex-col items-center gap-12 text-center">
        {/* Decorative lightning bolts */}
        <div className="flex items-center gap-4">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <path d="M16 3L6 16h6l-2 9 10-13h-6l2-9z" fill="#FF6B35" opacity="0.7" />
          </svg>
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <circle cx="14" cy="14" r="8" fill="#FF6B35" opacity="0.5" />
          </svg>
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <path d="M16 3L6 16h6l-2 9 10-13h-6l2-9z" fill="#FF6B35" opacity="0.7" />
          </svg>
        </div>

        {/* Title */}
        <div className="space-y-3">
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-text-primary">
            Reaction
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

        {/* Back to home */}
        <button
          onClick={() => router.push('/')}
          className="text-sm text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
        >
          Back to games
        </button>
      </main>
    </div>
  );
}

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { createMemoryBoard } from '@/lib/memory-logic';
import { type PlayerName, PLAYER_IDS, getStoredPlayerName } from '@/lib/players';

export default function MemoryLobby() {
  const router = useRouter();
  const [connecting, setConnecting] = useState<PlayerName | null>(null);
  const [checkedStorage, setCheckedStorage] = useState(false);

  const connect = useCallback(
    async (name: PlayerName) => {
      setConnecting(name);
      sessionStorage.setItem('player-name', name);
      localStorage.setItem('player-name', name);

      const myId = PLAYER_IDS[name];

      // Helper to query for existing games
      async function findGames() {
        const { data } = await supabase
          .from('games')
          .select('*')
          .eq('game_type', 'memory')
          .is('winner', null)
          .order('created_at', { ascending: false })
          .limit(10);
        return data;
      }

      // Helper to find my active game or a joinable game
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      function findMyGame(games: any[] | null) {
        if (!games) return { activeGame: null, joinableGame: null };

        // Find a game that's in progress with me already in it (resume)
        const activeGame = games.find((g) => {
          return g.player1_name === name || g.player2_name === name;
        }) || null;

        // Find a game the other player started that I can join (player2 slot is open)
        const joinableGame = games.find((g) => {
          return g.player2_name === null && g.player1_name !== null && g.player1_name !== name;
        }) || null;

        return { activeGame, joinableGame };
      }

      // First attempt: look for existing games
      const existingGames = await findGames();
      let { activeGame, joinableGame } = findMyGame(existingGames);

      if (activeGame) {
        router.push(`/memory/${activeGame.id}`);
        return;
      }

      if (joinableGame) {
        // Join as player2. Explicitly set current_turn to 1 to ensure
        // the creator (player1) always gets the first turn.
        const { error: joinError } = await supabase
          .from('games')
          .update({
            player2_id: myId,
            player2_name: name,
            current_turn: 1,
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

        router.push(`/memory/${joinableGame.id}`);
        return;
      }

      // No game found yet. Wait briefly and retry to avoid a race condition
      // where both players query simultaneously, find nothing, and both create.
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const retryGames = await findGames();
      ({ activeGame, joinableGame } = findMyGame(retryGames));

      if (activeGame) {
        router.push(`/memory/${activeGame.id}`);
        return;
      }

      if (joinableGame) {
        // Join as player2. Explicitly set current_turn to 1 to ensure
        // the creator (player1) always gets the first turn.
        const { error: joinError } = await supabase
          .from('games')
          .update({
            player2_id: myId,
            player2_name: name,
            current_turn: 1,
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

        router.push(`/memory/${joinableGame.id}`);
        return;
      }

      // Still no game — create one. The creator is always player1 and goes first.
      const insertData = {
        game_type: 'memory',
        board: createMemoryBoard(),
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

      router.push(`/memory/${data.id}`);
    },
    [router]
  );

  // If the landing page already stored a player name, skip the identity prompt.
  // Use a ref to prevent double-execution in React Strict Mode.
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

  // While checking storage or auto-connecting, show a loading state
  if (!checkedStorage && connecting === null) {
    return null;
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6">
      <main className="flex flex-col items-center gap-12 text-center">
        {/* Decorative cards */}
        <div className="flex items-center gap-4">
          <span className="text-3xl opacity-60">🧠</span>
          <span className="text-3xl opacity-60">🃏</span>
          <span className="text-3xl opacity-60">🧠</span>
        </div>

        {/* Title */}
        <div className="space-y-3">
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-text-primary">
            Memory
          </h1>
          <p className="text-lg text-text-secondary">Who are you?</p>
        </div>

        {/* Player selection */}
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <button
            onClick={() => connect('Ricky')}
            disabled={connecting !== null}
            className="px-8 py-4 text-lg font-semibold rounded-2xl text-white hover:opacity-90 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer min-w-[160px]"
            style={{ backgroundColor: '#9B59B6' }}
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

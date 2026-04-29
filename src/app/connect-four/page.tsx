'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { createEmptyBoard } from '@/lib/game-logic';

type PlayerName = 'Ricky' | 'Lilian';

const PLAYER_IDS: Record<PlayerName, string> = {
  Ricky: '00000000-0000-0000-0000-000000000001',
  Lilian: '00000000-0000-0000-0000-000000000002',
};

function getStoredPlayerName(): PlayerName | null {
  const stored =
    sessionStorage.getItem('player-name') ||
    localStorage.getItem('player-name');
  if (stored === 'Ricky' || stored === 'Lilian') {
    return stored;
  }
  return null;
}

export default function ConnectFourLobby() {
  const router = useRouter();
  const [connecting, setConnecting] = useState<PlayerName | null>(null);
  const [checkedStorage, setCheckedStorage] = useState(false);

  const connect = useCallback(
    async (name: PlayerName) => {
      setConnecting(name);
      sessionStorage.setItem('player-name', name);
      localStorage.setItem('player-name', name);

      const isRicky = name === 'Ricky';
      const myId = PLAYER_IDS[name];

      // Helper to query for existing games
      async function findGames() {
        const { data } = await supabase
          .from('games')
          .select('*')
          .eq('game_type', 'connect-four')
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
          if (isRicky) return g.player1_name === 'Ricky';
          return g.player2_name === 'Lilian';
        }) || null;

        // Find a game the other player started that I can join
        const joinableGame = games.find((g) => {
          if (isRicky) {
            return g.player1_name === null && g.player2_name === 'Lilian';
          } else {
            return g.player2_name === null && g.player1_name === 'Ricky';
          }
        }) || null;

        return { activeGame, joinableGame };
      }

      // First attempt: look for existing games
      const existingGames = await findGames();
      let { activeGame, joinableGame } = findMyGame(existingGames);

      if (activeGame) {
        router.push(`/connect-four/${activeGame.id}`);
        return;
      }

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

      // No game found yet. Wait briefly and retry to avoid a race condition
      // where both players query simultaneously, find nothing, and both create.
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const retryGames = await findGames();
      ({ activeGame, joinableGame } = findMyGame(retryGames));

      if (activeGame) {
        router.push(`/connect-four/${activeGame.id}`);
        return;
      }

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

      // Still no game — create one. Player 1 (Ricky) is always the creator
      // when possible to reduce race likelihood, but either player can create.
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
            current_turn: 1 as const,
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

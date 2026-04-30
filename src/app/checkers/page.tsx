'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { createInitialBoard } from '@/lib/checkers-logic';
import { type PlayerName, PLAYER_IDS, getStoredPlayerName } from '@/lib/players';

export default function CheckersLobby() {
  const router = useRouter();
  const [connecting, setConnecting] = useState<PlayerName | null>(null);
  const [checkedStorage, setCheckedStorage] = useState(false);
  const [forcedJumps, setForcedJumps] = useState(true);

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
          .eq('game_type', 'checkers')
          .is('winner', null)
          .order('created_at', { ascending: false })
          .limit(10);
        return data;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      function findMyGame(games: any[] | null) {
        if (!games) return { activeGame: null, joinableGame: null };

        const activeGame = games.find((g) =>
          g.player1_name === name || g.player2_name === name
        ) || null;

        const joinableGame = games.find((g) =>
          g.player2_name === null && g.player1_name !== null && g.player1_name !== name
        ) || null;

        return { activeGame, joinableGame };
      }

      const existingGames = await findGames();
      let { activeGame, joinableGame } = findMyGame(existingGames);

      if (activeGame) {
        router.push(`/checkers/${activeGame.id}`);
        return;
      }

      if (joinableGame) {
        const { error: joinError } = await supabase
          .from('games')
          .update({
            player2_id: myId,
            player2_name: name,
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
        router.push(`/checkers/${joinableGame.id}`);
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));

      const retryGames = await findGames();
      ({ activeGame, joinableGame } = findMyGame(retryGames));

      if (activeGame) {
        router.push(`/checkers/${activeGame.id}`);
        return;
      }

      if (joinableGame) {
        const { error: joinError } = await supabase
          .from('games')
          .update({
            player2_id: myId,
            player2_name: name,
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
        router.push(`/checkers/${joinableGame.id}`);
        return;
      }

      const insertData = {
        game_type: 'checkers',
        board: createInitialBoard(forcedJumps),
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

      router.push(`/checkers/${data.id}`);
    },
    [router, forcedJumps]
  );

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

  if (!checkedStorage && connecting === null) return null;

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6">
      <main className="flex flex-col items-center gap-12 text-center">
        {/* Decorative checkers pieces */}
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-full bg-player1 opacity-70" />
          <div className="w-6 h-6 rounded-full bg-player2 opacity-70" />
          <div className="w-6 h-6 rounded-full bg-player1 opacity-70" />
        </div>

        <div className="space-y-3">
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-text-primary">
            Checkers
          </h1>
          <p className="text-lg text-text-secondary">Who are you?</p>
        </div>

        {/* Forced jumps toggle */}
        <div className="flex items-center gap-3">
          <label className="text-sm text-text-secondary cursor-pointer select-none flex items-center gap-2">
            <input
              type="checkbox"
              checked={forcedJumps}
              onChange={(e) => setForcedJumps(e.target.checked)}
              className="w-4 h-4 rounded accent-amber-600"
            />
            Forced jumps
          </label>
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

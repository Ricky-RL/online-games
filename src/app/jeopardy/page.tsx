'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { createInitialBoard, fetchTriviaQuestions } from '@/lib/jeopardy/logic';
import { type PlayerName, PLAYER_IDS, getStoredPlayerName } from '@/lib/players';

export default function JeopardyLobby() {
  const router = useRouter();
  const [connecting, setConnecting] = useState<PlayerName | null>(null);
  const [triviaError, setTriviaError] = useState<string | null>(null);
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
          .eq('game_type', 'jeopardy')
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

      async function joinGame(gameId: string) {
        const { error: joinError } = await supabase
          .from('games')
          .update({
            player2_id: myId,
            player2_name: name,
            updated_at: new Date().toISOString(),
          })
          .eq('id', gameId)
          .select()
          .single();

        if (joinError) {
          console.error('Error joining game:', joinError);
          setConnecting(null);
          return false;
        }
        return true;
      }

      const existingGames = await findGames();
      let { activeGame, joinableGame } = findMyGame(existingGames);

      if (activeGame) {
        router.push(`/jeopardy/${activeGame.id}`);
        return;
      }

      if (joinableGame) {
        if (await joinGame(joinableGame.id)) {
          router.push(`/jeopardy/${joinableGame.id}`);
        }
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));

      const retryGames = await findGames();
      ({ activeGame, joinableGame } = findMyGame(retryGames));

      if (activeGame) {
        router.push(`/jeopardy/${activeGame.id}`);
        return;
      }

      if (joinableGame) {
        if (await joinGame(joinableGame.id)) {
          router.push(`/jeopardy/${joinableGame.id}`);
        }
        return;
      }

      // Create new game — fetch trivia questions and build the board
      let categories;
      try {
        setTriviaError(null);
        categories = await fetchTriviaQuestions();
      } catch (err) {
        console.error('Failed to fetch trivia questions:', err);
        setTriviaError('Failed to load trivia questions. Please try again.');
        setConnecting(null);
        return;
      }
      const board = createInitialBoard(categories);

      const insertData = {
        game_type: 'jeopardy',
        board: board as unknown as Record<string, unknown>,
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

      router.push(`/jeopardy/${data.id}`);
    },
    [router]
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

  if (!checkedStorage && connecting === null) {
    return null;
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6">
      <main className="flex flex-col items-center gap-12 text-center">
        <div className="flex items-center gap-3">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <text x="4" y="22" fontSize="22" fill="#1A3A7A" fontFamily="serif" fontWeight="bold">J!</text>
          </svg>
        </div>

        <div className="space-y-3">
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-text-primary">
            Jeopardy
          </h1>
          <p className="text-lg text-text-secondary">Who are you?</p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <button
            onClick={() => connect('Ricky')}
            disabled={connecting !== null}
            className="px-8 py-4 text-lg font-semibold rounded-2xl bg-player1 text-white hover:opacity-90 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer min-w-[160px]"
          >
            {connecting === 'Ricky' ? 'Loading trivia...' : "I'm Ricky"}
          </button>
          <span className="text-text-secondary font-medium">or</span>
          <button
            onClick={() => connect('Lilian')}
            disabled={connecting !== null}
            className="px-8 py-4 text-lg font-semibold rounded-2xl bg-player2 text-text-primary hover:opacity-90 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer min-w-[160px]"
          >
            {connecting === 'Lilian' ? 'Loading trivia...' : "I'm Lilian"}
          </button>
        </div>

        {triviaError && (
          <div className="flex flex-col items-center gap-3">
            <p className="text-red-500 text-sm">{triviaError}</p>
            <button
              onClick={() => {
                setTriviaError(null);
                const stored = getStoredPlayerName();
                if (stored) connect(stored);
              }}
              className="px-6 py-2 text-sm font-medium rounded-xl bg-accent text-white hover:opacity-90 transition-colors cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

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

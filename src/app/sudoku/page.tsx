'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { createInitialBoard, type Difficulty } from '@/lib/sudoku-logic';
import { type PlayerName, PLAYER_IDS, getStoredPlayerName } from '@/lib/players';
import { DifficultySelector } from '@/components/sudoku/DifficultySelector';

export default function SudokuLobby() {
  const router = useRouter();
  const [connecting, setConnecting] = useState<PlayerName | null>(null);
  const [checkedStorage, setCheckedStorage] = useState(false);
  const [showDifficulty, setShowDifficulty] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerName | null>(null);

  const connect = useCallback(
    async (name: PlayerName, difficulty?: Difficulty) => {
      setConnecting(name);
      sessionStorage.setItem('player-name', name);
      localStorage.setItem('player-name', name);

      const myId = PLAYER_IDS[name];

      async function findGames() {
        const { data } = await supabase
          .from('games')
          .select('*')
          .eq('game_type', 'sudoku')
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

      const existingGames = await findGames();
      let { activeGame, joinableGame } = findMyGame(existingGames);

      if (activeGame) {
        router.push(`/sudoku/${activeGame.id}`);
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

        router.push(`/sudoku/${joinableGame.id}`);
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));

      const retryGames = await findGames();
      ({ activeGame, joinableGame } = findMyGame(retryGames));

      if (activeGame) {
        router.push(`/sudoku/${activeGame.id}`);
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

        router.push(`/sudoku/${joinableGame.id}`);
        return;
      }

      // No game found — need difficulty to create
      if (!difficulty) {
        setSelectedPlayer(name);
        setShowDifficulty(true);
        setConnecting(null);
        return;
      }

      const board = createInitialBoard(difficulty);

      const { data, error } = await supabase
        .from('games')
        .insert({
          game_type: 'sudoku',
          board,
          current_turn: 1,
          winner: null,
          player1_id: myId,
          player1_name: name,
          player2_id: null,
          player2_name: null,
        })
        .select('id')
        .single();

      if (error || !data) {
        console.error('Error creating game:', error);
        setConnecting(null);
        return;
      }

      router.push(`/sudoku/${data.id}`);
    },
    [router]
  );

  const handleDifficultySelect = useCallback(
    (difficulty: Difficulty) => {
      if (selectedPlayer) {
        setConnecting(selectedPlayer);
        connect(selectedPlayer, difficulty);
      }
    },
    [selectedPlayer, connect]
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

  if (!checkedStorage && connecting === null && !showDifficulty) {
    return null;
  }

  if (showDifficulty) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-8">
        <div className="space-y-3 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-text-primary">Sudoku</h1>
          <p className="text-text-secondary">New cooperative puzzle</p>
        </div>
        <DifficultySelector onSelect={handleDifficultySelect} />
        <button
          onClick={() => router.push('/')}
          className="text-sm text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
        >
          Back to games
        </button>
      </div>
    );
  }

  if (connecting) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-text-secondary text-sm">Connecting...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6">
      <main className="flex flex-col items-center gap-12 text-center">
        <div className="flex items-center gap-3">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <rect x="2" y="2" width="7" height="7" rx="1" stroke="#4A90D9" strokeWidth="1.5" opacity="0.8" />
            <rect x="10.5" y="2" width="7" height="7" rx="1" stroke="#4A90D9" strokeWidth="1.5" opacity="0.6" />
            <rect x="19" y="2" width="7" height="7" rx="1" stroke="#4A90D9" strokeWidth="1.5" opacity="0.8" />
            <rect x="2" y="10.5" width="7" height="7" rx="1" stroke="#4A90D9" strokeWidth="1.5" opacity="0.6" />
            <rect x="10.5" y="10.5" width="7" height="7" rx="1" stroke="#4A90D9" strokeWidth="1.5" opacity="0.8" />
            <rect x="19" y="10.5" width="7" height="7" rx="1" stroke="#4A90D9" strokeWidth="1.5" opacity="0.6" />
            <rect x="2" y="19" width="7" height="7" rx="1" stroke="#4A90D9" strokeWidth="1.5" opacity="0.8" />
            <rect x="10.5" y="19" width="7" height="7" rx="1" stroke="#4A90D9" strokeWidth="1.5" opacity="0.6" />
            <rect x="19" y="19" width="7" height="7" rx="1" stroke="#4A90D9" strokeWidth="1.5" opacity="0.8" />
          </svg>
        </div>

        <div className="space-y-3">
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-text-primary">
            Sudoku
          </h1>
          <p className="text-lg text-text-secondary">Who are you?</p>
        </div>

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

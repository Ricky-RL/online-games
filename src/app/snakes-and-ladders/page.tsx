'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { generateBoard } from '@/lib/snakes-and-ladders-logic';
import { type PlayerName, PLAYER_IDS } from '@/lib/players';

export default function SnakesAndLaddersLobby() {
  const router = useRouter();
  const [connecting, setConnecting] = useState(false);
  const [playerName, setPlayerName] = useState<PlayerName | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('player-name');
    if (stored === 'Ricky' || stored === 'Lilian') {
      setPlayerName(stored);
    }
  }, []);

  const handleSelectPlayer = (name: PlayerName) => {
    setPlayerName(name);
    sessionStorage.setItem('player-name', name);
    localStorage.setItem('player-name', name);
  };

  const handlePlay = useCallback(async () => {
    if (!playerName) return;
    setConnecting(true);

    const isRicky = playerName === 'Ricky';
    const myId = PLAYER_IDS[playerName];

    async function findGames() {
      const { data } = await supabase
        .from('games')
        .select('*')
        .eq('game_type', 'snakes-and-ladders')
        .is('winner', null)
        .order('created_at', { ascending: false })
        .limit(10);
      return data;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function findMyGame(games: any[] | null) {
      if (!games) return { activeGame: null, joinableGame: null };

      const activeGame = games.find((g) => {
        if (isRicky) return g.player1_name === 'Ricky';
        return g.player2_name === 'Lilian';
      }) || null;

      const joinableGame = games.find((g) => {
        if (isRicky) {
          return g.player1_name === null && g.player2_name === 'Lilian';
        } else {
          return g.player2_name === null && g.player1_name === 'Ricky';
        }
      }) || null;

      return { activeGame, joinableGame };
    }

    async function joinGame(gameId: string) {
      const updateField = isRicky
        ? { player1_id: myId, player1_name: playerName }
        : { player2_id: myId, player2_name: playerName };

      const { error: joinError } = await supabase
        .from('games')
        .update({
          ...updateField,
          updated_at: new Date().toISOString(),
        })
        .eq('id', gameId)
        .select()
        .single();

      if (joinError) {
        console.error('Error joining game:', joinError);
        setConnecting(false);
        return false;
      }
      return true;
    }

    // First attempt
    const existingGames = await findGames();
    let { activeGame, joinableGame } = findMyGame(existingGames);

    if (activeGame) {
      router.push(`/snakes-and-ladders/${activeGame.id}`);
      return;
    }

    if (joinableGame) {
      if (await joinGame(joinableGame.id)) {
        router.push(`/snakes-and-ladders/${joinableGame.id}`);
      }
      return;
    }

    // Wait and retry
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const retryGames = await findGames();
    ({ activeGame, joinableGame } = findMyGame(retryGames));

    if (activeGame) {
      router.push(`/snakes-and-ladders/${activeGame.id}`);
      return;
    }

    if (joinableGame) {
      if (await joinGame(joinableGame.id)) {
        router.push(`/snakes-and-ladders/${joinableGame.id}`);
      }
      return;
    }

    // Create new game
    const board = generateBoard();
    const insertData = isRicky
      ? {
          game_type: 'snakes-and-ladders',
          board,
          current_turn: 1 as const,
          winner: null,
          player1_id: myId,
          player1_name: playerName,
          player2_id: null,
          player2_name: null,
        }
      : {
          game_type: 'snakes-and-ladders',
          board,
          current_turn: 2 as const,
          winner: null,
          player1_id: null,
          player1_name: null,
          player2_id: myId,
          player2_name: playerName,
        };

    const { data, error } = await supabase
      .from('games')
      .insert(insertData)
      .select('id')
      .single();

    if (error || !data) {
      console.error('Error creating game:', error);
      setConnecting(false);
      return;
    }

    router.push(`/snakes-and-ladders/${data.id}`);
  }, [playerName, router]);

  // Auto-play if player already selected
  useEffect(() => {
    if (playerName && !connecting) {
      handlePlay();
    }
  }, [playerName, handlePlay, connecting]);

  if (!playerName) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 gap-8">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-bold text-text-primary"
        >
          Snakes & Ladders
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-text-secondary"
        >
          Who are you?
        </motion.p>
        <div className="flex gap-4">
          <button
            onClick={() => handleSelectPlayer('Ricky')}
            className="px-8 py-4 text-lg font-semibold rounded-2xl bg-player1 text-white hover:opacity-90 transition-all cursor-pointer"
          >
            Ricky
          </button>
          <button
            onClick={() => handleSelectPlayer('Lilian')}
            className="px-8 py-4 text-lg font-semibold rounded-2xl bg-player2 text-text-primary hover:opacity-90 transition-all cursor-pointer"
          >
            Lilian
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6">
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-text-secondary"
      >
        {connecting ? 'Connecting...' : 'Loading...'}
      </motion.p>
    </div>
  );
}

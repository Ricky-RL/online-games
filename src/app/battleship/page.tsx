'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { generateRandomPlacement } from '@/lib/battleship-logic';
import type { BattleshipBoardState } from '@/lib/types';

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

export default function BattleshipLobby() {
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

      async function findGames() {
        const { data } = await supabase
          .from('games')
          .select('*')
          .eq('game_type', 'battleship')
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
          ? { player1_id: myId, player1_name: name }
          : { player2_id: myId, player2_name: name };

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
          setConnecting(null);
          return false;
        }
        return true;
      }

      const existingGames = await findGames();
      let { activeGame, joinableGame } = findMyGame(existingGames);

      if (activeGame) {
        router.push(`/battleship/${activeGame.id}`);
        return;
      }

      if (joinableGame) {
        if (await joinGame(joinableGame.id)) {
          router.push(`/battleship/${joinableGame.id}`);
        }
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));

      const retryGames = await findGames();
      ({ activeGame, joinableGame } = findMyGame(retryGames));

      if (activeGame) {
        router.push(`/battleship/${activeGame.id}`);
        return;
      }

      if (joinableGame) {
        if (await joinGame(joinableGame.id)) {
          router.push(`/battleship/${joinableGame.id}`);
        }
        return;
      }

      const board: BattleshipBoardState = {
        player1Ships: generateRandomPlacement(),
        player2Ships: generateRandomPlacement(),
        player1Attacks: [],
        player2Attacks: [],
        phase: 'playing',
      };

      const insertData = isRicky
        ? {
            game_type: 'battleship',
            board,
            current_turn: 1 as const,
            winner: null,
            player1_id: myId,
            player1_name: name,
            player2_id: null,
            player2_name: null,
          }
        : {
            game_type: 'battleship',
            board,
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

      router.push(`/battleship/${data.id}`);
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
        <div className="flex items-center gap-4">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <path d="M4 18L6 22H22L24 18H4Z" fill="#E63946" opacity="0.8" />
            <rect x="8" y="14" width="12" height="4" rx="1" fill="#FFBE0B" opacity="0.7" />
            <rect x="13" y="8" width="2" height="6" fill="#FFBE0B" opacity="0.6" />
            <path d="M15 8L20 10L15 12Z" fill="#E63946" opacity="0.7" />
          </svg>
        </div>

        <div className="space-y-3">
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-text-primary">
            Battleship
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

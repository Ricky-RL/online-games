'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { makeMove as computeMove, checkWin, isDraw } from '@/lib/game-logic';
import { getPlayerId } from '@/lib/player-id';
import type { Game, Player, Board } from '@/lib/types';

interface UseGameReturn {
  game: Game | null;
  loading: boolean;
  error: string | null;
  lastMove: { col: number; row: number } | null;
  makeMove: (column: number) => Promise<void>;
  joinGame: (playerName: string) => Promise<void>;
}

export function useGame(gameId: string): UseGameReturn {
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastMove, setLastMove] = useState<{ col: number; row: number } | null>(null);
  const optimisticBoard = useRef<Board | null>(null);

  // Fetch initial game state
  useEffect(() => {
    async function fetchGame() {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('games')
        .select('*')
        .eq('id', gameId)
        .single();

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setGame(data as Game);
      }
      setLoading(false);
    }

    fetchGame();
  }, [gameId]);

  // Subscribe to realtime changes
  useEffect(() => {
    const channel = supabase
      .channel(`game-${gameId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'games',
          filter: `id=eq.${gameId}`,
        },
        (payload) => {
          const incoming = payload.new as Game;

          // Suppress echo: if incoming board matches our optimistic update, ignore
          if (
            optimisticBoard.current &&
            JSON.stringify(incoming.board) ===
              JSON.stringify(optimisticBoard.current)
          ) {
            optimisticBoard.current = null;
            return;
          }

          optimisticBoard.current = null;

          // Compute opponent's lastMove by diffing boards
          setGame((prev) => {
            if (prev) {
              for (let col = 0; col < 7; col++) {
                if (incoming.board[col].length > prev.board[col].length) {
                  setLastMove({ col, row: incoming.board[col].length - 1 });
                  break;
                }
              }
            }
            return incoming;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId]);

  const makeMove = useCallback(
    async (column: number) => {
      if (!game) return;

      const playerId = getPlayerId();
      const isPlayer1 = game.player1_id === playerId;
      const isPlayer2 = game.player2_id === playerId;

      if (!isPlayer1 && !isPlayer2) {
        setError('You are not a player in this game');
        return;
      }

      const myPlayerNumber: Player = isPlayer1 ? 1 : 2;
      if (game.current_turn !== myPlayerNumber) {
        setError('Not your turn');
        return;
      }

      if (game.winner !== null) {
        setError('Game is already over');
        return;
      }

      // Compute new board
      const newBoard = computeMove(game.board, column, myPlayerNumber);
      if (!newBoard) {
        setError('Column is full');
        return;
      }

      // Check for win
      const row = newBoard[column].length - 1;
      const winPositions = checkWin(newBoard, column, row, myPlayerNumber);
      const winner = winPositions ? myPlayerNumber : null;

      // Determine next turn
      const nextTurn: Player = myPlayerNumber === 1 ? 2 : 1;

      // Optimistic update
      optimisticBoard.current = newBoard;
      setLastMove({ col: column, row });
      setGame((prev) =>
        prev
          ? {
              ...prev,
              board: newBoard,
              current_turn: winner ? prev.current_turn : nextTurn,
              winner,
            }
          : null
      );
      setError(null);

      // Persist to Supabase
      const { error: updateError } = await supabase
        .from('games')
        .update({
          board: newBoard,
          current_turn: winner ? game.current_turn : nextTurn,
          winner,
          updated_at: new Date().toISOString(),
        })
        .eq('id', gameId);

      if (updateError) {
        // Re-fetch instead of using stale closure
        optimisticBoard.current = null;
        const { data: freshGame } = await supabase
          .from('games')
          .select('*')
          .eq('id', gameId)
          .single();
        if (freshGame) setGame(freshGame as Game);
        setError(updateError.message);
      }
    },
    [game, gameId]
  );

  const joinGame = useCallback(
    async (playerName: string) => {
      if (!game) return;

      const playerId = getPlayerId();

      const { data, error: updateError } = await supabase
        .from('games')
        .update({
          player2_id: playerId,
          player2_name: playerName,
          updated_at: new Date().toISOString(),
        })
        .eq('id', gameId)
        .is('player2_id', null)
        .select();

      if (updateError) {
        setError(updateError.message);
      } else if (!data || data.length === 0) {
        const { data: freshGame } = await supabase
          .from('games')
          .select('*')
          .eq('id', gameId)
          .single();
        if (freshGame) setGame(freshGame as Game);
        setError('Someone else already joined this game');
      } else {
        setGame((prev) =>
          prev
            ? { ...prev, player2_id: playerId, player2_name: playerName }
            : null
        );
      }
    },
    [game, gameId]
  );

  return { game, loading, error, lastMove, makeMove, joinGame };
}

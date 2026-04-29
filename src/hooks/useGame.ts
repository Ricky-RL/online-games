'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { makeMove as computeMove, checkWin } from '@/lib/game-logic';
import type { Game, Player, Board } from '@/lib/types';

const POLL_INTERVAL_MS = 1500;

function getMyName(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('player-name') || localStorage.getItem('player-name');
}

function totalMoves(board: Board): number {
  return board.reduce((sum, col) => sum + col.length, 0);
}

interface UseGameReturn {
  game: Game | null;
  loading: boolean;
  error: string | null;
  lastMove: { col: number; row: number } | null;
  deleted: boolean;
  makeMove: (column: number) => Promise<void>;
  resetGame: () => Promise<void>;
}

export function useGame(gameId: string): UseGameReturn {
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastMove, setLastMove] = useState<{ col: number; row: number } | null>(null);
  const [deleted, setDeleted] = useState(false);
  const optimisticBoard = useRef<Board | null>(null);
  const gameRef = useRef<Game | null>(null);

  const updateGame = useCallback((updater: Game | null | ((prev: Game | null) => Game | null)) => {
    setGame((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      gameRef.current = next;
      return next;
    });
  }, []);

  const fetchGame = useCallback(async () => {
    const { data, error: fetchError } = await supabase
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        setDeleted(true);
        return null;
      }
      setError(fetchError.message);
      return null;
    }

    if (data.game_type === 'ended') {
      setDeleted(true);
      return null;
    }

    return data as Game;
  }, [gameId]);

  // Initial fetch
  useEffect(() => {
    let cancelled = false;
    async function init() {
      setLoading(true);
      const gameData = await fetchGame();
      if (cancelled) return;
      if (gameData) {
        updateGame(gameData);
      }
      setLoading(false);
    }
    init();
    return () => { cancelled = true; };
  }, [fetchGame, updateGame]);

  // Poll for changes
  useEffect(() => {
    if (deleted) return;

    const interval = setInterval(async () => {
      const fresh = await fetchGame();
      if (!fresh) return;

      updateGame((prev) => {
        if (!prev) return fresh;

        if (optimisticBoard.current) {
          if (JSON.stringify(fresh.board) === JSON.stringify(optimisticBoard.current)) {
            optimisticBoard.current = null;
            return fresh;
          }
          // If the board was fully reset (game ended), accept the fresh state.
          if (totalMoves(fresh.board) === 0) {
            optimisticBoard.current = null;
            return fresh;
          }
          if (totalMoves(fresh.board) < totalMoves(prev.board)) {
            return {
              ...prev,
              player1_name: fresh.player1_name,
              player2_name: fresh.player2_name,
              player1_id: fresh.player1_id,
              player2_id: fresh.player2_id,
            };
          }
          optimisticBoard.current = null;
        }

        if (JSON.stringify(fresh) === JSON.stringify(prev)) return prev;

        // If the board was completely reset (e.g. game ended), accept it.
        // Only guard against partial regressions from out-of-order polls.
        const freshMoves = totalMoves(fresh.board);
        const prevMoves = totalMoves(prev.board);
        if (freshMoves < prevMoves && freshMoves > 0) {
          return prev;
        }

        if (totalMoves(fresh.board) > totalMoves(prev.board)) {
          for (let col = 0; col < 7; col++) {
            if (fresh.board[col].length > prev.board[col].length) {
              setLastMove({ col, row: fresh.board[col].length - 1 });
              break;
            }
          }
        }

        return fresh;
      });
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [gameId, fetchGame, updateGame, deleted]);

  const makeMove = useCallback(
    async (column: number) => {
      const currentGame = gameRef.current;
      if (!currentGame) return;

      const myName = getMyName();
      if (!myName) {
        setError('No player name set');
        return;
      }

      const isPlayer1 = currentGame.player1_name === myName;
      const isPlayer2 = currentGame.player2_name === myName;

      if (!isPlayer1 && !isPlayer2) {
        setError('You are not a player in this game');
        return;
      }

      const myPlayerNumber: Player = isPlayer1 ? 1 : 2;

      if (currentGame.current_turn !== myPlayerNumber) {
        setError('Not your turn');
        return;
      }

      if (currentGame.winner !== null) {
        setError('Game is already over');
        return;
      }

      const newBoard = computeMove(currentGame.board, column, myPlayerNumber);
      if (!newBoard) {
        setError('Column is full');
        return;
      }

      const row = newBoard[column].length - 1;
      const winPositions = checkWin(newBoard, column, row, myPlayerNumber);
      const winner = winPositions ? myPlayerNumber : null;

      const nextTurn: Player = myPlayerNumber === 1 ? 2 : 1;

      optimisticBoard.current = newBoard;
      setLastMove({ col: column, row });
      updateGame((prev) =>
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

      const { error: updateError } = await supabase
        .from('games')
        .update({
          board: newBoard,
          current_turn: winner ? currentGame.current_turn : nextTurn,
          winner,
          updated_at: new Date().toISOString(),
        })
        .eq('id', gameId);

      if (updateError) {
        optimisticBoard.current = null;
        const { data: freshGame } = await supabase
          .from('games')
          .select('*')
          .eq('id', gameId)
          .single();
        if (freshGame) updateGame(freshGame as Game);
        setError(updateError.message);
      }
    },
    [gameId, updateGame]
  );

  const resetGame = useCallback(async () => {
    // First, reset the board and clear player names so the game won't be
    // matched by findMyGame even if the subsequent delete is delayed.
    const { error: resetError } = await supabase
      .from('games')
      .update({
        game_type: 'ended',
        board: [[], [], [], [], [], [], []],
        current_turn: 1,
        winner: null,
        player1_name: null,
        player2_name: null,
        player1_id: null,
        player2_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', gameId);

    if (resetError) {
      console.error('Error resetting game:', resetError);
      setError(resetError.message);
      return;
    }

    // Then delete the row entirely.
    const { error: deleteError } = await supabase
      .from('games')
      .delete()
      .eq('id', gameId);

    if (deleteError) {
      console.error('Error deleting game:', deleteError);
      // Non-fatal: the game is already cleared, so proceed with redirect.
    }

    setDeleted(true);
  }, [gameId]);

  return { game, loading, error, lastMove, deleted, makeMove, resetGame };
}

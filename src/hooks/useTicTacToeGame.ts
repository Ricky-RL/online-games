'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import {
  makeMove as computeMove,
  checkWin,
  isDraw,
} from '@/lib/tic-tac-toe-logic';
import { recordMatchResult } from '@/lib/match-results';
import type { Player, TicTacToeBoard } from '@/lib/types';

const POLL_INTERVAL_MS = 1500;

export interface TicTacToeGame {
  id: string;
  game_type: string;
  board: TicTacToeBoard;
  current_turn: Player;
  winner: Player | null;
  player1_id: string | null;
  player2_id: string | null;
  player1_name: string | null;
  player2_name: string | null;
  created_at: string;
  updated_at: string;
}

function getMyName(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('player-name') || localStorage.getItem('player-name');
}

function totalMoves(board: TicTacToeBoard): number {
  return board.reduce(
    (sum, row) => sum + row.filter((cell) => cell !== null).length,
    0
  );
}

interface UseTicTacToeGameReturn {
  game: TicTacToeGame | null;
  loading: boolean;
  error: string | null;
  lastMove: { row: number; col: number } | null;
  deleted: boolean;
  makeMove: (row: number, col: number) => Promise<void>;
  resetGame: () => Promise<void>;
}

export function useTicTacToeGame(gameId: string): UseTicTacToeGameReturn {
  const [game, setGame] = useState<TicTacToeGame | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastMove, setLastMove] = useState<{ row: number; col: number } | null>(null);
  const [deleted, setDeleted] = useState(false);
  const optimisticBoard = useRef<TicTacToeBoard | null>(null);
  const gameRef = useRef<TicTacToeGame | null>(null);
  const matchRecorded = useRef(false);

  const updateGame = useCallback(
    (updater: TicTacToeGame | null | ((prev: TicTacToeGame | null) => TicTacToeGame | null)) => {
      setGame((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        gameRef.current = next;
        return next;
      });
    },
    []
  );

  const fetchGame = useCallback(async () => {
    const { data, error: fetchError } = await supabase
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        updateGame(null);
        setDeleted(true);
        return null;
      }
      setError(fetchError.message);
      return null;
    }

    if (data.game_type === 'ended') {
      updateGame(null);
      setDeleted(true);
      return null;
    }

    return data as TicTacToeGame;
  }, [gameId, updateGame]);

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
    return () => {
      cancelled = true;
    };
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

        // Guard against out-of-order poll responses regressing state
        if (totalMoves(fresh.board) < totalMoves(prev.board)) {
          return prev;
        }

        // Detect the opponent's last move
        if (totalMoves(fresh.board) > totalMoves(prev.board)) {
          for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 3; col++) {
              if (prev.board[row][col] === null && fresh.board[row][col] !== null) {
                setLastMove({ row, col });
              }
            }
          }
        }

        return fresh;
      });
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [gameId, fetchGame, updateGame, deleted]);

  const makeMove = useCallback(
    async (row: number, col: number) => {
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

      let newBoard: TicTacToeBoard;
      try {
        newBoard = computeMove(currentGame.board, row, col, myPlayerNumber);
      } catch {
        setError('Cell is already occupied');
        return;
      }

      const winner = checkWin(newBoard);
      const nextTurn: Player = myPlayerNumber === 1 ? 2 : 1;

      optimisticBoard.current = newBoard;
      setLastMove({ row, col });
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
        if (freshGame) updateGame(freshGame as TicTacToeGame);
        setError(updateError.message);
        return;
      }

      // Record match result on win
      if (winner && !matchRecorded.current) {
        matchRecorded.current = true;
        const winnerName = winner === 1 ? currentGame.player1_name : currentGame.player2_name;
        const loserName = winner === 1 ? currentGame.player2_name : currentGame.player1_name;
        const winnerId = winner === 1 ? currentGame.player1_id : currentGame.player2_id;
        const loserId = winner === 1 ? currentGame.player2_id : currentGame.player1_id;
        recordMatchResult({
          game_type: 'tic-tac-toe',
          winner_id: winnerId,
          winner_name: winnerName,
          loser_id: loserId,
          loser_name: loserName,
          is_draw: false,
          metadata: null,
          player1_id: currentGame.player1_id!,
          player1_name: currentGame.player1_name!,
          player2_id: currentGame.player2_id!,
          player2_name: currentGame.player2_name!,
        });
      }

      // Record match result on draw
      if (!winner && isDraw(newBoard) && !matchRecorded.current) {
        matchRecorded.current = true;
        recordMatchResult({
          game_type: 'tic-tac-toe',
          winner_id: null,
          winner_name: null,
          loser_id: null,
          loser_name: null,
          is_draw: true,
          metadata: null,
          player1_id: currentGame.player1_id!,
          player1_name: currentGame.player1_name!,
          player2_id: currentGame.player2_id!,
          player2_name: currentGame.player2_name!,
        });
      }
    },
    [gameId, updateGame]
  );

  const resetGame = useCallback(async () => {
    const { error: resetError } = await supabase
      .from('games')
      .update({
        game_type: 'ended',
        board: [[null, null, null], [null, null, null], [null, null, null]],
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

    const { error: deleteError } = await supabase
      .from('games')
      .delete()
      .eq('id', gameId);

    if (deleteError) {
      console.error('Error deleting game:', deleteError);
    }

    setDeleted(true);
  }, [gameId]);

  return { game, loading, error, lastMove, deleted, makeMove, resetGame };
}

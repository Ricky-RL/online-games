'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import {
  createInitialBoard,
  simulateThrow,
  applyThrow,
  checkWinner,
  totalThrows,
} from '@/lib/cup-pong-logic';
import { recordMatchResult } from '@/lib/match-results';
import type {
  Player,
  CupPongGame,
  CupPongBoardState,
  ThrowVector,
  ThrowResult,
} from '@/lib/cup-pong-types';

const POLL_INTERVAL_MS = 1500;

function getMyName(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('player-name') || localStorage.getItem('player-name');
}

interface UseCupPongGameReturn {
  game: CupPongGame | null;
  loading: boolean;
  error: string | null;
  deleted: boolean;
  /** The first throw of the current turn (stored locally until second throw commits both) */
  firstThrow: ThrowResult | null;
  /** Execute a throw with direction and power. Returns the ThrowResult for animation. */
  makeThrow: (direction: ThrowVector, power: number) => Promise<ThrowResult | null>;
  resetGame: () => Promise<void>;
  endGame: () => Promise<void>;
}

export function useCupPongGame(gameId: string): UseCupPongGameReturn {
  const [game, setGame] = useState<CupPongGame | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleted, setDeleted] = useState(false);
  const [firstThrow, setFirstThrow] = useState<ThrowResult | null>(null);
  const gameRef = useRef<CupPongGame | null>(null);
  const matchRecorded = useRef(false);
  const optimisticBoard = useRef<CupPongBoardState | null>(null);

  const updateGame = useCallback(
    (updater: CupPongGame | null | ((prev: CupPongGame | null) => CupPongGame | null)) => {
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

    return data as CupPongGame;
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

        // If we have an optimistic update pending, check if server caught up
        if (optimisticBoard.current) {
          if (JSON.stringify(fresh.board) === JSON.stringify(optimisticBoard.current)) {
            optimisticBoard.current = null;
            return fresh;
          }
          // Server is behind our optimistic state — keep local but update player info
          if (totalThrows(fresh.board) < totalThrows(prev.board)) {
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

        // Guard against stale poll responses
        if (totalThrows(fresh.board) < totalThrows(prev.board)) {
          return prev;
        }

        return fresh;
      });
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [gameId, fetchGame, updateGame, deleted]);

  // Record match result when game ends — only the winner's client records
  // to prevent duplicate entries from both clients detecting the win.
  useEffect(() => {
    const currentGame = gameRef.current;
    if (!currentGame) return;
    if (matchRecorded.current) return;
    if (!currentGame.player1_id || !currentGame.player1_name) return;
    if (!currentGame.player2_id || !currentGame.player2_name) return;

    const winner = currentGame.winner;
    if (!winner) return;

    // Only the winner's client should record the result
    const myName = getMyName();
    const winnerName = winner === 1 ? currentGame.player1_name : currentGame.player2_name;
    if (myName !== winnerName) return;

    matchRecorded.current = true;

    const loserName = winner === 1 ? currentGame.player2_name : currentGame.player1_name;
    const winnerId = winner === 1 ? currentGame.player1_id : currentGame.player2_id;
    const loserId = winner === 1 ? currentGame.player2_id : currentGame.player1_id;

    recordMatchResult({
      game_type: 'cup-pong',
      game_id: currentGame.id,
      winner_id: winnerId,
      winner_name: winnerName,
      loser_id: loserId,
      loser_name: loserName,
      is_draw: false,
      metadata: {
        player1CupsRemaining: currentGame.board.player1Cups.filter((c) => c.standing).length,
        player2CupsRemaining: currentGame.board.player2Cups.filter((c) => c.standing).length,
      },
      player1_id: currentGame.player1_id!,
      player1_name: currentGame.player1_name!,
      player2_id: currentGame.player2_id!,
      player2_name: currentGame.player2_name!,
    });
  }, [game]);

  const makeThrow = useCallback(
    async (direction: ThrowVector, power: number): Promise<ThrowResult | null> => {
      const currentGame = gameRef.current;
      if (!currentGame) return null;

      if (currentGame.winner !== null) {
        setError('Game is already over');
        return null;
      }

      const myName = getMyName();
      if (!myName) {
        setError('No player name set');
        return null;
      }

      const isPlayer1 = currentGame.player1_name === myName;
      const isPlayer2 = currentGame.player2_name === myName;

      if (!isPlayer1 && !isPlayer2) {
        setError('You are not a player in this game');
        return null;
      }

      const myPlayerNumber: Player = isPlayer1 ? 1 : 2;

      if (currentGame.current_turn !== myPlayerNumber) {
        setError('Not your turn');
        return null;
      }

      // Determine throw direction based on which end we're throwing from
      const throwingFrom = myPlayerNumber === 1 ? 'bottom' : 'top';
      const targetCups = myPlayerNumber === 1
        ? currentGame.board.player2Cups
        : currentGame.board.player1Cups;

      // Simulate the throw
      const throwResult = simulateThrow(targetCups, direction, power, throwingFrom as 'bottom' | 'top');

      // First throw of the turn: store locally, don't commit to server yet
      if (currentGame.board.throwsRemaining === 2) {
        // Apply throw to get updated board state for display
        const boardAfterFirst = applyThrow(currentGame.board, myPlayerNumber, throwResult);

        // Check if the first throw already eliminated the opponent's last cup
        const winnerAfterFirst = checkWinner(boardAfterFirst);
        if (winnerAfterFirst) {
          // Game over immediately — no need for a second throw
          optimisticBoard.current = boardAfterFirst;
          setFirstThrow(null);
          updateGame((prev) =>
            prev
              ? {
                  ...prev,
                  board: boardAfterFirst,
                  winner: winnerAfterFirst,
                }
              : null
          );
          setError(null);

          // Commit the win to the server
          const { error: updateError } = await supabase
            .from('games')
            .update({
              board: boardAfterFirst,
              current_turn: currentGame.current_turn,
              winner: winnerAfterFirst,
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
            if (freshGame) updateGame(freshGame as CupPongGame);
            setError(updateError.message);
          }
          return throwResult;
        }

        setFirstThrow(throwResult);
        setError(null);

        // Update local state optimistically to show the first throw result
        updateGame((prev) =>
          prev
            ? {
                ...prev,
                board: boardAfterFirst,
              }
            : null
        );
        return throwResult;
      }

      // Second throw: apply to the current board (which includes first throw's effects)
      const boardAfterSecond = applyThrow(gameRef.current!.board, myPlayerNumber, throwResult);

      // Check for winner after second throw
      const winner = checkWinner(boardAfterSecond);

      // Prepare board for next turn (reset throws to 2, clear lastTurnThrows for new turn)
      // But keep the throws from this turn in lastTurnThrows for opponent replay
      let finalBoard: CupPongBoardState;
      let nextTurn: Player;

      if (winner) {
        // Game over: keep board as-is
        finalBoard = boardAfterSecond;
        nextTurn = currentGame.current_turn;
      } else {
        // Switch turns: reset throwsRemaining, clear lastTurnThrows for new turn
        nextTurn = myPlayerNumber === 1 ? 2 : 1;
        finalBoard = {
          ...boardAfterSecond,
          throwsRemaining: 2,
          lastTurnThrows: [],
        };
      }

      // Optimistic update
      optimisticBoard.current = finalBoard;
      setFirstThrow(null);
      updateGame((prev) =>
        prev
          ? {
              ...prev,
              board: finalBoard,
              current_turn: nextTurn,
              winner,
            }
          : null
      );
      setError(null);

      // Commit to server
      const { error: updateError } = await supabase
        .from('games')
        .update({
          board: finalBoard,
          current_turn: nextTurn,
          winner,
          updated_at: new Date().toISOString(),
        })
        .eq('id', gameId);

      if (updateError) {
        // Rollback: fetch fresh state from server
        optimisticBoard.current = null;
        setFirstThrow(null);
        const { data: freshGame } = await supabase
          .from('games')
          .select('*')
          .eq('id', gameId)
          .single();
        if (freshGame) updateGame(freshGame as CupPongGame);
        setError(updateError.message);
      }

      return throwResult;
    },
    [gameId, updateGame]
  );

  const resetGame = useCallback(async () => {
    const newBoard = createInitialBoard();
    const { error: resetError } = await supabase
      .from('games')
      .update({
        board: newBoard,
        current_turn: 1,
        winner: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', gameId);

    if (resetError) {
      console.error('Error resetting game:', resetError);
      setError(resetError.message);
      return;
    }

    matchRecorded.current = false;
    setFirstThrow(null);
    updateGame((prev) =>
      prev
        ? {
            ...prev,
            board: newBoard,
            current_turn: 1 as const,
            winner: null,
          }
        : null
    );
  }, [gameId, updateGame]);

  const endGame = useCallback(async () => {
    // Mark the game as ended and clear player data so it won't appear in
    // lobby queries or inbox, then delete the row entirely.
    const { error: endError } = await supabase
      .from('games')
      .update({
        game_type: 'ended',
        board: createInitialBoard(),
        current_turn: 1,
        winner: null,
        player1_name: null,
        player2_name: null,
        player1_id: null,
        player2_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', gameId);

    if (endError) {
      console.error('Error ending game:', endError);
      setError(endError.message);
      return;
    }

    // Then delete the row entirely.
    const { error: deleteError } = await supabase
      .from('games')
      .delete()
      .eq('id', gameId);

    if (deleteError) {
      console.error('Error deleting game:', deleteError);
      // Non-fatal: the game is already cleared, so proceed.
    }

    setDeleted(true);
  }, [gameId]);

  return { game, loading, error, deleted, firstThrow, makeThrow, resetGame, endGame };
}

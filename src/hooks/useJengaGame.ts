'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { pullBlock, createInitialTower, getPlayableBlocksAboveThreshold, getMinimumRiskThreshold, getPlayerScores } from '@/lib/jenga-logic';
import { recordMatchResult } from '@/lib/match-results';
import type { Player, JengaGameState } from '@/lib/types';

const POLL_INTERVAL_MS = 1500;
const DRAG_TIMEOUT_MS = 15000;

export interface JengaGame {
  id: string;
  game_type: string;
  board: JengaGameState;
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

interface UseJengaGameReturn {
  game: JengaGame | null;
  loading: boolean;
  error: string | null;
  deleted: boolean;
  pullingInProgress: boolean;
  dragStartTime: number | null;
  pullBlockAction: (row: number, col: number) => Promise<void>;
  startDrag: (row: number, col: number) => void;
  completeDrag: (row: number, col: number, dragDeviation: number) => Promise<void>;
  cancelDrag: () => void;
  resetGame: () => Promise<void>;
}

export function useJengaGame(gameId: string): UseJengaGameReturn {
  const [game, setGame] = useState<JengaGame | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleted, setDeleted] = useState(false);
  const [dragStartTime, setDragStartTime] = useState<number | null>(null);
  const [isPullingState, setIsPullingState] = useState(false);
  const gameRef = useRef<JengaGame | null>(null);
  const pullingInProgress = useRef<boolean>(false);
  const dragTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragRowCol = useRef<[number, number] | null>(null);

  const updateGame = useCallback(
    (updater: JengaGame | null | ((prev: JengaGame | null) => JengaGame | null)) => {
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

    return data as JengaGame;
  }, [gameId, updateGame]);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      setLoading(true);
      const gameData = await fetchGame();
      if (cancelled) return;
      if (gameData) updateGame(gameData);
      setLoading(false);
    }
    init();
    return () => { cancelled = true; };
  }, [fetchGame, updateGame]);

  useEffect(() => {
    if (deleted) return;

    const interval = setInterval(async () => {
      const fresh = await fetchGame();
      if (!fresh) return;

      updateGame((prev) => {
        if (!prev) return fresh;

        // If game ended (opponent toppled), always update regardless of drag state
        if (fresh.winner !== null && prev.winner === null) {
          // Cancel any in-progress drag
          if (pullingInProgress.current) {
            pullingInProgress.current = false;
            setIsPullingState(false);
            setDragStartTime(null);
            if (dragTimeoutRef.current) {
              clearTimeout(dragTimeoutRef.current);
              dragTimeoutRef.current = null;
            }
            dragRowCol.current = null;
          }
          return fresh;
        }

        // When a drag is in progress, skip turn updates from poll
        if (pullingInProgress.current) {
          // Still update player names if they joined
          if (fresh.player2_name && !prev.player2_name) {
            return { ...prev, player2_name: fresh.player2_name, player2_id: fresh.player2_id };
          }
          return prev;
        }

        if (fresh.board.move_history.length > prev.board.move_history.length) {
          return fresh;
        }
        // Update player names if they joined
        if (fresh.player2_name && !prev.player2_name) {
          return { ...prev, player2_name: fresh.player2_name, player2_id: fresh.player2_id };
        }
        return prev;
      });
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [gameId, fetchGame, updateGame, deleted]);

  const completeDragInternalRef = useRef<((row: number, col: number, dragDeviation: number) => Promise<void>) | null>(null);

  const startDrag = useCallback((row: number, col: number) => {
    pullingInProgress.current = true;
    setIsPullingState(true);
    dragRowCol.current = [row, col];
    setDragStartTime(Date.now());

    // Set 15s timeout — auto-complete with high deviation
    if (dragTimeoutRef.current) clearTimeout(dragTimeoutRef.current);
    dragTimeoutRef.current = setTimeout(() => {
      if (pullingInProgress.current && dragRowCol.current) {
        const [r, c] = dragRowCol.current;
        completeDragInternalRef.current?.(r, c, 0.8);
      }
    }, DRAG_TIMEOUT_MS);
  }, []);

  const cancelDrag = useCallback(() => {
    pullingInProgress.current = false;
    setIsPullingState(false);
    dragRowCol.current = null;
    setDragStartTime(null);
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current);
      dragTimeoutRef.current = null;
    }
  }, []);

  const completeDragInternal = useCallback(
    async (row: number, col: number, dragDeviation: number) => {
      // Clear drag state
      pullingInProgress.current = false;
      setIsPullingState(false);
      dragRowCol.current = null;
      setDragStartTime(null);
      if (dragTimeoutRef.current) {
        clearTimeout(dragTimeoutRef.current);
        dragTimeoutRef.current = null;
      }

      const currentGame = gameRef.current;
      if (!currentGame) return;

      const myName = getMyName();
      if (!myName) { setError('No player name set'); return; }

      const isPlayer1 = currentGame.player1_name === myName;
      const isPlayer2 = currentGame.player2_name === myName;
      if (!isPlayer1 && !isPlayer2) { setError('You are not a player in this game'); return; }

      const myPlayerNumber: Player = isPlayer1 ? 1 : 2;
      if (currentGame.current_turn !== myPlayerNumber) { setError('Not your turn'); return; }
      if (currentGame.winner !== null) { setError('Game is already over'); return; }

      const threshold = getMinimumRiskThreshold(currentGame.board);
      const playable = getPlayableBlocksAboveThreshold(currentGame.board, threshold);
      if (playable.length === 0) {
        const winner: Player = (3 - myPlayerNumber) as Player;
        updateGame((prev) => prev ? { ...prev, winner } : null);
        await supabase
          .from('games')
          .update({ winner, updated_at: new Date().toISOString() })
          .eq('id', gameId)
          .eq('current_turn', myPlayerNumber);
        return;
      }
      if (!playable.some(([r, c]) => r === row && c === col)) {
        setError('That block is not playable');
        return;
      }

      const randomValue = Math.random();
      const newBoard = pullBlock(currentGame.board, row, col, myPlayerNumber, randomValue, dragDeviation);
      const lastMove = newBoard.move_history[newBoard.move_history.length - 1];
      const toppled = lastMove.toppled;

      const winner: Player | null = toppled ? ((3 - myPlayerNumber) as Player) : null;
      const nextTurn: Player = toppled ? currentGame.current_turn : ((3 - myPlayerNumber) as Player);

      // Optimistic update
      updateGame((prev) =>
        prev ? { ...prev, board: newBoard, current_turn: nextTurn, winner } : null
      );
      setError(null);

      const { error: updateError } = await supabase
        .from('games')
        .update({
          board: newBoard,
          current_turn: nextTurn,
          winner,
          updated_at: new Date().toISOString(),
        })
        .eq('id', gameId)
        .eq('current_turn', myPlayerNumber);

      if (updateError) {
        const { data: freshGame } = await supabase
          .from('games').select('*').eq('id', gameId).single();
        if (freshGame) updateGame(freshGame as JengaGame);
        setError(updateError.message);
      }

      // Record match result if game ended
      if (winner && !updateError) {
        const currentGame = gameRef.current;
        if (currentGame && currentGame.player1_id && currentGame.player2_id) {
          const loserNumber: Player = myPlayerNumber;
          const winnerNumber: Player = (3 - myPlayerNumber) as Player;
          recordMatchResult({
            game_type: 'jenga',
            game_id: gameId,
            winner_id: winnerNumber === 1 ? currentGame.player1_id : currentGame.player2_id,
            winner_name: winnerNumber === 1 ? currentGame.player1_name : currentGame.player2_name,
            loser_id: loserNumber === 1 ? currentGame.player1_id : currentGame.player2_id,
            loser_name: loserNumber === 1 ? currentGame.player1_name : currentGame.player2_name,
            is_draw: false,
            metadata: {
              totalMoves: newBoard.move_history.length,
              ...getPlayerScores(newBoard),
            },
            player1_id: currentGame.player1_id,
            player1_name: currentGame.player1_name || '',
            player2_id: currentGame.player2_id,
            player2_name: currentGame.player2_name || '',
          });
        }
      }
    },
    [gameId, updateGame]
  );

  // Keep ref in sync for timeout callback
  useEffect(() => {
    completeDragInternalRef.current = completeDragInternal;
  }, [completeDragInternal]);

  const completeDrag = useCallback(
    async (row: number, col: number, dragDeviation: number) => {
      await completeDragInternal(row, col, dragDeviation);
    },
    [completeDragInternal]
  );

  const pullBlockAction = useCallback(
    async (row: number, col: number) => {
      // Backwards-compatible: uses default deviation of 0.5
      await completeDragInternal(row, col, 0.5);
    },
    [completeDragInternal]
  );

  const resetGame = useCallback(async () => {
    const emptyBoard = createInitialTower();
    const { error: resetError } = await supabase
      .from('games')
      .update({
        game_type: 'ended',
        board: emptyBoard,
        current_turn: 1,
        winner: null,
        player1_name: null,
        player2_name: null,
        player1_id: null,
        player2_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', gameId);

    if (resetError) { console.error('Error resetting game:', resetError); setError(resetError.message); return; }

    const { error: deleteError } = await supabase.from('games').delete().eq('id', gameId);
    if (deleteError) console.error('Error deleting game:', deleteError);

    setDeleted(true);
  }, [gameId]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (dragTimeoutRef.current) clearTimeout(dragTimeoutRef.current);
    };
  }, []);

  return {
    game,
    loading,
    error,
    deleted,
    pullingInProgress: isPullingState,
    dragStartTime,
    pullBlockAction,
    startDrag,
    completeDrag,
    cancelDrag,
    resetGame,
  };
}

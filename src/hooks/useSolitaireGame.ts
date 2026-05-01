'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { determineSolitaireWinner } from '@/lib/solitaire-logic';
import { recordMatchResult } from '@/lib/match-results';
import type { SolitaireBoard, SolitaireResult } from '@/lib/solitaire-types';

const POLL_INTERVAL_MS = 3000;

export interface SolitaireGameRow {
  id: string;
  game_type: string;
  board: SolitaireBoard;
  current_turn: 1 | 2;
  winner: number | null;
  player1_id: string | null;
  player1_name: string | null;
  player2_id: string | null;
  player2_name: string | null;
  created_at: string;
  updated_at: string;
}

function getMyName(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('player-name') || localStorage.getItem('player-name');
}

interface UseSolitaireGameReturn {
  game: SolitaireGameRow | null;
  loading: boolean;
  error: string | null;
  deleted: boolean;
  myPlayerNumber: 1 | 2 | null;
  isMyRound: boolean;
  opponentResult: SolitaireResult | null;
  submitResult: (result: SolitaireResult) => Promise<void>;
  giveUp: (moves: number, timeSeconds: number, startedAt: string) => Promise<void>;
  resetGame: () => Promise<void>;
}

export function useSolitaireGame(gameId: string): UseSolitaireGameReturn {
  const [game, setGame] = useState<SolitaireGameRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleted, setDeleted] = useState(false);
  const matchRecorded = useRef(false);

  const myName = getMyName();

  const myPlayerNumber: 1 | 2 | null = game
    ? game.player1_name === myName ? 1
    : game.player2_name === myName ? 2
    : null
    : null;

  const isMyRound = game !== null && myPlayerNumber !== null && game.current_turn === myPlayerNumber;

  // P2 should not see P1's result until P2 has submitted
  const opponentResult: SolitaireResult | null = (() => {
    if (!game || !myPlayerNumber) return null;
    const myResult = myPlayerNumber === 1 ? game.board.player1_result : game.board.player2_result;
    const theirResult = myPlayerNumber === 1 ? game.board.player2_result : game.board.player1_result;
    // Only show opponent result after I've submitted mine
    if (!myResult) return null;
    return theirResult;
  })();

  const fetchGame = useCallback(async () => {
    const { data, error: fetchError } = await supabase
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        setDeleted(true);
        return;
      }
      setError(fetchError.message);
      return;
    }

    if (data.game_type === 'ended') {
      setDeleted(true);
      return;
    }

    setGame(data as SolitaireGameRow);
  }, [gameId]);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      setLoading(true);
      await fetchGame();
      if (!cancelled) setLoading(false);
    }
    init();
    return () => { cancelled = true; };
  }, [fetchGame]);

  // Poll for opponent joining / results
  useEffect(() => {
    if (deleted) return;
    const interval = setInterval(fetchGame, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchGame, deleted]);

  const submitResult = useCallback(async (result: SolitaireResult) => {
    if (!game || !myPlayerNumber) return;

    const resultKey = myPlayerNumber === 1 ? 'player1_result' : 'player2_result';
    const newBoard = { ...game.board, [resultKey]: result };

    const isLastPlayer = myPlayerNumber === 2;
    let winnerValue: number | null = null;

    if (isLastPlayer && newBoard.player1_result && newBoard.player2_result) {
      winnerValue = determineSolitaireWinner(newBoard.player1_result, newBoard.player2_result);
    }

    const updateData: Record<string, unknown> = {
      board: newBoard,
      updated_at: new Date().toISOString(),
    };

    if (myPlayerNumber === 1) {
      updateData.current_turn = 2;
    }

    if (winnerValue !== null) {
      updateData.winner = winnerValue === 0 ? 0 : winnerValue;
    }

    const { error: updateError } = await supabase
      .from('games')
      .update(updateData)
      .eq('id', gameId);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    // Record match result when both players have finished
    if (isLastPlayer && newBoard.player1_result && newBoard.player2_result && !matchRecorded.current) {
      matchRecorded.current = true;
      const winner = determineSolitaireWinner(newBoard.player1_result, newBoard.player2_result);
      const winnerName = winner === 1 ? game.player1_name : winner === 2 ? game.player2_name : null;
      const loserName = winner === 1 ? game.player2_name : winner === 2 ? game.player1_name : null;
      const winnerId = winner === 1 ? game.player1_id : winner === 2 ? game.player2_id : null;
      const loserId = winner === 1 ? game.player2_id : winner === 2 ? game.player1_id : null;

      recordMatchResult({
        game_type: 'solitaire',
        game_id: gameId,
        winner_id: winnerId,
        winner_name: winnerName,
        loser_id: loserId,
        loser_name: loserName,
        is_draw: winner === 0,
        metadata: {
          p1Moves: newBoard.player1_result.moves,
          p1Time: newBoard.player1_result.time_seconds,
          p1Completed: newBoard.player1_result.completed,
          p2Moves: newBoard.player2_result.moves,
          p2Time: newBoard.player2_result.time_seconds,
          p2Completed: newBoard.player2_result.completed,
        },
        player1_id: game.player1_id!,
        player1_name: game.player1_name!,
        player2_id: game.player2_id!,
        player2_name: game.player2_name!,
      });
    }

    await fetchGame();
  }, [game, gameId, myPlayerNumber, fetchGame]);

  const giveUp = useCallback(async (moves: number, timeSeconds: number, startedAt: string) => {
    // If player1 gives up before player2 joins, delete the game
    if (myPlayerNumber === 1 && !game?.player2_name) {
      await supabase.from('games').delete().eq('id', gameId);
      setDeleted(true);
      return;
    }

    const result: SolitaireResult = {
      moves,
      time_seconds: timeSeconds,
      completed: false,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
    };

    await submitResult(result);
  }, [game, gameId, myPlayerNumber, submitResult]);

  const resetGame = useCallback(async () => {
    await supabase
      .from('games')
      .update({
        game_type: 'ended',
        updated_at: new Date().toISOString(),
      })
      .eq('id', gameId);

    await supabase.from('games').delete().eq('id', gameId);
    setDeleted(true);
  }, [gameId]);

  return {
    game,
    loading,
    error,
    deleted,
    myPlayerNumber,
    isMyRound,
    opponentResult,
    submitResult,
    giveUp,
    resetGame,
  };
}

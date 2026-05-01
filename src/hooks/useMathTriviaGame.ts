'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import type { MathTriviaGame, MathTriviaBoardState, PlayerResult } from '@/lib/math-trivia-types';
import { determineWinner } from '@/lib/math-trivia-logic';
import { recordMatchResult } from '@/lib/match-results';

const POLL_INTERVAL = 1500;

interface UseMathTriviaGameReturn {
  game: MathTriviaGame | null;
  loading: boolean;
  error: string | null;
  deleted: boolean;
  submitResult: (result: PlayerResult) => Promise<void>;
  resetGame: () => Promise<void>;
  myResult: PlayerResult | null;
  opponentResult: PlayerResult | null;
  bothSubmitted: boolean;
}

export function useMathTriviaGame(gameId: string): UseMathTriviaGameReturn {
  const [game, setGame] = useState<MathTriviaGame | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleted, setDeleted] = useState(false);
  const mountedRef = useRef(true);
  const submittingRef = useRef(false);

  const getPlayerName = () => {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem('player-name') || localStorage.getItem('player-name');
  };

  // BUG 5 FIX: Memoize getMyPlayerNumber to avoid recomputation on every poll
  const myPlayerNumber = useMemo((): 1 | 2 | null => {
    const name = getPlayerName();
    if (!name || !game) return null;
    if (game.player1_name === name) return 1;
    if (game.player2_name === name) return 2;
    return null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?.player1_name, game?.player2_name]);

  const fetchGame = useCallback(async () => {
    const { data, error: fetchError } = await supabase
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single();

    if (!mountedRef.current) return;

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        setDeleted(true);
      } else {
        setError(fetchError.message);
      }
      setLoading(false);
      return;
    }

    if (data.game_type === 'ended') {
      setDeleted(true);
      setLoading(false);
      return;
    }

    setGame(data as MathTriviaGame);
    setLoading(false);
  }, [gameId]);

  useEffect(() => {
    mountedRef.current = true;
    fetchGame();
    const interval = setInterval(fetchGame, POLL_INTERVAL);
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [fetchGame]);

  const submitResult = useCallback(async (result: PlayerResult) => {
    if (!game) return;
    if (submittingRef.current) return;
    submittingRef.current = true;

    if (!myPlayerNumber) {
      submittingRef.current = false;
      return;
    }

    const board = game.board as MathTriviaBoardState;
    const resultKey = myPlayerNumber === 1 ? 'player1Result' : 'player2Result';
    const updatedBoard: MathTriviaBoardState = { ...board, [resultKey]: result };

    const otherKey = myPlayerNumber === 1 ? 'player2Result' : 'player1Result';
    const bothDone = updatedBoard[otherKey] !== null;

    let winnerValue: 1 | 2 | 'draw' | null = null;
    if (bothDone) {
      const outcome = determineWinner(updatedBoard);
      // BUG 4 FIX: Set winner to 'draw' for draws so inbox filtering works
      winnerValue = outcome.isDraw ? 'draw' : outcome.winner;
    }

    const updateData: Record<string, unknown> = {
      board: updatedBoard,
      updated_at: new Date().toISOString(),
    };

    if (!bothDone) {
      updateData.current_turn = myPlayerNumber === 1 ? 2 : 1;
    }

    if (bothDone) {
      updateData.winner = winnerValue;
    }

    const { error: updateError } = await supabase
      .from('games')
      .update(updateData)
      .eq('id', gameId);

    if (updateError) {
      setError(updateError.message);
      submittingRef.current = false;
      return;
    }

    // BUG 1 FIX: Record match result exactly once — only when this player is the
    // SECOND to submit (bothDone is true), inside the submit callback itself.
    if (bothDone && game.player1_name && game.player2_name) {
      const p1Id = game.player1_id || '00000000-0000-0000-0000-000000000001';
      const p2Id = game.player2_id || '00000000-0000-0000-0000-000000000002';
      const outcome = determineWinner(updatedBoard);

      recordMatchResult({
        game_type: 'math-trivia',
        game_id: gameId,
        winner_id: outcome.winner === 1 ? p1Id : outcome.winner === 2 ? p2Id : null,
        winner_name: outcome.winner === 1 ? game.player1_name : outcome.winner === 2 ? game.player2_name : null,
        loser_id: outcome.winner === 1 ? p2Id : outcome.winner === 2 ? p1Id : null,
        loser_name: outcome.winner === 1 ? game.player2_name : outcome.winner === 2 ? game.player1_name : null,
        is_draw: outcome.isDraw,
        metadata: {
          p1Correct: updatedBoard.player1Result!.correctCount,
          p2Correct: updatedBoard.player2Result!.correctCount,
          p1Time: updatedBoard.player1Result!.totalTime,
          p2Time: updatedBoard.player2Result!.totalTime,
        },
        player1_id: p1Id,
        player1_name: game.player1_name,
        player2_id: p2Id,
        player2_name: game.player2_name,
      });
    }

    setGame((prev) => prev ? { ...prev, board: updatedBoard, winner: winnerValue, ...updateData } as MathTriviaGame : null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game, gameId, myPlayerNumber]);

  const resetGame = useCallback(async () => {
    const { error: resetError } = await supabase
      .from('games')
      .update({
        game_type: 'ended',
        board: {},
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

  const board = game?.board as MathTriviaBoardState | undefined;

  const myResult = board && myPlayerNumber
    ? (myPlayerNumber === 1 ? board.player1Result : board.player2Result)
    : null;

  const bothSubmitted = !!(board?.player1Result && board?.player2Result);

  const opponentResult = bothSubmitted && board && myPlayerNumber
    ? (myPlayerNumber === 1 ? board.player2Result : board.player1Result)
    : null;

  return { game, loading, error, deleted, submitResult, resetGame, myResult, opponentResult, bothSubmitted };
}

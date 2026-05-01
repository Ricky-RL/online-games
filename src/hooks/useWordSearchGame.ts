'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { WordSearchGame, WordSearchBoardState, PlayerResult } from '@/lib/word-search-types';
import { determineWinner } from '@/lib/word-search-logic';
import { recordMatchResult } from '@/lib/match-results';

const POLL_INTERVAL = 1500;

interface UseWordSearchGameReturn {
  game: WordSearchGame | null;
  loading: boolean;
  error: string | null;
  deleted: boolean;
  submitResult: (result: PlayerResult) => Promise<void>;
  resetGame: () => Promise<void>;
  myResult: PlayerResult | null;
  opponentResult: PlayerResult | null;
  bothSubmitted: boolean;
}

export function useWordSearchGame(gameId: string): UseWordSearchGameReturn {
  const [game, setGame] = useState<WordSearchGame | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleted, setDeleted] = useState(false);
  const mountedRef = useRef(true);
  const recordedRef = useRef(false);
  const submittingRef = useRef(false);

  const getPlayerName = () => {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem('player-name') || localStorage.getItem('player-name');
  };

  const getMyPlayerNumber = (): 1 | 2 | null => {
    const name = getPlayerName();
    if (!name || !game) return null;
    if (game.player1_name === name) return 1;
    if (game.player2_name === name) return 2;
    return null;
  };

  // Fetch game state
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

    setGame(data as WordSearchGame);
    setLoading(false);
  }, [gameId]);

  // Polling
  useEffect(() => {
    mountedRef.current = true;
    fetchGame();
    const interval = setInterval(fetchGame, POLL_INTERVAL);
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [fetchGame]);

  // Record match result when both players have submitted
  useEffect(() => {
    if (!game || recordedRef.current) return;
    const board = game.board as WordSearchBoardState;
    if (!board.player1Result || !board.player2Result) return;

    const { winner, isDraw } = determineWinner(board);
    if (winner === null && !isDraw) return;

    recordedRef.current = true;

    const p1Id = game.player1_id || '00000000-0000-0000-0000-000000000001';
    const p2Id = game.player2_id || '00000000-0000-0000-0000-000000000002';

    if (game.player1_name && game.player2_name) {
      recordMatchResult({
        game_type: 'word-search',
        game_id: gameId,
        winner_id: winner === 1 ? p1Id : winner === 2 ? p2Id : null,
        winner_name: winner === 1 ? game.player1_name : winner === 2 ? game.player2_name : null,
        loser_id: winner === 1 ? p2Id : winner === 2 ? p1Id : null,
        loser_name: winner === 1 ? game.player2_name : winner === 2 ? game.player1_name : null,
        is_draw: isDraw,
        metadata: {
          theme: board.theme,
          p1Words: board.player1Result!.foundWords.length,
          p2Words: board.player2Result!.foundWords.length,
          p1Time: board.player1Result!.timeUsed,
          p2Time: board.player2Result!.timeUsed,
          p1FoundWords: board.player1Result!.foundWords,
          p2FoundWords: board.player2Result!.foundWords,
          allWords: board.words.map((w) => w.word).sort((a, b) => a.localeCompare(b)),
        },
        player1_id: p1Id,
        player1_name: game.player1_name,
        player2_id: p2Id,
        player2_name: game.player2_name,
      });
    }
  }, [game]);

  const submitResult = useCallback(async (result: PlayerResult) => {
    if (!game) return;
    if (submittingRef.current) return;
    submittingRef.current = true;

    const playerNumber = getMyPlayerNumber();
    if (!playerNumber) {
      submittingRef.current = false;
      return;
    }

    const board = game.board as WordSearchBoardState;
    const resultKey = playerNumber === 1 ? 'player1Result' : 'player2Result';
    const updatedBoard: WordSearchBoardState = { ...board, [resultKey]: result };

    // Check if both have now submitted
    const otherKey = playerNumber === 1 ? 'player2Result' : 'player1Result';
    const bothDone = updatedBoard[otherKey] !== null;

    let winner: 1 | 2 | null = null;
    if (bothDone) {
      const outcome = determineWinner(updatedBoard);
      winner = outcome.winner;
    }

    const updateData: Record<string, unknown> = {
      board: updatedBoard,
      updated_at: new Date().toISOString(),
    };

    if (!bothDone) {
      updateData.current_turn = playerNumber === 1 ? 2 : 1;
    }

    if (bothDone) {
      updateData.winner = winner;
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

    // Optimistic update
    setGame((prev) => prev ? { ...prev, board: updatedBoard, winner, ...updateData } as WordSearchGame : null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game, gameId]);

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

  const playerNumber = getMyPlayerNumber();
  const board = game?.board as WordSearchBoardState | undefined;

  const myResult = board && playerNumber
    ? (playerNumber === 1 ? board.player1Result : board.player2Result)
    : null;

  const bothSubmitted = !!(board?.player1Result && board?.player2Result);

  // Only show opponent result after both have submitted
  const opponentResult = bothSubmitted && board && playerNumber
    ? (playerNumber === 1 ? board.player2Result : board.player1Result)
    : null;

  return { game, loading, error, deleted, submitResult, resetGame, myResult, opponentResult, bothSubmitted };
}

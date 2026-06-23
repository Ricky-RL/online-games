'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { getStoredUserSlotInfo } from '@/lib/players';
import { recordMatchResult } from '@/lib/match-results';
import { makeMove, checkWin, isDraw, type WordleTogetherBoard } from '@/lib/wordle-together-logic';

const POLL_INTERVAL_MS = 1500;

export interface WordleTogetherGame {
  id: string;
  game_type: string;
  board: WordleTogetherBoard;
  current_turn: number;
  winner: 1 | 2 | null;
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

interface UseWordleTogetherGameReturn {
  game: WordleTogetherGame | null;
  loading: boolean;
  error: string | null;
  deleted: boolean;
  submitGuess: (word: string) => Promise<boolean>;
  resetGame: () => Promise<void>;
}

export function useWordleTogetherGame(gameId: string): UseWordleTogetherGameReturn {
  const [game, setGame] = useState<WordleTogetherGame | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleted, setDeleted] = useState(false);
  
  const gameRef = useRef<WordleTogetherGame | null>(null);
  const matchRecorded = useRef(false);
  const optimisticGuessesCount = useRef<{ p1: number; p2: number } | null>(null);

  const updateGame = useCallback(
    (updater: WordleTogetherGame | null | ((prev: WordleTogetherGame | null) => WordleTogetherGame | null)) => {
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

    return data as WordleTogetherGame;
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

  // Polling for updates
  useEffect(() => {
    if (deleted) return;

    const interval = setInterval(async () => {
      const fresh = await fetchGame();
      if (!fresh) return;

      updateGame((prev) => {
        if (!prev) return fresh;

        // Optimistic lock check: ignore remote update if our local optimistic guesses are ahead
        if (optimisticGuessesCount.current) {
          const freshP1Count = fresh.board.player1_guesses.length;
          const freshP2Count = fresh.board.player2_guesses.length;
          
          if (
            freshP1Count >= optimisticGuessesCount.current.p1 &&
            freshP2Count >= optimisticGuessesCount.current.p2
          ) {
            optimisticGuessesCount.current = null;
            return fresh;
          }
          
          return {
            ...prev,
            player1_name: fresh.player1_name,
            player2_name: fresh.player2_name,
            player1_id: fresh.player1_id,
            player2_id: fresh.player2_id,
          };
        }

        if (JSON.stringify(fresh) === JSON.stringify(prev)) return prev;

        return fresh;
      });
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [gameId, fetchGame, updateGame, deleted]);

  const submitGuess = useCallback(
    async (word: string): Promise<boolean> => {
      const currentGame = gameRef.current;
      if (!currentGame) return false;

      const upperWord = word.toUpperCase();

      const { user, isCurrentUserSlot, isBoundUserSlot } = getStoredUserSlotInfo();
      const myName = user?.name ?? getMyName();
      if (!user || !myName) {
        setError('No player name set');
        return false;
      }

      let isPlayer1 = isCurrentUserSlot(currentGame.player1_id, currentGame.player1_name);
      let isPlayer2 = isCurrentUserSlot(currentGame.player2_id, currentGame.player2_name);

      // Handle late auto-join if slots are empty
      if (!isPlayer1 && !isPlayer2) {
        const emptySlot =
          currentGame.player1_id === null && currentGame.player1_name === null
            ? 'player1'
            : currentGame.player2_id === null && currentGame.player2_name === null
              ? 'player2'
              : null;
        
        const otherSlotIsBound = emptySlot === 'player1'
          ? isBoundUserSlot(currentGame.player2_id, currentGame.player2_name)
          : emptySlot === 'player2'
            ? isBoundUserSlot(currentGame.player1_id, currentGame.player1_name)
            : false;

        if (emptySlot && user.boundUserId && otherSlotIsBound) {
          const updateField = emptySlot === 'player1'
            ? { player1_id: user.id, player1_name: myName }
            : { player2_id: user.id, player2_name: myName };

          const { error: joinErr } = await supabase
            .from('games')
            .update({ ...updateField, updated_at: new Date().toISOString() })
            .eq('id', gameId);

          if (!joinErr) {
            const joined = await fetchGame();
            if (joined) {
              updateGame(joined);
              isPlayer1 = emptySlot === 'player1';
              isPlayer2 = emptySlot === 'player2';
            }
          }
        }

        if (!isPlayer1 && !isPlayer2) {
          setError('You are not a player in this game');
          return false;
        }
      }

      const myPlayerNumber: 1 | 2 = isPlayer1 ? 1 : 2;

      // Check if player has already finished their board
      const myGuesses = myPlayerNumber === 1 ? currentGame.board.player1_guesses : currentGame.board.player2_guesses;
      const isFinished = myPlayerNumber === 1 ? currentGame.board.player1_finished : currentGame.board.player2_finished;
      if (isFinished || currentGame.winner !== null || isDraw(currentGame.board)) {
        setError('Board is already finished');
        return false;
      }

      let outcome;
      try {
        outcome = makeMove(currentGame.board, upperWord, myPlayerNumber);
      } catch (err: any) {
        setError(err.message ?? 'Invalid guess');
        return false;
      }

      const { board: newBoard, winner, status } = outcome;

      // Lock optimistic updates until DB write resolves
      optimisticGuessesCount.current = {
        p1: newBoard.player1_guesses.length,
        p2: newBoard.player2_guesses.length,
      };

      updateGame((prev) =>
        prev
          ? {
              ...prev,
              board: newBoard,
              winner,
            }
          : null
      );
      setError(null);

      const { error: updateError } = await supabase
        .from('games')
        .update({
          board: newBoard,
          winner,
          updated_at: new Date().toISOString(),
        })
        .eq('id', gameId);

      if (updateError) {
        optimisticGuessesCount.current = null;
        const fresh = await fetchGame();
        if (fresh) updateGame(fresh);
        setError(updateError.message);
        return false;
      }

      // Record match results if game is won or draw
      if ((winner !== null || status === 'draw') && !matchRecorded.current) {
        matchRecorded.current = true;
        const p1Id = currentGame.player1_id || '00000000-0000-0000-0000-000000000001';
        const p2Id = currentGame.player2_id || '00000000-0000-0000-0000-000000000002';
        
        recordMatchResult({
          game_type: 'wordle-together',
          game_id: gameId,
          winner_id: winner === 1 ? p1Id : winner === 2 ? p2Id : null,
          winner_name: winner === 1 ? currentGame.player1_name : winner === 2 ? currentGame.player2_name : null,
          loser_id: winner === 1 ? p2Id : winner === 2 ? p1Id : null,
          loser_name: winner === 1 ? currentGame.player2_name : winner === 2 ? currentGame.player1_name : null,
          is_draw: status === 'draw',
          metadata: {
            guessCount: winner === 1 ? newBoard.player1_guesses.length : winner === 2 ? newBoard.player2_guesses.length : 6,
          },
          player1_id: p1Id,
          player1_name: currentGame.player1_name!,
          player2_id: p2Id,
          player2_name: currentGame.player2_name!,
        });
      }

      return true;
    },
    [gameId, fetchGame, updateGame]
  );

  const resetGame = useCallback(async () => {
    // Standard cleanup: mark table row game_type as 'ended' and delete row
    const { error: resetError } = await supabase
      .from('games')
      .update({
        game_type: 'ended',
        updated_at: new Date().toISOString(),
      })
      .eq('id', gameId);

    if (resetError) {
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

  return { game, loading, error, deleted, submitGuess, resetGame };
}

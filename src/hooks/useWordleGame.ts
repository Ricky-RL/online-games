'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { isValidGuess, isGameWon, isGameLost, getAnswer } from '@/lib/wordle-logic';
import { recordMatchResult } from '@/lib/match-results';
import type { WordleGame, WordleGuess } from '@/lib/wordle-types';

const POLL_INTERVAL_MS = 1500;
const TYPING_DEBOUNCE_MS = 300;

function getMyName(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('player-name') || localStorage.getItem('player-name');
}

interface UseWordleGameReturn {
  game: WordleGame | null;
  loading: boolean;
  error: string | null;
  deleted: boolean;
  submitGuess: (word: string) => Promise<boolean>;
  updateTyping: (text: string) => void;
  resetGame: () => Promise<void>;
}

export function useWordleGame(gameId: string): UseWordleGameReturn {
  const [game, setGame] = useState<WordleGame | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleted, setDeleted] = useState(false);
  const gameRef = useRef<WordleGame | null>(null);
  const typingTimeout = useRef<NodeJS.Timeout | null>(null);
  const optimisticGuessCount = useRef<number | null>(null);
  const matchRecorded = useRef(false);

  const updateGame = useCallback((updater: WordleGame | null | ((prev: WordleGame | null) => WordleGame | null)) => {
    setGame((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      gameRef.current = next;
      return next;
    });
  }, []);

  const fetchGame = useCallback(async () => {
    const { data, error: fetchError } = await supabase
      .from('wordle_games')
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
    return data as WordleGame;
  }, [gameId]);

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

  useEffect(() => {
    if (deleted) return;

    const interval = setInterval(async () => {
      const fresh = await fetchGame();
      if (!fresh) return;

      updateGame((prev) => {
        if (!prev) return fresh;

        if (optimisticGuessCount.current !== null) {
          if (fresh.guess_count >= optimisticGuessCount.current) {
            optimisticGuessCount.current = null;
            return fresh;
          }
          return {
            ...prev,
            player1_typing: fresh.player1_typing,
            player2_typing: fresh.player2_typing,
            player1_name: fresh.player1_name,
            player2_name: fresh.player2_name,
            player1_id: fresh.player1_id,
            player2_id: fresh.player2_id,
          };
        }

        if (JSON.stringify(fresh) === JSON.stringify(prev)) return prev;

        if (fresh.guess_count < prev.guess_count && fresh.guess_count > 0) {
          return prev;
        }

        return fresh;
      });
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [gameId, fetchGame, updateGame, deleted]);

  const submitGuess = useCallback(async (word: string): Promise<boolean> => {
    const currentGame = gameRef.current;
    if (!currentGame) return false;

    const upperWord = word.toUpperCase();

    if (!isValidGuess(upperWord)) {
      setError('Not a valid word');
      return false;
    }

    const myName = getMyName();
    if (!myName) {
      setError('No player name set');
      return false;
    }

    const isPlayer1 = currentGame.player1_name === myName;
    const isPlayer2 = currentGame.player2_name === myName;
    if (!isPlayer1 && !isPlayer2) {
      setError('You are not a player in this game');
      return false;
    }

    const myPlayerNumber: 1 | 2 = isPlayer1 ? 1 : 2;
    const answer = getAnswer(currentGame.answer_index, currentGame.answer_word);

    if (isGameWon(currentGame.guesses, answer) || isGameLost(currentGame.guesses)) {
      setError('Game is already over');
      return false;
    }

    const newGuess: WordleGuess = { word: upperWord, player: myPlayerNumber };
    const newGuesses = [...currentGame.guesses, newGuess];
    const newGuessCount = currentGame.guess_count + 1;

    const won = isGameWon(newGuesses, answer);
    const lost = !won && isGameLost(newGuesses);
    const newStatus = won ? 'won' : lost ? 'lost' : currentGame.status;
    const newWinner = won ? myPlayerNumber : null;

    optimisticGuessCount.current = newGuessCount;
    const typingField = isPlayer1 ? 'player1_typing' : 'player2_typing';

    updateGame((prev) =>
      prev ? {
        ...prev,
        guesses: newGuesses,
        guess_count: newGuessCount,
        status: newStatus,
        winner: newWinner,
        [typingField]: null,
      } : null
    );
    setError(null);

    const { error: updateError } = await supabase
      .from('wordle_games')
      .update({
        guesses: newGuesses,
        guess_count: newGuessCount,
        status: newStatus,
        winner: newWinner,
        [typingField]: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', gameId)
      .eq('guess_count', currentGame.guess_count);

    if (updateError) {
      optimisticGuessCount.current = null;
      const freshGame = await fetchGame();
      if (freshGame) {
        updateGame(freshGame);
        const freshAnswer = getAnswer(freshGame.answer_index, freshGame.answer_word);
        if (!isGameWon(freshGame.guesses, freshAnswer) && !isGameLost(freshGame.guesses)) {
          const retryGuesses = [...freshGame.guesses, newGuess];
          const retryCount = freshGame.guess_count + 1;
          const retryWon = isGameWon(retryGuesses, freshAnswer);
          const retryLost = !retryWon && isGameLost(retryGuesses);

          const { error: retryError } = await supabase
            .from('wordle_games')
            .update({
              guesses: retryGuesses,
              guess_count: retryCount,
              status: retryWon ? 'won' : retryLost ? 'lost' : freshGame.status,
              winner: retryWon ? myPlayerNumber : null,
              [typingField]: null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', gameId)
            .eq('guess_count', freshGame.guess_count);

          if (retryError) {
            setError('Failed to submit guess, please try again');
            return false;
          }

          // Record after successful retry if game ended
          if ((retryWon || retryLost) && !matchRecorded.current) {
            matchRecorded.current = true;
            recordMatchResult({
              game_type: 'wordle',
              winner_id: null,
              winner_name: null,
              loser_id: null,
              loser_name: null,
              is_draw: false,
              metadata: { guessCount: retryCount, won: retryWon },
              player1_id: currentGame.player1_id!,
              player1_name: currentGame.player1_name!,
              player2_id: currentGame.player2_id!,
              player2_name: currentGame.player2_name!,
            });
          }
        }
      }
      return true;
    }

    // Record match result when game ends (won or lost)
    if ((won || lost) && !matchRecorded.current) {
      matchRecorded.current = true;
      recordMatchResult({
        game_type: 'wordle',
        winner_id: null,
        winner_name: null,
        loser_id: null,
        loser_name: null,
        is_draw: false,
        metadata: { guessCount: newGuessCount, won },
        player1_id: currentGame.player1_id!,
        player1_name: currentGame.player1_name!,
        player2_id: currentGame.player2_id!,
        player2_name: currentGame.player2_name!,
      });
    }

    return true;
  }, [gameId, updateGame, fetchGame]);

  const updateTyping = useCallback((text: string) => {
    const currentGame = gameRef.current;
    if (!currentGame) return;

    const myName = getMyName();
    if (!myName) return;

    const isPlayer1 = currentGame.player1_name === myName;
    const typingField = isPlayer1 ? 'player1_typing' : 'player2_typing';

    if (typingTimeout.current) {
      clearTimeout(typingTimeout.current);
    }

    typingTimeout.current = setTimeout(async () => {
      await supabase
        .from('wordle_games')
        .update({
          [typingField]: text || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', gameId);
    }, TYPING_DEBOUNCE_MS);
  }, [gameId]);

  const resetGame = useCallback(async () => {
    const { error: resetError } = await supabase
      .from('wordle_games')
      .update({
        guesses: [],
        guess_count: 0,
        status: 'waiting',
        winner: null,
        player1_typing: null,
        player2_typing: null,
        player1_name: null,
        player2_name: null,
        player1_id: null,
        player2_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', gameId);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    const { error: deleteError } = await supabase
      .from('wordle_games')
      .delete()
      .eq('id', gameId);

    if (deleteError) {
      console.error('Error deleting game:', deleteError);
    }

    setDeleted(true);
  }, [gameId]);

  return { game, loading, error, deleted, submitGuess, updateTyping, resetGame };
}

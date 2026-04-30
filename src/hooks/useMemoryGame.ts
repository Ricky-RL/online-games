'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import {
  processFlip,
  getNextTurn,
  isGameOver,
  getWinner,
  isDraw,
  createMemoryBoard,
  canFlipCard,
} from '@/lib/memory-logic';
import { recordMatchResult } from '@/lib/match-results';
import type { MemoryBoardState } from '@/lib/memory-types';

const POLL_INTERVAL_MS = 1500;

export interface MemoryGame {
  id: string;
  game_type: string;
  board: MemoryBoardState;
  current_turn: 1 | 2;
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

function totalScore(board: MemoryBoardState): number {
  return board.player1Score + board.player2Score;
}

interface UseMemoryGameReturn {
  game: MemoryGame | null;
  loading: boolean;
  error: string | null;
  deleted: boolean;
  firstFlip: number | null;
  flipCard: (cardIndex: number) => Promise<void>;
  resetGame: () => Promise<void>;
}

export function useMemoryGame(gameId: string): UseMemoryGameReturn {
  const [game, setGame] = useState<MemoryGame | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleted, setDeleted] = useState(false);
  const [firstFlip, setFirstFlip] = useState<number | null>(null);
  const gameRef = useRef<MemoryGame | null>(null);
  const matchRecorded = useRef(false);

  const updateGame = useCallback(
    (updater: MemoryGame | null | ((prev: MemoryGame | null) => MemoryGame | null)) => {
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

    return data as MemoryGame;
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

        if (JSON.stringify(fresh) === JSON.stringify(prev)) return prev;

        // Guard against out-of-order poll responses regressing state
        if (totalScore(fresh.board) < totalScore(prev.board)) {
          // Stale response from before our optimistic update was written
          return {
            ...prev,
            player1_name: fresh.player1_name,
            player2_name: fresh.player2_name,
            player1_id: fresh.player1_id,
            player2_id: fresh.player2_id,
          };
        }

        return fresh;
      });
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [gameId, fetchGame, updateGame, deleted]);

  // Record match result when game ends
  useEffect(() => {
    const currentGame = gameRef.current;
    if (!currentGame) return;
    if (matchRecorded.current) return;
    if (!currentGame.player1_id || !currentGame.player1_name) return;
    if (!currentGame.player2_id || !currentGame.player2_name) return;

    const gameOver = isGameOver(currentGame.board);
    if (!gameOver) return;

    matchRecorded.current = true;

    const winner = getWinner(currentGame.board);
    const draw = isDraw(currentGame.board);

    if (draw) {
      recordMatchResult({
        game_type: 'memory',
        winner_id: null,
        winner_name: null,
        loser_id: null,
        loser_name: null,
        is_draw: true,
        metadata: {
          player1Score: currentGame.board.player1Score,
          player2Score: currentGame.board.player2Score,
          totalPairs: 10,
        },
        player1_id: currentGame.player1_id!,
        player1_name: currentGame.player1_name!,
        player2_id: currentGame.player2_id!,
        player2_name: currentGame.player2_name!,
      });
    } else if (winner) {
      const winnerName = winner === 1 ? currentGame.player1_name : currentGame.player2_name;
      const loserName = winner === 1 ? currentGame.player2_name : currentGame.player1_name;
      const winnerId = winner === 1 ? currentGame.player1_id : currentGame.player2_id;
      const loserId = winner === 1 ? currentGame.player2_id : currentGame.player1_id;
      recordMatchResult({
        game_type: 'memory',
        winner_id: winnerId,
        winner_name: winnerName,
        loser_id: loserId,
        loser_name: loserName,
        is_draw: false,
        metadata: {
          player1Score: currentGame.board.player1Score,
          player2Score: currentGame.board.player2Score,
          totalPairs: 10,
        },
        player1_id: currentGame.player1_id!,
        player1_name: currentGame.player1_name!,
        player2_id: currentGame.player2_id!,
        player2_name: currentGame.player2_name!,
      });
    }
  }, [game]);

  const flipCard = useCallback(
    async (cardIndex: number) => {
      const currentGame = gameRef.current;
      if (!currentGame) return;

      if (currentGame.winner !== null || isGameOver(currentGame.board)) {
        setError('Game is already over');
        return;
      }

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

      const myPlayerNumber: 1 | 2 = isPlayer1 ? 1 : 2;

      if (currentGame.current_turn !== myPlayerNumber) {
        setError('Not your turn');
        return;
      }

      if (!canFlipCard(currentGame.board, cardIndex)) {
        setError('Card is already matched');
        return;
      }

      // First flip: just store locally, no server call
      if (firstFlip === null) {
        setFirstFlip(cardIndex);
        setError(null);
        return;
      }

      // Second flip: validate and process
      if (cardIndex === firstFlip) {
        setError('Cannot flip the same card twice');
        return;
      }

      if (!canFlipCard(currentGame.board, cardIndex)) {
        setError('Card is already matched');
        return;
      }

      const firstFlipIndex = firstFlip;
      setFirstFlip(null);
      setError(null);

      const newBoard = processFlip(currentGame.board, firstFlipIndex, cardIndex, myPlayerNumber);
      const nextTurn = getNextTurn(newBoard.lastFlipResult!, myPlayerNumber);
      const gameOver = isGameOver(newBoard);
      const winner = gameOver ? getWinner(newBoard) : null;

      // Optimistic update
      const previousGame = currentGame;
      updateGame((prev) =>
        prev
          ? {
              ...prev,
              board: newBoard,
              current_turn: nextTurn,
              winner,
            }
          : null
      );

      const { error: updateError } = await supabase
        .from('games')
        .update({
          board: newBoard,
          current_turn: nextTurn,
          winner,
          updated_at: new Date().toISOString(),
        })
        .eq('id', gameId);

      if (updateError) {
        // Rollback optimistic update
        updateGame(previousGame);
        const { data: freshGame } = await supabase
          .from('games')
          .select('*')
          .eq('id', gameId)
          .single();
        if (freshGame) updateGame(freshGame as MemoryGame);
        setError(updateError.message);
        return;
      }
    },
    [gameId, updateGame, firstFlip]
  );

  const resetGame = useCallback(async () => {
    const newBoard = createMemoryBoard();
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
    setFirstFlip(null);
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

  return { game, loading, error, deleted, firstFlip, flipCard, resetGame };
}

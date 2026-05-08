'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import {
  createReactionBoard,
  recordPlayerScore,
  computeWinner,
  isGameComplete,
  isDraw,
  type ReactionBoardState,
} from '@/lib/reaction-logic';
import { recordMatchResult } from '@/lib/match-results';
import { getStoredUserSlotInfo } from '@/lib/players';

const POLL_INTERVAL_MS = 1500;

export interface ReactionGame {
  id: string;
  game_type: string;
  board: ReactionBoardState;
  current_turn: number;
  winner: number | null;
  player1_id: string | null;
  player2_id: string | null;
  player1_name: string | null;
  player2_name: string | null;
  created_at: string;
  updated_at: string;
}

interface UseReactionGameReturn {
  game: ReactionGame | null;
  loading: boolean;
  error: string | null;
  deleted: boolean;
  submitScore: (score: number) => Promise<void>;
  resetGame: () => Promise<void>;
}

export function useReactionGame(gameId: string): UseReactionGameReturn {
  const [game, setGame] = useState<ReactionGame | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleted, setDeleted] = useState(false);
  const optimisticBoard = useRef<ReactionBoardState | null>(null);
  const gameRef = useRef<ReactionGame | null>(null);
  const matchRecorded = useRef(false);
  const autoJoinAttempted = useRef(false);
  const router = useRouter();

  const updateGame = useCallback(
    (updater: ReactionGame | null | ((prev: ReactionGame | null) => ReactionGame | null)) => {
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

    if (data.game_type !== 'reaction') {
      updateGame(null);
      setDeleted(true);
      return null;
    }

    return data as ReactionGame;
  }, [gameId, updateGame]);

  const tryAutoJoin = useCallback(async (gameData: ReactionGame) => {
    if (autoJoinAttempted.current) return;

    const { user, isCurrentUserSlot, isBoundUserSlot } = getStoredUserSlotInfo();
    if (!user?.boundUserId) return;

    const alreadyInGame =
      isCurrentUserSlot(gameData.player1_id, gameData.player1_name) ||
      isCurrentUserSlot(gameData.player2_id, gameData.player2_name);
    const creatorIsBoundOpponent = isBoundUserSlot(gameData.player1_id, gameData.player1_name);

    if (!alreadyInGame && creatorIsBoundOpponent && gameData.player2_id === null && gameData.player2_name === null) {
      autoJoinAttempted.current = true;

      const boardUpdate =
        gameData.board.phase === 'p1_done'
          ? { ...gameData.board, phase: 'p2_playing' as const }
          : undefined;

      const { error: joinError } = await supabase
        .from('games')
        .update({
          player2_id: user.id,
          player2_name: user.name,
          ...(boardUpdate ? { board: boardUpdate } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq('id', gameId)
        .eq('game_type', 'reaction')
        .eq('player1_id', user.boundUserId)
        .is('winner', null)
        .is('player2_id', null)
        .is('player2_name', null);

      if (joinError) {
        console.error('Auto-join failed:', joinError);
        return;
      }

      updateGame((prev) =>
        prev
          ? {
              ...prev,
              player2_id: user.id,
              player2_name: user.name,
              ...(boardUpdate ? { board: boardUpdate } : {}),
            }
          : null
      );
    }
  }, [gameId, updateGame]);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      setLoading(true);
      const gameData = await fetchGame();
      if (cancelled) return;
      if (gameData) {
        updateGame(gameData);
        await tryAutoJoin(gameData);
      }
      setLoading(false);
    }
    init();
    return () => {
      cancelled = true;
    };
  }, [fetchGame, updateGame, tryAutoJoin]);

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
          optimisticBoard.current = null;
        }

        if (JSON.stringify(fresh) === JSON.stringify(prev)) return prev;
        return fresh;
      });

      await tryAutoJoin(fresh);
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [gameId, fetchGame, updateGame, deleted, tryAutoJoin]);

  useEffect(() => {
    if (deleted) {
      router.push('/');
    }
  }, [deleted, router]);

  const submitScore = useCallback(
    async (score: number) => {
      const currentGame = gameRef.current;
      if (!currentGame) return;

      const { user, isCurrentUserSlot } = getStoredUserSlotInfo();
      if (!user) {
        setError('No player name set');
        return;
      }

      const isPlayer1 = isCurrentUserSlot(currentGame.player1_id, currentGame.player1_name);
      const isPlayer2 = isCurrentUserSlot(currentGame.player2_id, currentGame.player2_name);

      if (!isPlayer1 && !isPlayer2) {
        setError('You are not a player in this game');
        return;
      }

      const myPlayerNumber: 1 | 2 = isPlayer1 ? 1 : 2;
      const board = currentGame.board;

      if (myPlayerNumber === 1 && board.phase !== 'p1_playing') {
        setError('Not your turn');
        return;
      }
      if (myPlayerNumber === 2 && board.phase !== 'p2_playing') {
        setError('Not your turn');
        return;
      }

      if (currentGame.winner !== null) {
        setError('Game is already over');
        return;
      }

      let newBoard: ReactionBoardState;
      try {
        newBoard = recordPlayerScore(board, myPlayerNumber, score);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Invalid move');
        return;
      }

      optimisticBoard.current = newBoard;
      const gameOver = isGameComplete(newBoard);
      const winner = gameOver ? computeWinner(newBoard) : null;

      updateGame((prev) =>
        prev
          ? {
              ...prev,
              board: newBoard,
              current_turn: newBoard.phase === 'p1_done' || newBoard.phase === 'p2_playing' ? 2 : prev.current_turn,
              winner,
            }
          : null
      );
      setError(null);

      const updates: Record<string, unknown> = {
        board: newBoard,
        updated_at: new Date().toISOString(),
      };

      if (myPlayerNumber === 1 && newBoard.phase === 'p1_done') {
        updates.current_turn = 2;
        if (currentGame.player2_id !== null) {
          newBoard = { ...newBoard, phase: 'p2_playing' };
          updates.board = newBoard;
          optimisticBoard.current = newBoard;
          updateGame((prev) =>
            prev ? { ...prev, board: newBoard, current_turn: 2, winner } : null
          );
        }
      }

      if (myPlayerNumber === 2 && newBoard.phase === 'complete') {
        updates.winner = winner;
      }

      const { error: updateError } = await supabase
        .from('games')
        .update(updates)
        .eq('id', gameId);

      if (updateError) {
        optimisticBoard.current = null;
        const { data: freshGame } = await supabase
          .from('games')
          .select('*')
          .eq('id', gameId)
          .single();
        if (freshGame) updateGame(freshGame as ReactionGame);
        setError(updateError.message);
        return;
      }

      if (gameOver && !matchRecorded.current) {
        matchRecorded.current = true;
        const gameIsDraw = isDraw(newBoard);

        const winnerName = winner === 1 ? currentGame.player1_name : winner === 2 ? currentGame.player2_name : null;
        const loserName = winner === 1 ? currentGame.player2_name : winner === 2 ? currentGame.player1_name : null;
        const winnerId = winner === 1 ? currentGame.player1_id : winner === 2 ? currentGame.player2_id : null;
        const loserId = winner === 1 ? currentGame.player2_id : winner === 2 ? currentGame.player1_id : null;

        recordMatchResult({
          game_type: 'reaction',
          game_id: gameId,
          winner_id: winnerId,
          winner_name: winnerName,
          loser_id: loserId,
          loser_name: loserName,
          is_draw: gameIsDraw,
          metadata: {
            player1Score: newBoard.player1Score,
            player2Score: newBoard.player2Score,
          },
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
        board: createReactionBoard(),
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

  return { game, loading, error, deleted, submitScore, resetGame };
}

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import {
  createBigTwoBoard,
  resolveRuleset,
  getNextTurnAfterPass,
  getNextTurnAfterPlay,
  passTurn as computePass,
  playCards as computePlay,
  type BigTwoRuleset,
  type BigTwoBoardState,
} from '@/lib/big-2-rules';
import { recordMatchResult } from '@/lib/match-results';
import type { Player } from '@/lib/types';

const POLL_INTERVAL_MS = 1500;

export interface Big2Game {
  id: string;
  game_type: 'big-2';
  board: BigTwoBoardState;
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

interface UseBig2GameReturn {
  game: Big2Game | null;
  loading: boolean;
  error: string | null;
  deleted: boolean;
  playCards: (cardIds: string[]) => Promise<void>;
  pass: () => Promise<void>;
  resetGame: () => Promise<void>;
  endGame: () => Promise<void>;
}

export function useBig2Game(gameId: string): UseBig2GameReturn {
  const [game, setGame] = useState<Big2Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleted, setDeleted] = useState(false);
  const gameRef = useRef<Big2Game | null>(null);
  const optimisticMoveCount = useRef<number | null>(null);
  const matchRecorded = useRef(false);

  const updateGame = useCallback((updater: Big2Game | null | ((prev: Big2Game | null) => Big2Game | null)) => {
    setGame((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      gameRef.current = next;
      return next;
    });
  }, []);

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

    return data as Big2Game;
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
    return () => {
      cancelled = true;
    };
  }, [fetchGame, updateGame]);

  useEffect(() => {
    if (deleted) return;

    const interval = setInterval(async () => {
      const fresh = await fetchGame();
      if (!fresh) return;

      updateGame((prev) => {
        if (!prev) return fresh;
        if (JSON.stringify(fresh) === JSON.stringify(prev)) return prev;

        if (optimisticMoveCount.current !== null) {
          if (fresh.board.moveCount >= optimisticMoveCount.current) {
            optimisticMoveCount.current = null;
            return fresh;
          }
          return {
            ...prev,
            player1_id: fresh.player1_id,
            player2_id: fresh.player2_id,
            player1_name: fresh.player1_name,
            player2_name: fresh.player2_name,
          };
        }

        if (fresh.board.moveCount < prev.board.moveCount) {
          return {
            ...prev,
            player1_id: fresh.player1_id,
            player2_id: fresh.player2_id,
            player1_name: fresh.player1_name,
            player2_name: fresh.player2_name,
          };
        }

        return fresh;
      });
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [deleted, fetchGame, updateGame]);

  const recordWin = useCallback((currentGame: Big2Game, winner: Player, board: BigTwoBoardState) => {
    if (matchRecorded.current) return;
    if (!currentGame.player1_id || !currentGame.player1_name) return;
    if (!currentGame.player2_id || !currentGame.player2_name) return;

    matchRecorded.current = true;
    const winnerName = winner === 1 ? currentGame.player1_name : currentGame.player2_name;
    const loserName = winner === 1 ? currentGame.player2_name : currentGame.player1_name;
    const winnerId = winner === 1 ? currentGame.player1_id : currentGame.player2_id;
    const loserId = winner === 1 ? currentGame.player2_id : currentGame.player1_id;

    recordMatchResult({
      game_type: 'big-2',
      game_id: gameId,
      winner_id: winnerId,
      winner_name: winnerName,
      loser_id: loserId,
      loser_name: loserName,
      is_draw: false,
      metadata: {
        player1Score: board.scores['1'],
        player2Score: board.scores['2'],
        player1CardsLeft: board.hands['1'].length,
        player2CardsLeft: board.hands['2'].length,
        moves: board.moveCount,
      },
      player1_id: currentGame.player1_id,
      player1_name: currentGame.player1_name,
      player2_id: currentGame.player2_id,
      player2_name: currentGame.player2_name,
    });
  }, [gameId]);

  const getMyPlayerNumber = useCallback((currentGame: Big2Game): Player | null => {
    const myName = getMyName();
    if (!myName) {
      setError('No player name set');
      return null;
    }
    if (currentGame.player1_name === myName) return 1;
    if (currentGame.player2_name === myName) return 2;
    setError('You are not a player in this game');
    return null;
  }, []);

  const persistTurn = useCallback(
    async (nextBoard: BigTwoBoardState, nextTurn: Player, winner: Player | null, previousGame: Big2Game) => {
      optimisticMoveCount.current = nextBoard.moveCount;
      updateGame((prev) =>
        prev
          ? {
              ...prev,
              board: nextBoard,
              current_turn: nextTurn,
              winner,
            }
          : null
      );
      setError(null);

      const { data: updatedGame, error: updateError } = await supabase
        .from('games')
        .update({
          board: nextBoard,
          current_turn: nextTurn,
          winner,
          updated_at: new Date().toISOString(),
        })
        .eq('id', gameId)
        .select()
        .single();

      if (updateError || !updatedGame) {
        optimisticMoveCount.current = null;
        updateGame(previousGame);
        const { data: freshGame } = await supabase.from('games').select('*').eq('id', gameId).single();
        if (freshGame) updateGame(freshGame as Big2Game);
        if (updateError) setError(updateError.message);
        return;
      }

      optimisticMoveCount.current = null;
      updateGame(updatedGame as Big2Game);
      if (winner) recordWin(previousGame, winner, nextBoard);
    },
    [gameId, recordWin, updateGame]
  );

  const playCards = useCallback(
    async (cardIds: string[]) => {
      const currentGame = gameRef.current;
      if (!currentGame) return;
      if (currentGame.winner !== null) {
        setError('Game is already over');
        return;
      }

      const myPlayerNumber = getMyPlayerNumber(currentGame);
      if (!myPlayerNumber) return;
      if (currentGame.current_turn !== myPlayerNumber) {
        setError('Not your turn');
        return;
      }

      try {
        const { board: nextBoard, winner } = computePlay(currentGame.board, myPlayerNumber, cardIds);
        const nextTurn = getNextTurnAfterPlay(currentGame.board, myPlayerNumber, winner);
        await persistTurn(nextBoard, nextTurn, winner, currentGame);
      } catch (moveError) {
        setError(moveError instanceof Error ? moveError.message : 'Invalid play');
      }
    },
    [getMyPlayerNumber, persistTurn]
  );

  const pass = useCallback(async () => {
    const currentGame = gameRef.current;
    if (!currentGame) return;
    if (currentGame.winner !== null) {
      setError('Game is already over');
      return;
    }

    const myPlayerNumber = getMyPlayerNumber(currentGame);
    if (!myPlayerNumber) return;
    if (currentGame.current_turn !== myPlayerNumber) {
      setError('Not your turn');
      return;
    }

    try {
      const nextTurn = getNextTurnAfterPass(currentGame.board);
      const nextBoard = computePass(currentGame.board, myPlayerNumber);
      await persistTurn(nextBoard, nextTurn, null, currentGame);
    } catch (moveError) {
      setError(moveError instanceof Error ? moveError.message : 'Invalid pass');
    }
  }, [getMyPlayerNumber, persistTurn]);

  const resetGame = useCallback(async () => {
    const ruleset: BigTwoRuleset = resolveRuleset(gameRef.current?.board);
    const newBoard = createBigTwoBoard(1, Math.random, ruleset);
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
      setError(resetError.message);
      return;
    }

    matchRecorded.current = false;
    updateGame((prev) =>
      prev
        ? {
            ...prev,
            board: newBoard,
            current_turn: 1,
            winner: null,
          }
        : null
    );
  }, [gameId, updateGame]);

  const endGame = useCallback(async () => {
    const ruleset: BigTwoRuleset = resolveRuleset(gameRef.current?.board);
    const { error: endError } = await supabase
      .from('games')
      .update({
        game_type: 'ended',
        board: createBigTwoBoard(1, Math.random, ruleset),
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
      setError(endError.message);
      return;
    }

    const { error: deleteError } = await supabase.from('games').delete().eq('id', gameId);
    if (deleteError) {
      console.error('Error deleting game:', deleteError);
    }
    setDeleted(true);
  }, [gameId]);

  return { game, loading, error, deleted, playCards, pass, resetGame, endGame };
}

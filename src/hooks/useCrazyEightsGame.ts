'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  createCrazyEightsBoard,
  drawCardForTurn,
  passAfterDraw,
  playCrazyEightsCard as computePlayCrazyEightsCard,
  type CrazyEightsBoardState,
  type CrazyEightsSuit,
} from '@/lib/crazy-eights-logic';
import { recordMatchResult, type MatchResultInsert } from '@/lib/match-results';
import type { Player } from '@/lib/types';

const POLL_INTERVAL_MS = 1500;

export interface CrazyEightsGame {
  id: string;
  game_type: 'crazy-eights';
  board: CrazyEightsBoardState;
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

function getMyPlayerNumber(game: CrazyEightsGame): Player | null {
  const myName = getMyName();
  if (!myName) return null;
  if (game.player1_name === myName) return 1;
  if (game.player2_name === myName) return 2;
  return null;
}

interface UseCrazyEightsGameReturn {
  game: CrazyEightsGame | null;
  loading: boolean;
  error: string | null;
  deleted: boolean;
  playCard: (cardId: string, chosenSuit?: CrazyEightsSuit) => Promise<void>;
  drawCard: () => Promise<void>;
  pass: () => Promise<void>;
  resetGame: () => Promise<void>;
  endGame: () => Promise<void>;
}

export function useCrazyEightsGame(gameId: string): UseCrazyEightsGameReturn {
  const [game, setGame] = useState<CrazyEightsGame | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleted, setDeleted] = useState(false);

  const gameRef = useRef<CrazyEightsGame | null>(null);
  const optimisticTurnSequence = useRef<number | null>(null);
  const matchRecorded = useRef(false);

  const updateGame = useCallback((updater: CrazyEightsGame | null | ((prev: CrazyEightsGame | null) => CrazyEightsGame | null)) => {
    setGame((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      gameRef.current = next;
      return next;
    });
  }, []);

  const fetchGame = useCallback(async () => {
    const { data, error: fetchError } = await supabase.from('games').select('*').eq('id', gameId).single();
    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        updateGame(null);
        setDeleted(true);
      } else {
        setError(fetchError.message);
      }
      return null;
    }

    if (data.game_type === 'ended') {
      updateGame(null);
      setDeleted(true);
      return null;
    }

    return data as CrazyEightsGame;
  }, [gameId, updateGame]);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      setLoading(true);
      const fresh = await fetchGame();
      if (cancelled) return;
      if (fresh) updateGame(fresh);
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
        if (JSON.stringify(prev) === JSON.stringify(fresh)) return prev;

        if (optimisticTurnSequence.current !== null) {
          if (fresh.board.turnSequence >= optimisticTurnSequence.current) {
            optimisticTurnSequence.current = null;
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

        if (fresh.board.turnSequence < prev.board.turnSequence) {
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

  const recordWin = useCallback((currentGame: CrazyEightsGame, winner: Player, board: CrazyEightsBoardState) => {
    if (matchRecorded.current) return;
    if (!currentGame.player1_id || !currentGame.player1_name || !currentGame.player2_id || !currentGame.player2_name) {
      return;
    }

    matchRecorded.current = true;
    const winnerName = winner === 1 ? currentGame.player1_name : currentGame.player2_name;
    const loserName = winner === 1 ? currentGame.player2_name : currentGame.player1_name;
    const winnerId = winner === 1 ? currentGame.player1_id : currentGame.player2_id;
    const loserId = winner === 1 ? currentGame.player2_id : currentGame.player1_id;

    const insert: MatchResultInsert = {
      game_type: 'crazy-eights',
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
    };
    recordMatchResult(insert);
  }, [gameId]);

  const persistState = useCallback(async (nextBoard: CrazyEightsBoardState, winner: Player | null, previousGame: CrazyEightsGame) => {
    optimisticTurnSequence.current = nextBoard.turnSequence;
    updateGame((prev) =>
      prev
        ? {
            ...prev,
            board: nextBoard,
            current_turn: nextBoard.activePlayer,
            winner,
          }
        : null
    );
    setError(null);

    const { data: updatedGame, error: updateError } = await supabase
      .from('games')
      .update({
        board: nextBoard,
        current_turn: nextBoard.activePlayer,
        winner,
        updated_at: new Date().toISOString(),
      })
      .eq('id', gameId)
      .eq('board->>turnSequence', String(previousGame.board.turnSequence))
      .select()
      .single();

    if (updateError || !updatedGame) {
      optimisticTurnSequence.current = null;
      const fresh = await fetchGame();
      if (fresh) updateGame(fresh);
      const isExpectedConflict = !updatedGame || updateError?.code === 'PGRST116';
      if (!isExpectedConflict && updateError) {
        setError(updateError.message);
      }
      return;
    }

    optimisticTurnSequence.current = null;
    updateGame(updatedGame as CrazyEightsGame);
    if (winner) recordWin(previousGame, winner, nextBoard);
  }, [fetchGame, gameId, recordWin, updateGame]);

  const playCard = useCallback(async (cardId: string, chosenSuit?: CrazyEightsSuit) => {
    const current = gameRef.current;
    if (!current) return;
    if (current.winner !== null) {
      setError('Game is already over');
      return;
    }

    const myPlayer = getMyPlayerNumber(current);
    if (!myPlayer) {
      setError('You are not a player in this game');
      return;
    }

    if (current.current_turn !== myPlayer) {
      setError('Not your turn');
      return;
    }

    try {
      const result = computePlayCrazyEightsCard(current.board, myPlayer, cardId, chosenSuit);

      const opponentJoined = myPlayer === 1 ? !!current.player2_id : !!current.player1_id;
      if (!opponentJoined && result.winner !== null) {
        setError('Wait for opponent to join before finishing the game');
        return;
      }

      await persistState(result.board, result.winner, current);
    } catch (moveError) {
      setError(moveError instanceof Error ? moveError.message : 'Invalid play');
    }
  }, [persistState]);

  const drawCard = useCallback(async () => {
    const current = gameRef.current;
    if (!current) return;
    if (current.winner !== null) {
      setError('Game is already over');
      return;
    }

    const myPlayer = getMyPlayerNumber(current);
    if (!myPlayer) {
      setError('You are not a player in this game');
      return;
    }

    if (current.current_turn !== myPlayer) {
      setError('Not your turn');
      return;
    }

    try {
      const drawResult = drawCardForTurn(current.board, myPlayer);
      await persistState(drawResult.board, null, current);
    } catch (moveError) {
      setError(moveError instanceof Error ? moveError.message : 'Could not draw');
    }
  }, [persistState]);

  const pass = useCallback(async () => {
    const current = gameRef.current;
    if (!current) return;
    if (current.winner !== null) {
      setError('Game is already over');
      return;
    }

    const myPlayer = getMyPlayerNumber(current);
    if (!myPlayer) {
      setError('You are not a player in this game');
      return;
    }

    if (current.current_turn !== myPlayer) {
      setError('Not your turn');
      return;
    }

    try {
      const nextBoard = passAfterDraw(current.board, myPlayer);
      await persistState(nextBoard, null, current);
    } catch (moveError) {
      setError(moveError instanceof Error ? moveError.message : 'Could not pass');
    }
  }, [persistState]);

  const resetGame = useCallback(async () => {
    const newBoard = createCrazyEightsBoard(1);
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
    const { error: endError } = await supabase
      .from('games')
      .update({
        game_type: 'ended',
        board: createCrazyEightsBoard(1),
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
      console.error('Error deleting Crazy Eights game:', deleteError);
    }
    setDeleted(true);
  }, [gameId]);

  return { game, loading, error, deleted, playCard, drawCard, pass, resetGame, endGame };
}

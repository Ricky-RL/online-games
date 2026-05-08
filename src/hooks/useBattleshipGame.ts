'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import {
  makeAttack as computeAttack,
  shouldKeepTurn,
  checkWinner,
  totalAttacks,
  startBoardIfReady,
} from '@/lib/battleship-logic';
import { recordMatchResult } from '@/lib/match-results';
import type { Player, BattleshipGame, BattleshipBoardState, Attack } from '@/lib/types';

const POLL_INTERVAL_MS = 1500;

function getMyName(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('player-name') || localStorage.getItem('player-name');
}

interface UseBattleshipGameReturn {
  game: BattleshipGame | null;
  loading: boolean;
  error: string | null;
  lastAttack: Attack | null;
  deleted: boolean;
  makeAttack: (row: number, col: number) => Promise<void>;
  resetGame: () => Promise<void>;
}

export function useBattleshipGame(gameId: string): UseBattleshipGameReturn {
  const [game, setGame] = useState<BattleshipGame | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastAttack, setLastAttack] = useState<Attack | null>(null);
  const [deleted, setDeleted] = useState(false);
  const optimisticBoard = useRef<BattleshipBoardState | null>(null);
  const gameRef = useRef<BattleshipGame | null>(null);
  const matchRecordedRef = useRef(false);

  const updateGame = useCallback(
    (updater: BattleshipGame | null | ((prev: BattleshipGame | null) => BattleshipGame | null)) => {
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

    const gameData = data as BattleshipGame;
    const hasBothPlayers = Boolean(
      (gameData.player1_id || gameData.player1_name) &&
      (gameData.player2_id || gameData.player2_name)
    );

    if (hasBothPlayers) {
      const board = startBoardIfReady(gameData.board);
      if (board !== gameData.board) {
        const updatedGame = { ...gameData, board };
        await supabase
          .from('games')
          .update({
            board,
            updated_at: new Date().toISOString(),
          })
          .eq('id', gameId)
          .eq('game_type', 'battleship')
          .is('winner', null);
        return updatedGame;
      }
    }

    return gameData;
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

        if (optimisticBoard.current) {
          if (JSON.stringify(fresh.board) === JSON.stringify(optimisticBoard.current)) {
            optimisticBoard.current = null;
            return fresh;
          }
          if (totalAttacks(fresh.board) < totalAttacks(prev.board)) {
            return {
              ...prev,
              player1_name: fresh.player1_name,
              player2_name: fresh.player2_name,
              player1_id: fresh.player1_id,
              player2_id: fresh.player2_id,
            };
          }
          optimisticBoard.current = null;
        }

        if (JSON.stringify(fresh) === JSON.stringify(prev)) return prev;

        if (totalAttacks(fresh.board) < totalAttacks(prev.board)) {
          return prev;
        }

        if (totalAttacks(fresh.board) > totalAttacks(prev.board)) {
          if (fresh.board.player1Attacks.length > prev.board.player1Attacks.length) {
            const newAtk = fresh.board.player1Attacks[fresh.board.player1Attacks.length - 1];
            setLastAttack(newAtk);
          } else if (fresh.board.player2Attacks.length > prev.board.player2Attacks.length) {
            const newAtk = fresh.board.player2Attacks[fresh.board.player2Attacks.length - 1];
            setLastAttack(newAtk);
          }
        }

        return fresh;
      });
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [gameId, fetchGame, updateGame, deleted]);

  const makeAttack = useCallback(
    async (row: number, col: number) => {
      const currentGame = gameRef.current;
      if (!currentGame) return;

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

      const myPlayerNumber: Player = isPlayer1 ? 1 : 2;

      if (currentGame.current_turn !== myPlayerNumber) {
        setError('Not your turn');
        return;
      }

      if (currentGame.winner !== null) {
        setError('Game is already over');
        return;
      }

      if (currentGame.board.phase !== 'playing') {
        setError('Game not in progress');
        return;
      }

      let newBoard: BattleshipBoardState;
      try {
        newBoard = computeAttack(currentGame.board, row, col, myPlayerNumber);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Invalid attack');
        return;
      }

      const myAttacks = myPlayerNumber === 1 ? newBoard.player1Attacks : newBoard.player2Attacks;
      const lastAtk = myAttacks[myAttacks.length - 1];
      const keepTurn = shouldKeepTurn(lastAtk.result);
      const winner = checkWinner(newBoard);
      const nextTurn: Player = winner
        ? currentGame.current_turn
        : keepTurn
          ? myPlayerNumber
          : (myPlayerNumber === 1 ? 2 : 1);

      optimisticBoard.current = newBoard;
      setLastAttack(lastAtk);
      updateGame((prev) =>
        prev
          ? { ...prev, board: newBoard, current_turn: nextTurn, winner }
          : null
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
        .eq('id', gameId);

      if (updateError) {
        optimisticBoard.current = null;
        const { data: freshGame } = await supabase
          .from('games')
          .select('*')
          .eq('id', gameId)
          .single();
        if (freshGame) updateGame(freshGame as BattleshipGame);
        setError(updateError.message);
      }

      // Record match result when a winner is determined (only once)
      if (winner && !updateError && !matchRecordedRef.current) {
        matchRecordedRef.current = true;
        const winnerPlayer = winner === 1 ? currentGame.player1_name : currentGame.player2_name;
        const loserPlayer = winner === 1 ? currentGame.player2_name : currentGame.player1_name;
        const winnerId = winner === 1 ? currentGame.player1_id : currentGame.player2_id;
        const loserId = winner === 1 ? currentGame.player2_id : currentGame.player1_id;
        recordMatchResult({
          game_type: 'battleship',
          game_id: gameId,
          winner_id: winnerId,
          winner_name: winnerPlayer,
          loser_id: loserId,
          loser_name: loserPlayer,
          is_draw: false,
          metadata: null,
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
        board: {
          player1Ships: [],
          player2Ships: [],
          player1Attacks: [],
          player2Attacks: [],
          phase: 'setup',
        },
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

  return { game, loading, error, lastAttack, deleted, makeAttack, resetGame };
}

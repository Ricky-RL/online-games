'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import {
  applyMove,
  checkWin,
  getCheckersGameStatus,
  createInitialBoard,
} from '@/lib/checkers-logic';
import type { Player, CheckersGameState, CheckersMove } from '@/lib/types';

const POLL_INTERVAL_MS = 1500;

export interface CheckersGame {
  id: string;
  game_type: string;
  board: CheckersGameState;
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

interface UseCheckersGameReturn {
  game: CheckersGame | null;
  loading: boolean;
  error: string | null;
  lastMove: CheckersMove | null;
  deleted: boolean;
  makeMove: (move: CheckersMove) => Promise<void>;
  resetGame: () => Promise<void>;
}

export function useCheckersGame(gameId: string): UseCheckersGameReturn {
  const [game, setGame] = useState<CheckersGame | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastMove, setLastMove] = useState<CheckersMove | null>(null);
  const [deleted, setDeleted] = useState(false);
  const optimisticBoard = useRef<CheckersGameState | null>(null);
  const isMultiJumping = useRef(false);
  const gameRef = useRef<CheckersGame | null>(null);

  const updateGame = useCallback(
    (updater: CheckersGame | null | ((prev: CheckersGame | null) => CheckersGame | null)) => {
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

    return data as CheckersGame;
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
    return () => { cancelled = true; };
  }, [fetchGame, updateGame]);

  useEffect(() => {
    if (deleted) return;

    const interval = setInterval(async () => {
      if (isMultiJumping.current) return;

      const fresh = await fetchGame();
      if (!fresh) return;

      updateGame((prev) => {
        if (!prev) return fresh;

        if (optimisticBoard.current) {
          if (fresh.board.settings.moveCount >= optimisticBoard.current.settings.moveCount) {
            optimisticBoard.current = null;
            return fresh;
          }
          if (fresh.board.settings.moveCount < prev.board.settings.moveCount) {
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

        if (fresh.board.settings.moveCount < prev.board.settings.moveCount) {
          return prev;
        }

        if (fresh.board.settings.moveCount > prev.board.settings.moveCount) {
          setLastMove(null);
        }

        return fresh;
      });
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [gameId, fetchGame, updateGame, deleted]);

  const makeMove = useCallback(
    async (move: CheckersMove) => {
      const currentGame = gameRef.current;
      if (!currentGame) return;

      const myName = getMyName();
      if (!myName) { setError('No player name set'); return; }

      const isPlayer1 = currentGame.player1_name === myName;
      const isPlayer2 = currentGame.player2_name === myName;
      if (!isPlayer1 && !isPlayer2) { setError('You are not a player in this game'); return; }

      const myPlayerNumber: Player = isPlayer1 ? 1 : 2;
      if (currentGame.current_turn !== myPlayerNumber) { setError('Not your turn'); return; }
      if (currentGame.winner !== null) { setError('Game is already over'); return; }

      const newBoard = applyMove(currentGame.board, move, myPlayerNumber);
      const winner = checkWin(newBoard, myPlayerNumber);
      const turnEnds = newBoard.settings.continuingPiece === null;
      const nextTurn: Player = turnEnds ? ((3 - myPlayerNumber) as Player) : myPlayerNumber;

      isMultiJumping.current = !turnEnds;
      optimisticBoard.current = newBoard;
      setLastMove(move);
      updateGame((prev) =>
        prev ? { ...prev, board: newBoard, current_turn: winner ? prev.current_turn : nextTurn, winner } : null
      );
      setError(null);

      const { error: updateError } = await supabase
        .from('games')
        .update({
          board: newBoard,
          current_turn: winner ? currentGame.current_turn : nextTurn,
          winner,
          updated_at: new Date().toISOString(),
        })
        .eq('id', gameId);

      if (updateError) {
        optimisticBoard.current = null;
        isMultiJumping.current = false;
        const { data: freshGame } = await supabase
          .from('games').select('*').eq('id', gameId).single();
        if (freshGame) updateGame(freshGame as CheckersGame);
        setError(updateError.message);
      }
    },
    [gameId, updateGame]
  );

  const resetGame = useCallback(async () => {
    const emptyBoard = createInitialBoard(true);
    const { error: resetError } = await supabase
      .from('games')
      .update({
        game_type: 'ended',
        board: emptyBoard,
        current_turn: 1,
        winner: null,
        player1_name: null,
        player2_name: null,
        player1_id: null,
        player2_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', gameId);

    if (resetError) { console.error('Error resetting game:', resetError); setError(resetError.message); return; }

    const { error: deleteError } = await supabase.from('games').delete().eq('id', gameId);
    if (deleteError) console.error('Error deleting game:', deleteError);

    setDeleted(true);
  }, [gameId]);

  return { game, loading, error, lastMove, deleted, makeMove, resetGame };
}

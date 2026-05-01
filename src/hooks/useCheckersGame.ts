'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import {
  applyMove,
  checkWin,
  getCheckersGameStatus,
  createInitialBoard,
} from '@/lib/checkers-logic';
import { getStoredPlayerName, PLAYER_IDS } from '@/lib/players';
import type { Player, CheckersGameState, CheckersMove } from '@/lib/types';

const POLL_INTERVAL_MS = 1500;

function detectMove(prev: CheckersGameState, next: CheckersGameState): CheckersMove | null {
  let to: [number, number] | null = null;
  const removed: [number, number][] = [];

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const prevCell = prev.cells[r][c];
      const nextCell = next.cells[r][c];
      if (!prevCell && nextCell) {
        to = [r, c];
      } else if (prevCell && !nextCell) {
        removed.push([r, c]);
      }
    }
  }

  if (!to || removed.length === 0) return null;

  const movedPlayer = next.cells[to[0]][to[1]]!.player;
  const from = removed.find(([r, c]) => prev.cells[r][c]?.player === movedPlayer);
  if (!from) return null;

  const captured = removed.filter(([r, c]) => prev.cells[r][c]?.player !== movedPlayer);
  return { from, to, captured };
}

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
  opponentLastMove: CheckersMove | null;
  deleted: boolean;
  makeMove: (move: CheckersMove) => Promise<void>;
  resetGame: () => Promise<void>;
}

export function useCheckersGame(gameId: string): UseCheckersGameReturn {
  const [game, setGame] = useState<CheckersGame | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastMove, setLastMove] = useState<CheckersMove | null>(null);
  const [opponentLastMove, setOpponentLastMove] = useState<CheckersMove | null>(null);
  const [deleted, setDeleted] = useState(false);
  const optimisticBoard = useRef<CheckersGameState | null>(null);
  const isMultiJumping = useRef(false);
  const gameRef = useRef<CheckersGame | null>(null);
  const pendingDetectedMove = useRef<CheckersMove | null>(null);
  const autoJoinAttempted = useRef(false);

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

  const tryAutoJoin = useCallback(async (gameData: CheckersGame) => {
    if (autoJoinAttempted.current) return;

    const playerName = getStoredPlayerName();
    if (!playerName) return;

    const myId = PLAYER_IDS[playerName];
    const isPlayer1 = gameData.player1_id === myId || gameData.player1_name === playerName;

    if (!isPlayer1 && gameData.player2_id === null) {
      autoJoinAttempted.current = true;

      const { data: joined, error: joinError } = await supabase
        .from('games')
        .update({
          player2_id: myId,
          player2_name: playerName,
          updated_at: new Date().toISOString(),
        })
        .eq('id', gameId)
        .is('player2_id', null)
        .select()
        .single();

      if (joinError) {
        // Join failed — likely already joined via lobby. Re-fetch to get fresh state.
        const fresh = await fetchGame();
        if (fresh) updateGame(fresh);
        return;
      }

      if (joined) {
        updateGame(joined as CheckersGame);
      }
    }
  }, [gameId, updateGame, fetchGame]);

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
    return () => { cancelled = true; };
  }, [fetchGame, updateGame, tryAutoJoin]);

  useEffect(() => {
    if (deleted) return;

    const interval = setInterval(async () => {
      if (isMultiJumping.current) return;

      const fresh = await fetchGame();
      if (!fresh) return;

      pendingDetectedMove.current = null;

      updateGame((prev) => {
        if (!prev) return fresh;

        const freshMoves = fresh.board.settings.moveCount;
        const prevMoves = prev.board.settings.moveCount;

        if (optimisticBoard.current) {
          // DB confirmed our optimistic write
          if (JSON.stringify(fresh.board) === JSON.stringify(optimisticBoard.current)) {
            optimisticBoard.current = null;
            return fresh;
          }
          // The opponent made a move on top of ours (their move count exceeds ours)
          if (freshMoves > optimisticBoard.current.settings.moveCount) {
            optimisticBoard.current = null;
            return fresh;
          }
          // Fresh data has fewer moves — stale poll, keep optimistic state
          // but accept player name/id updates (e.g. opponent joining)
          if (freshMoves < prevMoves) {
            return {
              ...prev,
              player1_name: fresh.player1_name,
              player2_name: fresh.player2_name,
              player1_id: fresh.player1_id,
              player2_id: fresh.player2_id,
            };
          }
          // Fresh has same move count but different board content — clear
          // optimistic state and accept fresh to avoid getting stuck
          optimisticBoard.current = null;
        }

        if (JSON.stringify(fresh) === JSON.stringify(prev)) return prev;

        // Detect the opponent's new move for animation
        if (freshMoves > prevMoves && !fresh.board.settings.continuingPiece) {
          pendingDetectedMove.current = detectMove(prev.board, fresh.board);
        }

        // Guard against out-of-order polls regressing state
        if (freshMoves < prevMoves) {
          // Still pick up player name/id changes
          if (fresh.player1_name !== prev.player1_name ||
              fresh.player2_name !== prev.player2_name ||
              fresh.player1_id !== prev.player1_id ||
              fresh.player2_id !== prev.player2_id) {
            return {
              ...prev,
              player1_name: fresh.player1_name,
              player2_name: fresh.player2_name,
              player1_id: fresh.player1_id,
              player2_id: fresh.player2_id,
            };
          }
          return prev;
        }

        return fresh;
      });

      if (pendingDetectedMove.current) {
        setOpponentLastMove(pendingDetectedMove.current);
        setLastMove(null);
      }
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
      setOpponentLastMove(null);
      updateGame((prev) =>
        prev ? { ...prev, board: newBoard, current_turn: winner ? prev.current_turn : nextTurn, winner } : null
      );
      setError(null);

      const { data: updatedGame, error: updateError } = await supabase
        .from('games')
        .update({
          board: newBoard,
          current_turn: winner ? currentGame.current_turn : nextTurn,
          winner,
          updated_at: new Date().toISOString(),
        })
        .eq('id', gameId)
        .select()
        .single();

      if (updateError || !updatedGame) {
        optimisticBoard.current = null;
        isMultiJumping.current = false;
        const { data: freshGame } = await supabase
          .from('games').select('*').eq('id', gameId).single();
        if (freshGame) updateGame(freshGame as CheckersGame);
        if (updateError) setError(updateError.message);
        return;
      }

      optimisticBoard.current = null;
      updateGame(updatedGame as CheckersGame);
    },
    [gameId, updateGame]
  );

  const resetGame = useCallback(async () => {
    const emptyBoard = createInitialBoard();
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

  return { game, loading, error, lastMove, opponentLastMove, deleted, makeMove, resetGame };
}

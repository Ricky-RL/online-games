'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { MiniGolfGame, MiniGolfBoard, GamePhase, Shot } from '@/lib/mini-golf/types';
import { playerIndex, recordScore, isGameComplete, getWinner } from '@/lib/mini-golf/logic';
import { recordMatchResult } from '@/lib/match-results';
import { Player } from '@/lib/types';

const POLL_INTERVAL_MS = 1500;

interface UseMiniGolfGameReturn {
  game: MiniGolfGame | null;
  loading: boolean;
  error: string | null;
  deleted: boolean;
  takeShot: (shot: Shot) => Promise<void>;
  recordHoleResult: (strokes: number) => Promise<void>;
  setReady: () => Promise<void>;
  forfeit: () => Promise<void>;
  resetGame: () => Promise<void>;
}

export function useMiniGolfGame(gameId: string): UseMiniGolfGameReturn {
  const [game, setGame] = useState<MiniGolfGame | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleted, setDeleted] = useState(false);
  const gameRef = useRef<MiniGolfGame | null>(null);
  const matchRecorded = useRef(false);
  const pendingShotRef = useRef<Promise<void> | null>(null);

  const getPlayerNumber = useCallback((): Player | null => {
    const name = sessionStorage.getItem('player-name') || localStorage.getItem('player-name');
    const current = gameRef.current;
    if (!current) return null;
    if (name === current.player1_name) return 1;
    if (name === current.player2_name) return 2;
    return null;
  }, []);

  const fetchGame = useCallback(async () => {
    const { data, error: fetchError } = await supabase
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single();

    if (fetchError || !data) {
      if (!gameRef.current) setError('Game not found');
      else setDeleted(true);
      return;
    }

    const fresh = data as MiniGolfGame;

    gameRef.current = fresh;
    setGame(fresh);
    setLoading(false);
  }, [gameId]);

  useEffect(() => {
    fetchGame();
    const interval = setInterval(fetchGame, POLL_INTERVAL_MS);

    // Realtime subscription for instant cross-device updates
    const channel = supabase
      .channel(`mini-golf-${gameId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'games',
          filter: `id=eq.${gameId}`,
        },
        (payload: { new: Record<string, unknown> }) => {
          const fresh = payload.new as unknown as MiniGolfGame;
          const prev = gameRef.current;
          if (prev && fresh.board.version <= prev.board.version) return;
          gameRef.current = fresh;
          setGame(fresh);
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [fetchGame, gameId]);

  const takeShot = useCallback(async (shot: Shot) => {
    const current = gameRef.current;
    if (!current) return;

    const board: MiniGolfBoard = {
      ...current.board,
      currentStroke: current.board.currentStroke + 1,
      lastShot: shot,
      version: current.board.version + 1,
    };

    const optimistic = { ...current, board };
    gameRef.current = optimistic;
    setGame(optimistic);

    const shotPromise = (async () => {
      const { data: updatedRows, error: updateError } = await supabase
        .from('games')
        .update({ board, updated_at: new Date().toISOString() })
        .eq('id', gameId)
        .eq('board->>version', current.board.version)
        .select();

      if (updateError || !updatedRows || updatedRows.length === 0) {
        await fetchGame();
      }
    })();

    pendingShotRef.current = shotPromise;
    await shotPromise;
    pendingShotRef.current = null;
  }, [gameId, fetchGame]);

  const recordHoleResult = useCallback(async (strokes: number) => {
    if (pendingShotRef.current) {
      await pendingShotRef.current;
    }
    const current = gameRef.current;
    if (!current) return;
    const player = getPlayerNumber();
    if (!player) return;

    const newBoard = recordScore(current.board, current.board.currentHole, player, strokes);

    const gameComplete = isGameComplete(newBoard);
    const otherPlayer: Player = player === 1 ? 2 : 1;
    const otherPlayerIdx = playerIndex(otherPlayer);
    const currentHole = current.board.currentHole;
    const otherPlayerHasPlayedThisHole = newBoard.scores[currentHole][otherPlayerIdx] !== null;

    let phase: GamePhase = 'aiming';
    let currentTurn = current.current_turn;
    let winner = current.winner;
    let nextHole = currentHole;

    if (gameComplete && !matchRecorded.current) {
      phase = 'finished';
      winner = getWinner(newBoard);
      matchRecorded.current = true;

      if (current.player1_id && current.player2_id && current.player1_name && current.player2_name) {
        if (winner) {
          const winnerName = winner === 1 ? current.player1_name : current.player2_name;
          const loserName = winner === 1 ? current.player2_name : current.player1_name;
          const winnerId = winner === 1 ? current.player1_id : current.player2_id;
          const loserId = winner === 1 ? current.player2_id : current.player1_id;
          recordMatchResult({
            game_type: 'mini-golf',
            game_id: gameId,
            winner_id: winnerId,
            winner_name: winnerName,
            loser_id: loserId,
            loser_name: loserName,
            is_draw: false,
            metadata: null,
            player1_id: current.player1_id,
            player1_name: current.player1_name,
            player2_id: current.player2_id,
            player2_name: current.player2_name,
          });
        } else {
          recordMatchResult({
            game_type: 'mini-golf',
            game_id: gameId,
            winner_id: null,
            winner_name: null,
            loser_id: null,
            loser_name: null,
            is_draw: true,
            metadata: null,
            player1_id: current.player1_id,
            player1_name: current.player1_name,
            player2_id: current.player2_id,
            player2_name: current.player2_name,
          });
        }
      }
    } else if (gameComplete) {
      phase = 'finished';
      winner = getWinner(newBoard);
    } else if (!otherPlayerHasPlayedThisHole) {
      // Other player still needs to play this hole — switch turn, keep same hole
      currentTurn = otherPlayer;
    } else {
      // Both players have completed this hole — advance to next hole, player 1 goes first
      nextHole = currentHole + 1;
      currentTurn = 1;
    }

    const board: MiniGolfBoard = {
      ...newBoard,
      currentHole: nextHole,
      currentStroke: 0,
      lastShot: null,
      ready: [false, false],
      phase,
      version: current.board.version + 1,
    };

    const optimistic = { ...current, board, current_turn: currentTurn as Player, winner };
    gameRef.current = optimistic;
    setGame(optimistic);

    const { data: updatedRows, error: updateError } = await supabase
      .from('games')
      .update({
        board,
        current_turn: currentTurn,
        winner,
        updated_at: new Date().toISOString(),
      })
      .eq('id', gameId)
      .eq('board->>version', current.board.version)
      .select();

    if (updateError || !updatedRows || updatedRows.length === 0) {
      await fetchGame();
    }
  }, [gameId, fetchGame, getPlayerNumber]);

  const setReady = useCallback(async () => {
    const current = gameRef.current;
    if (!current || current.board.phase !== 'scoreboard') return;
    const player = getPlayerNumber();
    if (!player) return;

    const idx = playerIndex(player);
    const ready = [...current.board.ready] as [boolean, boolean];
    ready[idx] = true;

    const bothReady = ready[0] && ready[1];

    const board: MiniGolfBoard = bothReady
      ? {
          ...current.board,
          currentHole: current.board.currentHole + 1,
          currentStroke: 0,
          lastShot: null,
          ready: [false, false],
          phase: 'aiming',
          version: current.board.version + 1,
        }
      : {
          ...current.board,
          ready,
          version: current.board.version + 1,
        };

    const currentTurn: Player = bothReady ? 1 : current.current_turn;

    const optimistic = { ...current, board, current_turn: currentTurn };
    gameRef.current = optimistic;
    setGame(optimistic);

    const { data: updatedRows, error: updateError } = await supabase
      .from('games')
      .update({
        board,
        current_turn: currentTurn,
        updated_at: new Date().toISOString(),
      })
      .eq('id', gameId)
      .eq('board->>version', current.board.version)
      .select();

    if (updateError || !updatedRows || updatedRows.length === 0) {
      await fetchGame();
    }
  }, [gameId, fetchGame, getPlayerNumber]);

  const forfeit = useCallback(async () => {
    const current = gameRef.current;
    if (!current) return;
    const player = getPlayerNumber();
    if (!player) return;

    const winner: Player = player === 1 ? 2 : 1;
    const board: MiniGolfBoard = {
      ...current.board,
      phase: 'finished',
      version: current.board.version + 1,
    };

    const { error: updateError } = await supabase
      .from('games')
      .update({ board, winner, updated_at: new Date().toISOString() })
      .eq('id', gameId);

    if (!updateError) {
      gameRef.current = { ...current, board, winner };
      setGame({ ...current, board, winner });
    }
  }, [gameId, getPlayerNumber]);

  const resetGame = useCallback(async () => {
    const current = gameRef.current;
    if (!current) return;

    await supabase
      .from('games')
      .update({
        game_type: 'ended',
        player1_name: null,
        player2_name: null,
      })
      .eq('id', gameId);

    await supabase.from('games').delete().eq('id', gameId);
    setDeleted(true);
  }, [gameId]);

  return { game, loading, error, deleted, takeShot, recordHoleResult, setReady, forfeit, resetGame };
}

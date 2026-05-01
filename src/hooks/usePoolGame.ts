'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { PoolGame, PoolBoard, Shot, ShotResult, GamePhase, BallState } from '@/lib/pool/types';
import { simulateShot } from '@/lib/pool/physics';
import { determineShotResult, assignGroups, isGameOver, getWinner, createInitialBoard } from '@/lib/pool/logic';
import { recordMatchResult } from '@/lib/match-results';
import { Player } from '@/lib/types';

const POLL_INTERVAL_MS = 1500;

interface UsePoolGameReturn {
  game: PoolGame | null;
  loading: boolean;
  error: string | null;
  deleted: boolean;
  takeShot: (shot: Shot) => Promise<void>;
  placeCueBall: (x: number, y: number) => Promise<void>;
  forfeit: () => Promise<void>;
  resetGame: () => Promise<void>;
  replayShot: Shot | null;
  isReplaying: boolean;
  previousBalls: BallState[] | null;
  triggerReplay: () => void;
  onReplayComplete: () => void;
}

export function usePoolGame(gameId: string): UsePoolGameReturn {
  const [game, setGame] = useState<PoolGame | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleted, setDeleted] = useState(false);
  const [replayShot, setReplayShot] = useState<Shot | null>(null);
  const [isReplaying, setIsReplaying] = useState(false);
  const [previousBalls, setPreviousBalls] = useState<BallState[] | null>(null);
  const gameRef = useRef<PoolGame | null>(null);
  const matchRecorded = useRef(false);
  const lastProcessedVersion = useRef(-1);

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

    const fresh = data as PoolGame;

    // Detect if opponent took a shot (version increased and we haven't seen it)
    if (gameRef.current && fresh.board.version > lastProcessedVersion.current) {
      const prevVersion = lastProcessedVersion.current;
      lastProcessedVersion.current = fresh.board.version;

      // If there's a new lastShot and it wasn't ours, trigger replay
      if (fresh.board.lastShot && fresh.board.version > prevVersion) {
        const myPlayer = getPlayerNumber();
        const wasMyTurn = (myPlayer === 1 && gameRef.current.current_turn === 1) ||
                          (myPlayer === 2 && gameRef.current.current_turn === 2);
        if (!wasMyTurn && fresh.board.lastShot) {
          setPreviousBalls(gameRef.current.board.balls);
          setReplayShot(fresh.board.lastShot);
          setIsReplaying(true);
        }
      }
    } else if (!gameRef.current) {
      lastProcessedVersion.current = fresh.board.version;
    }

    gameRef.current = fresh;
    setGame(fresh);
    setLoading(false);
  }, [gameId, getPlayerNumber]);

  useEffect(() => {
    fetchGame();
    const interval = setInterval(fetchGame, POLL_INTERVAL_MS);

    const channel = supabase
      .channel(`pool-${gameId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'games',
          filter: `id=eq.${gameId}`,
        },
        (payload: { new: Record<string, unknown> }) => {
          const fresh = payload.new as unknown as PoolGame;
          const prev = gameRef.current;
          if (prev && fresh.board.version <= prev.board.version) return;

          if (fresh.board.lastShot && prev) {
            const myPlayer = getPlayerNumber();
            const wasMyTurn = (myPlayer === 1 && prev.current_turn === 1) ||
                              (myPlayer === 2 && prev.current_turn === 2);
            if (!wasMyTurn) {
              setPreviousBalls(prev.board.balls);
              setReplayShot(fresh.board.lastShot);
              setIsReplaying(true);
            }
          }

          lastProcessedVersion.current = fresh.board.version;
          gameRef.current = fresh;
          setGame(fresh);
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [fetchGame, gameId, getPlayerNumber]);

  const takeShot = useCallback(async (shot: Shot) => {
    const current = gameRef.current;
    if (!current) return;
    const player = getPlayerNumber();
    if (!player) return;

    // Simulate the shot to determine outcome
    const { finalBalls, allPocketed } = simulateShot(current.board.balls, shot);
    const shotResult = determineShotResult(current.board, player, allPocketed);

    let newBoard: PoolBoard = {
      ...current.board,
      balls: finalBalls,
      lastShot: shot,
      lastShotResult: shotResult,
      shotHistory: [...current.board.shotHistory, shot],
      version: current.board.version + 1,
    };

    // Assign groups if needed
    if (shotResult.groupAssigned) {
      const nonCuePocketed = allPocketed.filter((id) => id !== 0);
      if (nonCuePocketed.length > 0) {
        const groups = assignGroups(current.board, player, nonCuePocketed[0]);
        newBoard.player1Group = groups.player1Group;
        newBoard.player2Group = groups.player2Group;
      }
    }

    let nextTurn = current.current_turn;
    let winner: Player | null = current.winner;

    // Check for game over (8-ball pocketed)
    if (isGameOver(finalBalls)) {
      winner = getWinner(newBoard, player, allPocketed);
      newBoard.phase = 'finished';
    } else if (shotResult.scratch) {
      // Scratch: other player gets ball-in-hand
      nextTurn = player === 1 ? 2 : 1;
      newBoard.phase = 'ball-in-hand';
      // Reset cue ball (mark as not pocketed, will be placed by opponent)
      newBoard.balls = newBoard.balls.map((b) =>
        b.id === 0 ? { ...b, pocketed: false, vx: 0, vy: 0 } : b
      );
    } else if (!shotResult.turnContinues) {
      nextTurn = player === 1 ? 2 : 1;
    }

    // Record match result if game over
    if (winner && !matchRecorded.current) {
      matchRecorded.current = true;
      if (current.player1_id && current.player2_id && current.player1_name && current.player2_name) {
        const winnerName = winner === 1 ? current.player1_name : current.player2_name;
        const loserName = winner === 1 ? current.player2_name : current.player1_name;
        const winnerId = winner === 1 ? current.player1_id : current.player2_id;
        const loserId = winner === 1 ? current.player2_id : current.player1_id;
        recordMatchResult({
          game_type: 'pool',
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
      }
    }

    // Optimistic update
    const optimistic = { ...current, board: newBoard, current_turn: nextTurn as Player, winner };
    gameRef.current = optimistic;
    lastProcessedVersion.current = newBoard.version;
    setGame(optimistic);

    // Persist
    const { data: updatedRows, error: updateError } = await supabase
      .from('games')
      .update({
        board: newBoard,
        current_turn: nextTurn,
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

  const placeCueBall = useCallback(async (x: number, y: number) => {
    const current = gameRef.current;
    if (!current || current.board.phase !== 'ball-in-hand') return;

    const newBoard: PoolBoard = {
      ...current.board,
      balls: current.board.balls.map((b) =>
        b.id === 0 ? { ...b, x, y, pocketed: false } : b
      ),
      phase: 'playing',
      version: current.board.version + 1,
    };

    const optimistic = { ...current, board: newBoard };
    gameRef.current = optimistic;
    lastProcessedVersion.current = newBoard.version;
    setGame(optimistic);

    const { data: updatedRows, error: updateError } = await supabase
      .from('games')
      .update({
        board: newBoard,
        updated_at: new Date().toISOString(),
      })
      .eq('id', gameId)
      .eq('board->>version', current.board.version)
      .select();

    if (updateError || !updatedRows || updatedRows.length === 0) {
      await fetchGame();
    }
  }, [gameId, fetchGame]);

  const triggerReplay = useCallback(() => {
    const current = gameRef.current;
    if (current?.board.lastShot) {
      setPreviousBalls(previousBalls ?? current.board.balls);
      setReplayShot(current.board.lastShot);
      setIsReplaying(true);
    }
  }, [previousBalls]);

  const onReplayComplete = useCallback(() => {
    setIsReplaying(false);
    setReplayShot(null);
  }, []);

  const forfeit = useCallback(async () => {
    const current = gameRef.current;
    if (!current) return;
    const player = getPlayerNumber();
    if (!player) return;

    const winner: Player = player === 1 ? 2 : 1;
    const board: PoolBoard = {
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

      if (!matchRecorded.current && current.player1_id && current.player2_id && current.player1_name && current.player2_name) {
        matchRecorded.current = true;
        const winnerName = winner === 1 ? current.player1_name : current.player2_name;
        const loserName = winner === 1 ? current.player2_name : current.player1_name;
        const winnerId = winner === 1 ? current.player1_id : current.player2_id;
        const loserId = winner === 1 ? current.player2_id : current.player1_id;
        recordMatchResult({
          game_type: 'pool',
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
      }
    }
  }, [gameId, getPlayerNumber]);

  const resetGame = useCallback(async () => {
    const current = gameRef.current;
    if (!current) return;

    await supabase
      .from('games')
      .update({ game_type: 'ended', player1_name: null, player2_name: null })
      .eq('id', gameId);

    await supabase.from('games').delete().eq('id', gameId);
    setDeleted(true);
  }, [gameId]);

  return {
    game, loading, error, deleted,
    takeShot, placeCueBall, forfeit, resetGame,
    replayShot, isReplaying, previousBalls, triggerReplay, onReplayComplete,
  };
}

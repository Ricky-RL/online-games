'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { pickQuestion, submitAnswer, advanceFromResult } from '@/lib/jeopardy/logic';
import { recordMatchResult } from '@/lib/match-results';
import type { JeopardyBoard, JeopardyGame } from '@/lib/jeopardy/types';

const POLL_INTERVAL_MS = 1500;

function getMyName(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('player-name') || localStorage.getItem('player-name');
}

interface UseJeopardyGameReturn {
  game: JeopardyGame | null;
  loading: boolean;
  error: string | null;
  deleted: boolean;
  getMyPlayer: () => number | null;
  doPickQuestion: (catIndex: number, qIndex: number) => Promise<void>;
  doSubmitAnswer: (answer: string) => Promise<void>;
  doAdvance: () => Promise<void>;
}

export function useJeopardyGame(gameId: string): UseJeopardyGameReturn {
  const [game, setGame] = useState<JeopardyGame | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleted, setDeleted] = useState(false);
  const gameRef = useRef<JeopardyGame | null>(null);
  const matchRecorded = useRef(false);

  const updateGame = useCallback(
    (updater: JeopardyGame | null | ((prev: JeopardyGame | null) => JeopardyGame | null)) => {
      setGame((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        gameRef.current = next;
        return next;
      });
    },
    []
  );

  const getMyPlayer = useCallback((): number | null => {
    const name = getMyName();
    if (!name || !gameRef.current) return null;
    if (gameRef.current.player1_name === name) return 1;
    if (gameRef.current.player2_name === name) return 2;
    return null;
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

    return data as JeopardyGame;
  }, [gameId, updateGame]);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      const data = await fetchGame();
      if (cancelled) return;
      if (data) updateGame(data);
      setLoading(false);
    }
    init();
    return () => { cancelled = true; };
  }, [fetchGame, updateGame]);

  useEffect(() => {
    const interval = setInterval(async () => {
      const data = await fetchGame();
      if (!data) return;

      const current = gameRef.current;
      if (!current || data.board.version > current.board.version) {
        updateGame(data);
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [fetchGame, updateGame]);

  // Record match result on game over
  useEffect(() => {
    const g = game;
    if (!g || g.board.phase !== 'game-over' || matchRecorded.current) return;
    if (!g.player1_id || !g.player2_id || !g.player1_name || !g.player2_name) return;

    matchRecorded.current = true;
    const winner = g.board.winner;
    const isDraw = winner === null;

    recordMatchResult({
      game_type: 'jeopardy',
      game_id: g.id,
      winner_id: isDraw ? null : (winner === 1 ? g.player1_id : g.player2_id),
      winner_name: isDraw ? null : (winner === 1 ? g.player1_name : g.player2_name),
      loser_id: isDraw ? null : (winner === 1 ? g.player2_id : g.player1_id),
      loser_name: isDraw ? null : (winner === 1 ? g.player2_name : g.player1_name),
      is_draw: isDraw,
      metadata: { scores: g.board.scores },
      player1_id: g.player1_id,
      player1_name: g.player1_name,
      player2_id: g.player2_id,
      player2_name: g.player2_name,
    });
  }, [game]);

  const persistBoard = useCallback(async (newBoard: JeopardyBoard, newCurrentTurn: number) => {
    const current = gameRef.current;
    if (!current) return;

    const { error: updateError } = await supabase
      .from('games')
      .update({
        board: newBoard as unknown as Record<string, unknown>,
        current_turn: newCurrentTurn,
        winner: newBoard.winner,
        updated_at: new Date().toISOString(),
      })
      .eq('id', current.id)
      .eq('board->>version', String(current.board.version));

    if (updateError) {
      const fresh = await fetchGame();
      if (fresh) updateGame(fresh);
    }
  }, [fetchGame, updateGame]);

  const doPickQuestion = useCallback(async (catIndex: number, qIndex: number) => {
    const current = gameRef.current;
    if (!current || current.board.phase !== 'picking') return;

    const newBoard = pickQuestion(current.board, catIndex, qIndex);
    if (newBoard === current.board) return;

    updateGame({ ...current, board: newBoard });
    await persistBoard(newBoard, current.current_turn);
  }, [updateGame, persistBoard]);

  const doSubmitAnswer = useCallback(async (answer: string) => {
    const current = gameRef.current;
    if (!current || current.board.phase !== 'answering') return;

    const playerNum = getMyPlayer();
    if (!playerNum) return;

    const newBoard = submitAnswer(current.board, playerNum, answer);
    if (newBoard === current.board) return;

    updateGame({ ...current, board: newBoard });
    await persistBoard(newBoard, current.current_turn);
  }, [getMyPlayer, updateGame, persistBoard]);

  const doAdvance = useCallback(async () => {
    const current = gameRef.current;
    if (!current || current.board.phase !== 'result') return;

    const newBoard = advanceFromResult(current.board);
    if (newBoard === current.board) return;

    const newCurrentTurn = newBoard.currentPicker as 1 | 2;
    updateGame({ ...current, board: newBoard, current_turn: newCurrentTurn });
    await persistBoard(newBoard, newCurrentTurn);
  }, [updateGame, persistBoard]);

  return {
    game,
    loading,
    error,
    deleted,
    getMyPlayer,
    doPickQuestion,
    doSubmitAnswer,
    doAdvance,
  };
}

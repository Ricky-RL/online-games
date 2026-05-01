'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import {
  placeNumber as logicPlaceNumber,
  clearCell as logicClearCell,
  togglePencilMark as logicTogglePencilMark,
  checkWin,
  type SudokuBoardState,
} from '@/lib/sudoku-logic';
import { recordMatchResult } from '@/lib/match-results';

const POLL_INTERVAL_MS = 1500;

export interface SudokuGameRow {
  id: string;
  game_type: string;
  board: SudokuBoardState;
  current_turn: number | null;
  winner: string | null;
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

interface UseSudokuGameReturn {
  game: SudokuGameRow | null;
  board: SudokuBoardState | null;
  loading: boolean;
  error: string | null;
  deleted: boolean;
  placeNumber: (row: number, col: number, value: number) => Promise<void>;
  clearCell: (row: number, col: number) => Promise<void>;
  togglePencilMark: (row: number, col: number, value: number) => Promise<void>;
  resetGame: () => Promise<void>;
}

export function useSudokuGame(gameId: string): UseSudokuGameReturn {
  const [game, setGame] = useState<SudokuGameRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleted, setDeleted] = useState(false);
  const gameRef = useRef<SudokuGameRow | null>(null);
  const matchRecorded = useRef(false);

  const updateGame = useCallback(
    (updater: SudokuGameRow | null | ((prev: SudokuGameRow | null) => SudokuGameRow | null)) => {
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

    return data as SudokuGameRow;
  }, [gameId, updateGame]);

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
    return () => { cancelled = true; };
  }, [fetchGame, updateGame]);

  useEffect(() => {
    if (deleted) return;

    const interval = setInterval(async () => {
      const fresh = await fetchGame();
      if (!fresh) return;

      updateGame((prev) => {
        if (!prev) return fresh;
        const freshBoard = fresh.board as SudokuBoardState;
        const prevBoard = prev.board as SudokuBoardState;

        if (freshBoard.moveCount < prevBoard.moveCount) {
          return {
            ...prev,
            player1_name: fresh.player1_name,
            player2_name: fresh.player2_name,
            player1_id: fresh.player1_id,
            player2_id: fresh.player2_id,
          };
        }

        if (freshBoard.moveCount > prevBoard.moveCount) {
          return fresh;
        }

        if (JSON.stringify(fresh) === JSON.stringify(prev)) return prev;
        return fresh;
      });
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [gameId, fetchGame, updateGame, deleted]);

  const placeNumber = useCallback(
    async (row: number, col: number, value: number) => {
      const currentGame = gameRef.current;
      if (!currentGame) return;

      const myName = getMyName();
      if (!myName) { setError('No player name set'); return; }

      const board = currentGame.board as SudokuBoardState;
      const newBoard = logicPlaceNumber(board, row, col, value, myName);
      if (newBoard === board) return;

      updateGame((prev) => prev ? { ...prev, board: newBoard } : null);
      setError(null);

      const { error: updateError } = await supabase
        .from('games')
        .update({
          board: newBoard,
          updated_at: new Date().toISOString(),
        })
        .eq('id', gameId);

      if (updateError) {
        const freshData = await fetchGame();
        if (freshData) updateGame(freshData);
        setError(updateError.message);
        return;
      }

      if (checkWin(newBoard) && !matchRecorded.current) {
        matchRecorded.current = true;
        const completedBoard = { ...newBoard, completedAt: new Date().toISOString() };

        await supabase
          .from('games')
          .update({
            board: completedBoard,
            winner: 'cooperative',
            updated_at: new Date().toISOString(),
          })
          .eq('id', gameId);

        updateGame((prev) => prev ? { ...prev, board: completedBoard, winner: 'cooperative' } : null);

        const timeSeconds = Math.floor(
          (Date.now() - new Date(board.startedAt).getTime()) / 1000
        );

        if (currentGame.player1_id && currentGame.player2_id) {
          recordMatchResult({
            game_type: 'sudoku',
            game_id: gameId,
            winner_id: null,
            winner_name: null,
            loser_id: null,
            loser_name: null,
            is_draw: false,
            metadata: {
              difficulty: board.difficulty,
              moveCount: newBoard.moveCount,
              timeSeconds,
              won: true,
            },
            player1_id: currentGame.player1_id,
            player1_name: currentGame.player1_name!,
            player2_id: currentGame.player2_id,
            player2_name: currentGame.player2_name!,
          });
        }
      }
    },
    [gameId, updateGame, fetchGame]
  );

  const clearCell = useCallback(
    async (row: number, col: number) => {
      const currentGame = gameRef.current;
      if (!currentGame) return;

      const board = currentGame.board as SudokuBoardState;
      const newBoard = logicClearCell(board, row, col);
      if (newBoard === board) return;

      updateGame((prev) => prev ? { ...prev, board: newBoard } : null);

      const { error: updateError } = await supabase
        .from('games')
        .update({ board: newBoard, updated_at: new Date().toISOString() })
        .eq('id', gameId);

      if (updateError) {
        const freshData = await fetchGame();
        if (freshData) updateGame(freshData);
      }
    },
    [gameId, updateGame, fetchGame]
  );

  const togglePencilMark = useCallback(
    async (row: number, col: number, value: number) => {
      const currentGame = gameRef.current;
      if (!currentGame) return;

      const board = currentGame.board as SudokuBoardState;
      const newBoard = logicTogglePencilMark(board, row, col, value);
      if (newBoard === board) return;

      updateGame((prev) => prev ? { ...prev, board: newBoard } : null);

      const { error: updateError } = await supabase
        .from('games')
        .update({ board: newBoard, updated_at: new Date().toISOString() })
        .eq('id', gameId);

      if (updateError) {
        const freshData = await fetchGame();
        if (freshData) updateGame(freshData);
      }
    },
    [gameId, updateGame, fetchGame]
  );

  const resetGame = useCallback(async () => {
    await supabase
      .from('games')
      .update({
        game_type: 'ended',
        board: {},
        current_turn: 1,
        winner: null,
        player1_name: null,
        player2_name: null,
        player1_id: null,
        player2_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', gameId);

    await supabase.from('games').delete().eq('id', gameId);
    setDeleted(true);
  }, [gameId]);

  const board = game?.board as SudokuBoardState | null;

  return { game, board, loading, error, deleted, placeNumber, clearCell, togglePencilMark, resetGame };
}

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Player } from '@/lib/types';
import { MonopolyGame, MonopolyBoard, MonopolyPhase } from '@/lib/monopoly/types';
import {
  createInitialBoard, rollDice, performRoll, buyProperty, endTurn,
  buildHouse, jailPayFee, jailRollForDoubles, resolveLanding,
  getPlayerState, getBuildableProperties, forfeit,
} from '@/lib/monopoly/logic';
import { recordMatchResult, GameType } from '@/lib/match-results';

const POLL_INTERVAL_MS = 1500;

interface UseMonopolyGameReturn {
  game: MonopolyGame | null;
  loading: boolean;
  error: string | null;
  myPlayer: Player | null;
  isMyTurn: boolean;
  roll: () => Promise<void>;
  buy: () => Promise<void>;
  pass: () => Promise<void>;
  build: (spaceIndex: number) => Promise<void>;
  endMyTurn: () => Promise<void>;
  payJailFee: () => Promise<void>;
  rollForDoubles: () => Promise<void>;
  buildableProperties: number[];
  resetGame: () => Promise<void>;
  forfeitGame: () => Promise<void>;
}

export function useMonopolyGame(gameId: string): UseMonopolyGameReturn {
  const [game, setGame] = useState<MonopolyGame | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const gameRef = useRef<MonopolyGame | null>(null);
  const matchRecorded = useRef(false);

  const getMyPlayer = useCallback((): Player | null => {
    if (typeof window === 'undefined') return null;
    const name = sessionStorage.getItem('player-name') || localStorage.getItem('player-name');
    if (!game) return null;
    if (name === game.player1_name) return 1;
    if (name === game.player2_name) return 2;
    return null;
  }, [game]);

  const myPlayer = getMyPlayer();
  const isMyTurn = game?.board.activePlayer === myPlayer && game?.board.phase !== 'game-over';

  const fetchGame = useCallback(async () => {
    const { data, error: fetchError } = await supabase
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single();

    if (fetchError || !data) {
      if (!gameRef.current) setError('Game not found');
      return;
    }

    const fresh = data as MonopolyGame;
    const prev = gameRef.current;

    const isReset = prev && fresh.board.turnSequence === 0 && fresh.board.currentTurn === 1;
    if (prev && !isReset && fresh.board.turnSequence <= prev.board.turnSequence) return;

    gameRef.current = fresh;
    setGame(fresh);
    setLoading(false);
  }, [gameId]);

  useEffect(() => {
    fetchGame();
    const interval = setInterval(fetchGame, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchGame]);

  // Record match result when game ends
  useEffect(() => {
    if (!game || game.board.phase !== 'game-over' || matchRecorded.current) return;
    if (!game.player1_id || !game.player2_id || !game.player1_name || !game.player2_name) return;
    matchRecorded.current = true;

    const winner = game.board.winner;
    const isDraw = winner === null;

    recordMatchResult({
      game_type: 'monopoly' as GameType,
      game_id: gameId,
      winner_id: winner === 1 ? game.player1_id : winner === 2 ? game.player2_id : null,
      winner_name: winner === 1 ? game.player1_name : winner === 2 ? game.player2_name : null,
      loser_id: winner === 1 ? game.player2_id : winner === 2 ? game.player1_id : null,
      loser_name: winner === 1 ? game.player2_name : winner === 2 ? game.player1_name : null,
      is_draw: isDraw,
      metadata: game.board.finalNetWorth ? { netWorth: game.board.finalNetWorth } : null,
      player1_id: game.player1_id,
      player1_name: game.player1_name,
      player2_id: game.player2_id,
      player2_name: game.player2_name,
    });
  }, [game]);

  const updateBoard = useCallback(async (newBoard: MonopolyBoard) => {
    const current = gameRef.current;
    if (!current) return;

    const optimistic = { ...current, board: newBoard };
    gameRef.current = optimistic;
    setGame(optimistic);

    const { error: updateError } = await supabase
      .from('games')
      .update({
        board: newBoard,
        current_turn: newBoard.activePlayer,
        winner: newBoard.winner,
        updated_at: new Date().toISOString(),
      })
      .eq('id', gameId)
      .eq('board->>turnSequence', String(current.board.turnSequence));

    if (updateError) {
      await fetchGame();
    }
  }, [gameId, fetchGame]);

  const roll = useCallback(async () => {
    const current = gameRef.current;
    if (!current || !myPlayer || current.board.activePlayer !== myPlayer) return;
    if (current.board.phase !== 'roll') return;

    const dice = rollDice();
    const newBoard = performRoll(current.board, myPlayer, dice);
    await updateBoard(newBoard);
  }, [myPlayer, updateBoard]);

  const buy = useCallback(async () => {
    const current = gameRef.current;
    if (!current || !myPlayer || current.board.phase !== 'buy-decision') return;

    const newBoard = buyProperty(current.board, myPlayer);
    await updateBoard({ ...newBoard, phase: 'end-turn', turnSequence: newBoard.turnSequence + 1 });
  }, [myPlayer, updateBoard]);

  const pass = useCallback(async () => {
    const current = gameRef.current;
    if (!current || !myPlayer || current.board.phase !== 'buy-decision') return;

    await updateBoard({ ...current.board, phase: 'end-turn', turnSequence: current.board.turnSequence + 1 });
  }, [myPlayer, updateBoard]);

  const build = useCallback(async (spaceIndex: number) => {
    const current = gameRef.current;
    if (!current || !myPlayer) return;

    const newBoard = buildHouse(current.board, myPlayer, spaceIndex);
    await updateBoard({ ...newBoard, turnSequence: newBoard.turnSequence + 1 });
  }, [myPlayer, updateBoard]);

  const endMyTurn = useCallback(async () => {
    const current = gameRef.current;
    if (!current || !myPlayer || current.board.phase !== 'end-turn') return;

    const newBoard = endTurn(current.board);
    await updateBoard(newBoard);
  }, [myPlayer, updateBoard]);

  const payJailFee = useCallback(async () => {
    const current = gameRef.current;
    if (!current || !myPlayer || current.board.phase !== 'jail-decision') return;

    const newBoard = jailPayFee(current.board, myPlayer);
    await updateBoard({ ...newBoard, turnSequence: current.board.turnSequence + 1 });
  }, [myPlayer, updateBoard]);

  const rollForDoubles = useCallback(async () => {
    const current = gameRef.current;
    if (!current || !myPlayer || current.board.phase !== 'jail-decision') return;

    const dice = rollDice();
    const newBoard = jailRollForDoubles(current.board, myPlayer, dice);
    await updateBoard(newBoard);
  }, [myPlayer, updateBoard]);

  const buildableProperties = game && myPlayer ? getBuildableProperties(game.board, myPlayer) : [];

  const forfeitGame = useCallback(async () => {
    const current = gameRef.current;
    if (!current || !myPlayer || current.board.phase === 'game-over') return;

    const newBoard = forfeit(current.board, myPlayer);
    await updateBoard(newBoard);
  }, [myPlayer, updateBoard]);

  const resetGame = useCallback(async () => {
    const newBoard = createInitialBoard();
    const { error: updateError } = await supabase
      .from('games')
      .update({
        board: newBoard,
        current_turn: 1,
        winner: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', gameId);

    if (!updateError) {
      matchRecorded.current = false;
      gameRef.current = null;
      await fetchGame();
    }
  }, [gameId, fetchGame]);

  return {
    game, loading, error, myPlayer, isMyTurn,
    roll, buy, pass, build, endMyTurn, payJailFee, rollForDoubles,
    buildableProperties, resetGame, forfeitGame,
  };
}

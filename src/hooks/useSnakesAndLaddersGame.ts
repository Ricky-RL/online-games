'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { makeMove as computeMove, checkWin, rollDice as generateRoll, handleSkipTurn, tickRespawns } from '@/lib/snakes-and-ladders-logic';
import { recordMatchResult } from '@/lib/match-results';
import type { Player, SnakesAndLaddersState, MoveEvent, PowerupType } from '@/lib/types';

const POLL_INTERVAL_MS = 1500;

export interface SnakesAndLaddersGame {
  id: string;
  game_type: string;
  board: SnakesAndLaddersState;
  current_turn: Player;
  winner: Player | null;
  player1_id: string | null;
  player2_id: string | null;
  player1_name: string | null;
  player2_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface LastMoveInfo {
  player: 1 | 2;
  from: number;
  to: number;
  roll: number;
}

interface UseSnakesAndLaddersGameReturn {
  game: SnakesAndLaddersGame | null;
  loading: boolean;
  error: string | null;
  lastMove: LastMoveInfo | null;
  deleted: boolean;
  replayEvents: MoveEvent[];
  isReplaying: boolean;
  activePowerup: { type: PowerupType; effect: string } | null;
  replayLastMove: LastMoveInfo | null;
  setReplayLastMove: (move: LastMoveInfo | null) => void;
  replayAgain: () => void;
  rollDice: () => Promise<void>;
  resetGame: () => Promise<void>;
  skipReplay: () => void;
  dismissPowerup: () => void;
}

function getMyName(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('player-name') || localStorage.getItem('player-name');
}

export function useSnakesAndLaddersGame(gameId: string): UseSnakesAndLaddersGameReturn {
  const [game, setGame] = useState<SnakesAndLaddersGame | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastMove, setLastMove] = useState<LastMoveInfo | null>(null);
  const [deleted, setDeleted] = useState(false);
  const [replayEvents, setReplayEvents] = useState<MoveEvent[]>([]);
  const [isReplaying, setIsReplaying] = useState(false);
  const [activePowerup, setActivePowerup] = useState<{ type: PowerupType; effect: string } | null>(null);
  const [replayLastMove, setReplayLastMove] = useState<LastMoveInfo | null>(null);
  const optimisticBoard = useRef<SnakesAndLaddersState | null>(null);
  const gameRef = useRef<SnakesAndLaddersGame | null>(null);
  const matchRecorded = useRef(false);
  const lastUpdatedAt = useRef<string | null>(null);
  const lastSeenMoveNumber = useRef<number>(0);
  const pendingMoveEvents = useRef<MoveEvent[]>([]);
  const storedReplayEvents = useRef<MoveEvent[]>([]);
  const isReplayingRef = useRef(false);

  const skipReplay = useCallback(() => {
    setReplayEvents([]);
    setIsReplaying(false);
    setReplayLastMove(null);
  }, []);

  const replayAgain = useCallback(() => {
    if (storedReplayEvents.current.length > 0) {
      setReplayEvents([...storedReplayEvents.current]);
      setIsReplaying(true);
      setReplayLastMove(null);
    }
  }, []);

  const dismissPowerup = useCallback(() => {
    setActivePowerup(null);
  }, []);

  useEffect(() => {
    isReplayingRef.current = isReplaying;
  }, [isReplaying]);

  const updateGame = useCallback(
    (updater: SnakesAndLaddersGame | null | ((prev: SnakesAndLaddersGame | null) => SnakesAndLaddersGame | null)) => {
      setGame((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        gameRef.current = next;
        if (next) lastUpdatedAt.current = next.updated_at;
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

    return data as SnakesAndLaddersGame;
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
        const board = gameData.board as SnakesAndLaddersState;
        lastSeenMoveNumber.current = board.moveNumber ?? 0;
      }
      setLoading(false);
    }
    init();
    return () => { cancelled = true; };
  }, [fetchGame, updateGame]);

  // Poll for changes
  useEffect(() => {
    if (deleted) return;

    const interval = setInterval(async () => {
      const fresh = await fetchGame();
      if (!fresh) return;

      updateGame((prev) => {
        if (!prev) return fresh;

        // If we have an optimistic state, check if server caught up
        if (optimisticBoard.current) {
          if (JSON.stringify(fresh.board) === JSON.stringify(optimisticBoard.current)) {
            optimisticBoard.current = null;
            return fresh;
          }
          const optimisticMoveNumber = (optimisticBoard.current as SnakesAndLaddersState).moveNumber;
          const freshMoveNumber = (fresh.board as SnakesAndLaddersState).moveNumber;
          if (freshMoveNumber > optimisticMoveNumber) {
            optimisticBoard.current = null;
          } else {
            return prev;
          }
        }

        if (JSON.stringify(fresh) === JSON.stringify(prev)) return prev;

        if (fresh.updated_at < prev.updated_at) return prev;

        // Detect opponent's move via moveNumber
        const freshBoard = fresh.board as SnakesAndLaddersState;
        const prevBoard = prev.board as SnakesAndLaddersState;

        if (freshBoard.moveNumber > lastSeenMoveNumber.current && freshBoard.lastMoveEvents.length > 0) {
          lastSeenMoveNumber.current = freshBoard.moveNumber;
          if (!isReplayingRef.current) {
            storedReplayEvents.current = freshBoard.lastMoveEvents;
            setReplayEvents(freshBoard.lastMoveEvents);
            setIsReplaying(true);
          }
        }

        const rollChanged = freshBoard.lastRoll &&
          (freshBoard.lastRoll.player !== prevBoard.lastRoll?.player ||
           freshBoard.lastRoll.value !== prevBoard.lastRoll?.value ||
           freshBoard.players[freshBoard.lastRoll.player] !== prevBoard.players[freshBoard.lastRoll.player]);
        if (rollChanged) {
          const movedPlayer = freshBoard.lastRoll!.player;
          setLastMove({
            player: movedPlayer,
            from: prevBoard.players[movedPlayer],
            to: freshBoard.players[movedPlayer],
            roll: freshBoard.lastRoll!.value,
          });
        }

        return fresh;
      });
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [gameId, fetchGame, updateGame, deleted]);

  const rollDice = useCallback(async () => {
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

    let currentBoard = currentGame.board as SnakesAndLaddersState;

    // Tick respawns at start of turn
    currentBoard = tickRespawns(currentBoard);

    // Check for skip
    const skipResult = handleSkipTurn(currentBoard, myPlayerNumber);
    if (skipResult) {
      const nextTurn: Player = myPlayerNumber === 1 ? 2 : 1;
      optimisticBoard.current = skipResult;
      lastSeenMoveNumber.current = skipResult.moveNumber;
      updateGame((prev) => prev ? { ...prev, board: skipResult, current_turn: nextTurn } : null);

      const { error: skipError } = await supabase.from('games').update({
        board: skipResult,
        current_turn: nextTurn,
        updated_at: new Date().toISOString(),
      }).eq('id', gameId);
      if (skipError) {
        optimisticBoard.current = null;
        const { data: freshGame } = await supabase.from('games').select('*').eq('id', gameId).single();
        if (freshGame) updateGame(freshGame as SnakesAndLaddersGame);
        setError(skipError.message);
      }
      return;
    }

    const roll = generateRoll();
    const fromPosition = currentBoard.players[myPlayerNumber];
    const newBoard = computeMove(currentBoard, myPlayerNumber, roll);
    const winner = checkWin(newBoard);

    const nextTurn: Player = (roll === 6 && !winner)
      ? myPlayerNumber
      : (myPlayerNumber === 1 ? 2 : 1);

    // Accumulate events for roll-6 chains
    const currentEvent = newBoard.lastMoveEvents[newBoard.lastMoveEvents.length - 1];
    if (currentEvent) {
      pendingMoveEvents.current = [...pendingMoveEvents.current, currentEvent];
    }

    // When turn passes to opponent, include all accumulated events for replay
    const boardToSave = nextTurn !== myPlayerNumber
      ? { ...newBoard, lastMoveEvents: pendingMoveEvents.current }
      : { ...newBoard, lastMoveEvents: [] };

    // Reset pending events when turn passes
    if (nextTurn !== myPlayerNumber) {
      pendingMoveEvents.current = [];
    }

    optimisticBoard.current = boardToSave;
    lastSeenMoveNumber.current = boardToSave.moveNumber;
    setLastMove({
      player: myPlayerNumber,
      from: fromPosition,
      to: newBoard.players[myPlayerNumber],
      roll,
    });
    updateGame((prev) => prev ? { ...prev, board: boardToSave, current_turn: winner ? prev.current_turn : nextTurn, winner } : null);
    setError(null);

    // Show powerup toast for own move (non-blocking)
    if (currentEvent && currentEvent.powerups.length > 0) {
      setActivePowerup(currentEvent.powerups[0]);
    }

    const { error: updateError } = await supabase.from('games').update({
      board: boardToSave,
      current_turn: winner ? currentGame.current_turn : nextTurn,
      winner,
      updated_at: new Date().toISOString(),
    }).eq('id', gameId);

    if (updateError) {
      optimisticBoard.current = null;
      const { data: freshGame } = await supabase.from('games').select('*').eq('id', gameId).single();
      if (freshGame) updateGame(freshGame as SnakesAndLaddersGame);
      setError(updateError.message);
      return;
    }

    if (winner && !matchRecorded.current) {
      matchRecorded.current = true;
      const winnerName = winner === 1 ? currentGame.player1_name : currentGame.player2_name;
      const loserName = winner === 1 ? currentGame.player2_name : currentGame.player1_name;
      const winnerId = winner === 1 ? currentGame.player1_id : currentGame.player2_id;
      const loserId = winner === 1 ? currentGame.player2_id : currentGame.player1_id;
      recordMatchResult({
        game_type: 'snakes-and-ladders',
        game_id: gameId,
        winner_id: winnerId,
        winner_name: winnerName,
        loser_id: loserId,
        loser_name: loserName,
        is_draw: false,
        metadata: null,
        player1_id: currentGame.player1_id!,
        player1_name: currentGame.player1_name!,
        player2_id: currentGame.player2_id!,
        player2_name: currentGame.player2_name!,
      });
    }
  }, [gameId, updateGame]);

  const resetGame = useCallback(async () => {
    const { error: resetError } = await supabase
      .from('games')
      .update({
        game_type: 'ended',
        board: {
          players: { 1: 1, 2: 1 },
          snakes: {},
          ladders: {},
          lastRoll: null,
          moveNumber: 0,
          powerups: {},
          powerupRespawns: [],
          lastMoveEvents: [],
          skipNextTurn: null,
          shielded: null,
          doubleDice: null,
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

  return { game, loading, error, lastMove, deleted, replayEvents, isReplaying, activePowerup, replayLastMove, setReplayLastMove, replayAgain, rollDice, resetGame, skipReplay, dismissPowerup };
}

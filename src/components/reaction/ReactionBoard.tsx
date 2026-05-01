'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ReactionTarget } from './ReactionTarget';
import {
  GAME_DURATION_MS,
  INITIAL_SPAWN_INTERVAL_MS,
  getNextSpawnInterval,
} from '@/lib/reaction-logic';
import type { ReactionBoardState } from '@/lib/reaction-logic';
import type { Player } from '@/lib/types';

interface ActiveCircle {
  id: number;
  x: number;
  y: number;
  spawnedAt: number;
}

type GamePhase = 'countdown' | 'playing' | 'done';

interface ReactionBoardProps {
  board: ReactionBoardState;
  game: {
    player1_name: string | null;
    player2_name: string | null;
    current_turn: number;
  };
  isMyTurn: boolean;
  myPlayerNumber: Player | null;
  opponentName: string | null;
  onSubmitScore: (score: number) => Promise<void>;
}

export function ReactionBoard({
  board,
  isMyTurn,
  myPlayerNumber,
  opponentName,
  onSubmitScore,
}: ReactionBoardProps) {
  const [phase, setPhase] = useState<GamePhase>('countdown');
  const [countdown, setCountdown] = useState(3);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION_MS);
  const [circles, setCircles] = useState<ActiveCircle[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const scoreRef = useRef(0);
  const circleIdRef = useRef(0);
  const tappedRef = useRef(new Set<number>());
  const spawnIntervalRef = useRef(INITIAL_SPAWN_INTERVAL_MS);
  const spawnTimerRef = useRef<NodeJS.Timeout | null>(null);
  const gameTimerRef = useRef<NodeJS.Timeout | null>(null);
  const tickRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef(0);

  const spawnCircle = useCallback(() => {
    const id = circleIdRef.current++;
    const x = Math.floor(Math.random() * 60) + 20;
    const y = Math.floor(Math.random() * 60) + 20;
    setCircles((prev) => [...prev, { id, x, y, spawnedAt: Date.now() }]);

    spawnIntervalRef.current = getNextSpawnInterval(spawnIntervalRef.current);
    spawnTimerRef.current = setTimeout(spawnCircle, spawnIntervalRef.current);
  }, []);

  const endGame = useCallback(() => {
    if (spawnTimerRef.current) clearTimeout(spawnTimerRef.current);
    if (gameTimerRef.current) clearTimeout(gameTimerRef.current);
    if (tickRef.current) clearInterval(tickRef.current);
    setPhase('done');
    setCircles([]);
    setTimeLeft(0);
  }, []);

  // Submit score when game ends
  useEffect(() => {
    if (phase === 'done' && !submitted) {
      setSubmitted(true);
      onSubmitScore(scoreRef.current);
    }
  }, [phase, submitted, onSubmitScore]);

  // Countdown then start
  useEffect(() => {
    if (!isMyTurn) return;

    setPhase('countdown');
    setCountdown(3);
    setScore(0);
    scoreRef.current = 0;
    tappedRef.current = new Set();
    setCircles([]);
    setSubmitted(false);
    spawnIntervalRef.current = INITIAL_SPAWN_INTERVAL_MS;

    const countdownTimer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownTimer);
          setPhase('playing');
          startTimeRef.current = Date.now();

          // Start spawning circles
          spawnCircle();

          // End game after duration
          gameTimerRef.current = setTimeout(endGame, GAME_DURATION_MS);

          // Update time-left display
          tickRef.current = setInterval(() => {
            const elapsed = Date.now() - startTimeRef.current;
            const remaining = Math.max(0, GAME_DURATION_MS - elapsed);
            setTimeLeft(remaining);
            if (remaining <= 0) {
              clearInterval(tickRef.current!);
            }
          }, 50);

          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(countdownTimer);
      if (spawnTimerRef.current) clearTimeout(spawnTimerRef.current);
      if (gameTimerRef.current) clearTimeout(gameTimerRef.current);
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [isMyTurn, spawnCircle, endGame]);

  const handleCircleTap = useCallback((circleId: number) => {
    if (tappedRef.current.has(circleId)) return;
    tappedRef.current.add(circleId);
    setCircles((prev) => prev.filter((c) => c.id !== circleId));
    scoreRef.current += 1;
    setScore((s) => s + 1);
  }, []);

  // Remove circles after 2 seconds if not tapped
  useEffect(() => {
    if (phase !== 'playing') return;

    const cleanup = setInterval(() => {
      const now = Date.now();
      setCircles((prev) => prev.filter((c) => now - c.spawnedAt < 2000));
    }, 200);

    return () => clearInterval(cleanup);
  }, [phase]);

  if (!isMyTurn) {
    const opponentScore = myPlayerNumber === 1 ? board.player2Score : board.player1Score;
    const myScore = myPlayerNumber === 1 ? board.player1Score : board.player2Score;
    const waitingForOpponent = myScore !== null;

    return (
      <div className="w-full max-w-md mx-auto">
        <div className="text-center mb-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary/70">
            Tap Frenzy
          </span>
        </div>
        <div className="relative w-full aspect-square rounded-3xl bg-[#1a1a2e] border border-border flex items-center justify-center">
          {waitingForOpponent ? (
            <div className="text-center px-6">
              <p className="text-3xl font-bold text-[#FF6B35] mb-2">
                Your score: {myScore}
              </p>
              <motion.p
                className="text-lg text-text-secondary"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                Waiting for {opponentName ?? 'opponent'}...
              </motion.p>
            </div>
          ) : (
            <motion.p
              className="text-lg text-text-secondary text-center px-6"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              Waiting for {opponentName ?? 'opponent'}...
            </motion.p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-center flex-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary/70">
            Tap Frenzy
          </span>
        </div>
      </div>

      {/* Stats bar */}
      {phase === 'playing' && (
        <div className="flex items-center justify-between mb-3 px-2">
          <div className="text-sm font-bold text-[#FF6B35]">
            Score: {score}
          </div>
          <div className="text-sm font-mono text-text-secondary">
            {(timeLeft / 1000).toFixed(1)}s
          </div>
        </div>
      )}

      {/* Play area */}
      <div className="relative w-full aspect-square rounded-3xl bg-[#1a1a2e] border border-border overflow-hidden select-none">
        <AnimatePresence>
          {phase === 'countdown' && (
            <motion.div
              key="countdown"
              className="absolute inset-0 flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.p
                key={countdown}
                className="text-6xl font-bold text-[#FF6B35]"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 1.5, opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                {countdown === 0 ? 'GO!' : countdown}
              </motion.p>
            </motion.div>
          )}

          {phase === 'playing' &&
            circles.map((circle) => (
              <ReactionTarget
                key={circle.id}
                x={circle.x}
                y={circle.y}
                onTap={() => handleCircleTap(circle.id)}
              />
            ))}

          {phase === 'done' && (
            <motion.div
              key="done"
              className="absolute inset-0 flex items-center justify-center"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              <div className="text-center">
                <p className="text-lg text-text-secondary mb-2">Time&apos;s up!</p>
                <p className="text-5xl font-bold text-[#FF6B35]">{score}</p>
                <p className="text-sm text-text-secondary mt-2">circles tapped</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress bar */}
        {phase === 'playing' && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-border/30">
            <motion.div
              className="h-full bg-[#FF6B35]"
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: GAME_DURATION_MS / 1000, ease: 'linear' }}
            />
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="text-center mt-3">
        <p className="text-xs text-text-secondary/60">
          {phase === 'countdown'
            ? 'Get ready to tap circles!'
            : phase === 'playing'
            ? 'Tap circles before they disappear!'
            : 'Submitting your score...'}
        </p>
      </div>
    </div>
  );
}

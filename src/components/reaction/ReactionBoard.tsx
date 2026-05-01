'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ReactionTarget } from './ReactionTarget';
import { ROUNDS_PER_PLAYER, MAX_REACTION_TIME_MS, getActiveTargetIndex } from '@/lib/reaction-logic';
import type { ReactionBoardState } from '@/lib/reaction-logic';
import type { Player } from '@/lib/types';

type RoundPhase = 'ready' | 'waiting' | 'target' | 'result';

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
  onRecordRound: (reactionTimeMs: number) => Promise<void>;
}

export function ReactionBoard({
  board,
  isMyTurn,
  myPlayerNumber,
  opponentName,
  onRecordRound,
}: ReactionBoardProps) {
  const [phase, setPhase] = useState<RoundPhase>('ready');
  const [resultTime, setResultTime] = useState<number | null>(null);
  const [tooSlow, setTooSlow] = useState(false);
  const targetAppearedAt = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const phaseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasRecorded = useRef(false);

  const activeIndex = getActiveTargetIndex(board);
  const currentRound = board.activeRound + 1; // 1-indexed display

  // Count completed rounds for current player
  const myTimes = myPlayerNumber === 1 ? board.player1Times : board.player2Times;
  const completedRounds = myTimes.filter((t) => t !== null).length;

  // Start the round flow when it's my turn and we have a valid active target
  useEffect(() => {
    if (!isMyTurn || activeIndex < 0) {
      setPhase('ready');
      return;
    }

    hasRecorded.current = false;
    setResultTime(null);
    setTooSlow(false);
    setPhase('ready');

    // "Get Ready..." for 1 second, then waiting phase
    phaseTimeoutRef.current = setTimeout(() => {
      setPhase('waiting');

      // Use pre-generated delay for this round
      const delay = board.delays[activeIndex] ?? 2500;

      phaseTimeoutRef.current = setTimeout(() => {
        setPhase('target');
        targetAppearedAt.current = Date.now();

        // Auto-timeout after MAX_REACTION_TIME_MS
        timeoutRef.current = setTimeout(() => {
          if (!hasRecorded.current) {
            hasRecorded.current = true;
            setTooSlow(true);
            setResultTime(MAX_REACTION_TIME_MS);
            setPhase('result');
            onRecordRound(MAX_REACTION_TIME_MS);
          }
        }, MAX_REACTION_TIME_MS);
      }, delay);
    }, 1000);

    return () => {
      if (phaseTimeoutRef.current) clearTimeout(phaseTimeoutRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isMyTurn, activeIndex, onRecordRound]);

  const handleTargetTap = useCallback(() => {
    if (hasRecorded.current) return;
    hasRecorded.current = true;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    const reactionTime = Date.now() - targetAppearedAt.current;
    setResultTime(reactionTime);
    setTooSlow(false);
    setPhase('result');

    onRecordRound(reactionTime);
  }, [onRecordRound]);

  // Get target position for current round
  const target = activeIndex >= 0 ? board.targets[activeIndex] : null;

  if (!isMyTurn) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="text-center mb-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary/70">
            Reaction Speed Test
          </span>
        </div>
        <div className="relative w-full aspect-square rounded-3xl bg-[#1a1a2e] border border-border flex items-center justify-center">
          <motion.p
            className="text-lg text-text-secondary text-center px-6"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            Waiting for {opponentName ?? 'opponent'}...
          </motion.p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Round counter */}
      <div className="text-center mb-4">
        <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary/70">
          Round {currentRound}/{ROUNDS_PER_PLAYER}
        </span>
      </div>

      {/* Play area */}
      <div className="relative w-full aspect-square rounded-3xl bg-[#1a1a2e] border border-border overflow-hidden select-none">
        <AnimatePresence mode="wait">
          {phase === 'ready' && (
            <motion.div
              key="ready"
              className="absolute inset-0 flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <p className="text-2xl font-bold text-[#FF6B35]">Get Ready...</p>
            </motion.div>
          )}

          {phase === 'waiting' && (
            <motion.div
              key="waiting"
              className="absolute inset-0 flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <motion.p
                className="text-lg text-text-secondary/60"
                animate={{ opacity: [0.4, 0.8, 0.4] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                Wait for it...
              </motion.p>
            </motion.div>
          )}

          {phase === 'target' && target && (
            <ReactionTarget
              key={`target-${activeIndex}`}
              x={target.x}
              y={target.y}
              onTap={handleTargetTap}
            />
          )}

          {phase === 'result' && (
            <motion.div
              key="result"
              className="absolute inset-0 flex items-center justify-center"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              <div className="text-center">
                {tooSlow ? (
                  <p className="text-3xl font-bold text-player1">Too slow!</p>
                ) : (
                  <p className="text-4xl font-bold text-[#FF6B35]">
                    {resultTime}ms
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Instructions */}
      <div className="text-center mt-3">
        <p className="text-xs text-text-secondary/60">
          {phase === 'target'
            ? 'Tap the target!'
            : phase === 'waiting'
            ? 'Wait for the orange circle...'
            : phase === 'result'
            ? (completedRounds + 1 < ROUNDS_PER_PLAYER ? 'Next round starting...' : 'All rounds complete!')
            : 'Get ready to react'}
        </p>
      </div>
    </div>
  );
}

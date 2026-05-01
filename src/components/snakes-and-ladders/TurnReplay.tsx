'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PowerupToast } from './PowerupToast';
import type { MoveEvent } from '@/lib/types';

interface TurnReplayProps {
  events: MoveEvent[];
  onComplete: () => void;
  onReplayMove: (move: { player: 1 | 2; from: number; to: number; roll: number } | null) => void;
}

export function TurnReplay({ events, onComplete, onReplayMove }: TurnReplayProps) {
  const [currentEventIndex, setCurrentEventIndex] = useState(0);
  const [phase, setPhase] = useState<'dice' | 'moving' | 'powerup' | 'done'>('dice');
  const [currentPowerupIndex, setCurrentPowerupIndex] = useState(0);

  const currentEvent = events[currentEventIndex];

  // Reset state when events change (for replayAgain)
  useEffect(() => {
    setCurrentEventIndex(0);
    setPhase('dice');
    setCurrentPowerupIndex(0);
  }, [events]);

  useEffect(() => {
    if (!currentEvent) {
      onReplayMove(null);
      onComplete();
      return;
    }

    if (currentEvent.skipped) {
      const timer = setTimeout(() => {
        if (currentEventIndex < events.length - 1) {
          setCurrentEventIndex(i => i + 1);
          setPhase('dice');
        } else {
          onReplayMove(null);
          onComplete();
        }
      }, 1000);
      return () => clearTimeout(timer);
    }

    // dice phase - show dice number, then trigger move
    if (phase === 'dice') {
      const timer = setTimeout(() => {
        onReplayMove({
          player: currentEvent.player,
          from: currentEvent.from,
          to: currentEvent.to,
          roll: currentEvent.roll,
        });
        setPhase('moving');
      }, 800);
      return () => clearTimeout(timer);
    }

    // moving phase - wait for animation to complete
    if (phase === 'moving') {
      const hasSnakeOrLadder = !!(currentEvent.snakeSlide || currentEvent.ladderClimb);
      const moveDuration = currentEvent.roll * 150 + (hasSnakeOrLadder ? 600 : 0);
      const timer = setTimeout(() => {
        if (currentEvent.powerups.length > 0) {
          setPhase('powerup');
          setCurrentPowerupIndex(0);
        } else {
          setPhase('done');
        }
      }, moveDuration);
      return () => clearTimeout(timer);
    }

    // done phase - gap before next event
    if (phase === 'done') {
      const timer = setTimeout(() => {
        if (currentEventIndex < events.length - 1) {
          setCurrentEventIndex(i => i + 1);
          setPhase('dice');
          setCurrentPowerupIndex(0);
        } else {
          onReplayMove(null);
          onComplete();
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [currentEvent, currentEventIndex, events, phase, onComplete, onReplayMove]);

  const handlePowerupDismiss = useCallback(() => {
    if (!currentEvent) return;
    if (currentPowerupIndex < currentEvent.powerups.length - 1) {
      setCurrentPowerupIndex(i => i + 1);
    } else {
      setPhase('done');
    }
  }, [currentEvent, currentPowerupIndex]);

  if (!currentEvent) return null;

  return (
    <div className="fixed inset-0 z-40 pointer-events-none">
      {/* Skip button */}
      <button
        onClick={() => { onReplayMove(null); onComplete(); }}
        className="absolute top-4 right-4 px-3 py-1.5 text-xs font-medium rounded-lg bg-surface/90 border border-border text-text-secondary hover:text-text-primary pointer-events-auto cursor-pointer z-50"
      >
        Skip
      </button>

      {/* Skipped turn text */}
      <AnimatePresence>
        {currentEvent.skipped && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="bg-surface/95 border border-border rounded-xl px-6 py-4 text-center">
              <div className="text-2xl mb-1">🧊</div>
              <div className="text-sm font-semibold text-text-primary">Turn Skipped! (Frozen)</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dice result overlay */}
      <AnimatePresence>
        {!currentEvent.skipped && (phase === 'dice' || phase === 'moving') && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: phase === 'moving' ? 0.6 : 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="absolute top-20 left-1/2 -translate-x-1/2"
          >
            <div className="bg-surface/95 border border-border rounded-xl px-4 py-2 text-center shadow-lg">
              <div className="text-xs text-text-secondary">Opponent rolled</div>
              <div className="text-2xl font-bold text-text-primary">{currentEvent.roll}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Powerup toast */}
      {phase === 'powerup' && currentEvent.powerups[currentPowerupIndex] && (
        <PowerupToast
          powerup={currentEvent.powerups[currentPowerupIndex]}
          onDismiss={handlePowerupDismiss}
        />
      )}
    </div>
  );
}

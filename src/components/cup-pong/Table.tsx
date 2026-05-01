'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { CupFormation } from './CupFormation';
import { BallAnimation } from './BallAnimation';
import { SwipeToThrow } from './SwipeToThrow';
import type { Player, Cup, ThrowVector, ThrowResult } from '@/lib/cup-pong-types';

interface TableProps {
  /** Player 1's cups */
  player1Cups: Cup[];
  /** Player 2's cups */
  player2Cups: Cup[];
  /** Whose turn it is */
  currentTurn: Player;
  /** Which player "I" am */
  myPlayer: Player;
  /** Whether it's my turn */
  isMyTurn: boolean;
  /** Throws remaining this turn (0, 1, or 2) */
  throwsRemaining: 0 | 1 | 2;
  /** Called when player performs a throw */
  onThrow: (direction: ThrowVector, power: number) => void;
  /** Active throw animation (from first throw result, stored in hook) */
  lastThrowResult: ThrowResult | null;
  /** Whether there's an active ball animation in progress */
  animating: boolean;
  /** Called when throw animation finishes */
  onAnimationComplete: () => void;
  /** The winner of the game (null if game is still in progress) */
  winner: Player | null;
}

const TABLE_WIDTH = 320;
const TABLE_HEIGHT = 560;

export function Table({
  player1Cups,
  player2Cups,
  currentTurn,
  myPlayer,
  isMyTurn,
  throwsRemaining,
  onThrow,
  lastThrowResult,
  animating,
  onAnimationComplete,
  winner,
}: TableProps) {
  const [aimIndicator, setAimIndicator] = useState<{ direction: ThrowVector; power: number } | null>(null);

  const handleThrow = useCallback(
    (direction: ThrowVector, power: number) => {
      setAimIndicator(null);
      onThrow(direction, power);
    },
    [onThrow]
  );

  const handleAimUpdate = useCallback((direction: ThrowVector, power: number) => {
    setAimIndicator({ direction, power });
  }, []);

  const handleAimCancel = useCallback(() => {
    setAimIndicator(null);
  }, []);

  // My cups are the cups at my defensive end (the ones my opponent aims at)
  // I throw at my opponent's cups
  const myCups = myPlayer === 1 ? player1Cups : player2Cups;
  const opponentCups = myPlayer === 1 ? player2Cups : player1Cups;
  const opponentPlayer: Player = myPlayer === 1 ? 2 : 1;
  const throwerSide: 'bottom' | 'top' = myPlayer === 1 ? 'bottom' : 'top';

  return (
    <motion.div
      className="relative flex flex-col items-center"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Ball count indicator */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-medium text-text-secondary">Throws left:</span>
        <div className="flex gap-1">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="w-3 h-3 rounded-full border-2 transition-all duration-300"
              style={{
                backgroundColor: i < throwsRemaining ? '#facc15' : 'transparent',
                borderColor: i < throwsRemaining ? '#a16207' : 'rgba(255,255,255,0.3)',
                boxShadow: i < throwsRemaining ? '0 0 6px rgba(250,204,21,0.7)' : 'none',
              }}
            />
          ))}
        </div>
      </div>

      {/* Table */}
      <div
        className="relative rounded-xl overflow-hidden shadow-2xl border-4"
        style={{
          width: TABLE_WIDTH,
          height: TABLE_HEIGHT,
          background: 'linear-gradient(180deg, #1a5c2e 0%, #1f6b35 50%, #1a5c2e 100%)',
          borderColor: '#8B5E3C',
          boxShadow: 'inset 0 0 30px rgba(0,0,0,0.3), 0 8px 32px rgba(0,0,0,0.4)',
        }}
      >
        {/* Table center line */}
        <div
          className="absolute left-4 right-4 border-t border-dashed"
          style={{ top: '50%', borderColor: 'rgba(255,255,255,0.15)' }}
        />

        {/* Triangle position guides */}
        <div
          className="absolute left-1/2 -translate-x-1/2 border border-dashed rounded-sm"
          style={{
            top: 24,
            width: 140,
            height: 130,
            borderColor: 'rgba(255,255,255,0.06)',
          }}
        />
        <div
          className="absolute left-1/2 -translate-x-1/2 border border-dashed rounded-sm"
          style={{
            bottom: 24,
            width: 140,
            height: 130,
            borderColor: 'rgba(255,255,255,0.06)',
          }}
        />

        {/* Player 1's cups (positioned at y~0.15 in normalized coords — top portion on screen) */}
        <CupFormation
          cups={player1Cups}
          player={1}
          containerWidth={TABLE_WIDTH}
          containerHeight={TABLE_HEIGHT}
        />

        {/* Player 2's cups (positioned at y~0.85 in normalized coords — bottom portion on screen) */}
        <CupFormation
          cups={player2Cups}
          player={2}
          containerWidth={TABLE_WIDTH}
          containerHeight={TABLE_HEIGHT}
        />

        {/* Aim trajectory line */}
        {aimIndicator && isMyTurn && (
          <svg
            className="absolute inset-0 pointer-events-none z-10"
            width={TABLE_WIDTH}
            height={TABLE_HEIGHT}
          >
            <line
              x1={TABLE_WIDTH / 2}
              y1={throwerSide === 'bottom' ? TABLE_HEIGHT - 40 : 40}
              x2={TABLE_WIDTH / 2 + aimIndicator.direction.dx * aimIndicator.power * TABLE_WIDTH * 0.4}
              y2={
                throwerSide === 'bottom'
                  ? TABLE_HEIGHT - 40 - aimIndicator.direction.dy * aimIndicator.power * TABLE_HEIGHT * 0.7
                  : 40 + aimIndicator.direction.dy * aimIndicator.power * TABLE_HEIGHT * 0.7
              }
              stroke="rgba(255,255,255,0.4)"
              strokeWidth="2"
              strokeDasharray="6 4"
              strokeLinecap="round"
            />
          </svg>
        )}

        {/* Ball Animation */}
        {lastThrowResult && (
          <BallAnimation
            throwResult={lastThrowResult}
            throwerSide={
              // Determine who threw based on current turn context
              currentTurn === myPlayer
                ? (myPlayer === 1 ? 'bottom' : 'top')
                : (myPlayer === 1 ? 'top' : 'bottom')
            }
            targetCups={
              currentTurn === myPlayer ? opponentCups : myCups
            }
            tableWidth={TABLE_WIDTH}
            tableHeight={TABLE_HEIGHT}
            onComplete={onAnimationComplete}
          />
        )}

        {/* Swipe gesture layer */}
        <SwipeToThrow
          enabled={isMyTurn && !animating && throwsRemaining > 0}
          onThrow={handleThrow}
          onAimUpdate={handleAimUpdate}
          onAimCancel={handleAimCancel}
        />
      </div>

      {/* Turn indicator below table */}
      {!isMyTurn && !winner && (
        <motion.p
          className="mt-3 text-sm text-text-secondary font-medium"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          key="waiting"
        >
          Waiting for opponent...
        </motion.p>
      )}
    </motion.div>
  );
}

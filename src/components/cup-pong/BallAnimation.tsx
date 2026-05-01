'use client';

import { useEffect, useRef, useState, memo } from 'react';
import { motion } from 'framer-motion';
import type { ThrowResult, Cup } from '@/lib/cup-pong-types';

interface BallAnimationProps {
  throwResult: ThrowResult | null;
  throwerSide: 'bottom' | 'top';
  targetCups: Cup[];
  tableWidth: number;
  tableHeight: number;
  onComplete: () => void;
}

const BALL_SIZE = 14;

export const BallAnimation = memo(function BallAnimation({
  throwResult,
  throwerSide,
  targetCups,
  tableWidth,
  tableHeight,
  onComplete,
}: BallAnimationProps) {
  const [phase, setPhase] = useState<'idle' | 'flying' | 'splash' | 'done'>('idle');
  const lastThrowIdRef = useRef('');
  const targetCupsRef = useRef(targetCups);
  targetCupsRef.current = targetCups;
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const animDataRef = useRef<{
    startX: number; startY: number; endX: number; endY: number;
    midX: number; midY: number; hit: boolean; duration: number;
  } | null>(null);
  const completionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!throwResult) {
      if (phase !== 'idle') {
        setPhase('idle');
        animDataRef.current = null;
      }
      return;
    }

    const throwId = `${throwResult.power.toFixed(4)}-${throwResult.throwVector.dx.toFixed(4)}-${throwResult.hit}-${throwResult.cupId}`;
    if (throwId === lastThrowIdRef.current) return;
    lastThrowIdRef.current = throwId;

    const { throwVector, power, hit, cupId } = throwResult;
    const cups = targetCupsRef.current;

    const startX = tableWidth / 2;
    const startY = throwerSide === 'bottom' ? tableHeight - 30 : 30;

    let endX: number;
    let endY: number;

    if (hit && cupId !== null) {
      const hitCup = cups.find((c) => c.id === cupId);
      if (hitCup) {
        endX = hitCup.position.x * tableWidth;
        endY = hitCup.position.y * tableHeight;
      } else {
        endX = tableWidth / 2 + throwVector.dx * tableWidth * 0.3;
        endY = throwerSide === 'bottom' ? tableHeight * 0.2 : tableHeight * 0.8;
      }
    } else {
      const lateralOffset = throwVector.dx * tableWidth * 0.35;
      endX = tableWidth / 2 + lateralOffset;
      endY = throwerSide === 'bottom'
        ? tableHeight * (0.15 + (1 - power) * 0.2)
        : tableHeight * (0.85 - (1 - power) * 0.2);
    }

    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2 - 20;
    const duration = 0.45 + (1 - power) * 0.25;

    animDataRef.current = { startX, startY, endX, endY, midX, midY, hit, duration };
    setPhase('flying');

    // Hard timeout to guarantee completion regardless of framer-motion behavior
    if (completionTimerRef.current) clearTimeout(completionTimerRef.current);
    const totalDuration = hit ? duration + 0.45 : duration + 0.3;
    completionTimerRef.current = setTimeout(() => {
      setPhase('idle');
      animDataRef.current = null;
      lastThrowIdRef.current = '';
      onCompleteRef.current();
    }, totalDuration * 1000);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [throwResult]);

  const data = animDataRef.current;
  if (!data || phase === 'idle') return null;

  const { startX, startY, endX, endY, midX, midY, hit, duration } = data;

  return (
    <>
      {phase === 'flying' && (
        <>
          <motion.div
            key={lastThrowIdRef.current}
            className="absolute rounded-full pointer-events-none z-20"
            style={{
              width: BALL_SIZE,
              height: BALL_SIZE,
              background: 'radial-gradient(circle at 35% 35%, #ffffff, #f5f5f5, #e0e0e0)',
              boxShadow: '0 2px 4px rgba(0,0,0,0.3), inset 0 -1px 2px rgba(0,0,0,0.1)',
            }}
            initial={{
              x: startX - BALL_SIZE / 2,
              y: startY - BALL_SIZE / 2,
              scale: 1,
              opacity: 1,
            }}
            animate={{
              x: [startX - BALL_SIZE / 2, midX - BALL_SIZE / 2, endX - BALL_SIZE / 2],
              y: [startY - BALL_SIZE / 2, midY - BALL_SIZE / 2, endY - BALL_SIZE / 2],
              scale: [1, 1.3, hit ? 0.5 : 1],
              opacity: [1, 1, hit ? 0 : 1],
            }}
            transition={{ duration, ease: 'easeOut', times: [0, 0.5, 1] }}
            onAnimationComplete={() => {
              if (hit) {
                setPhase('splash');
              }
            }}
          />

          {/* Miss bounce (plays after main flight via delay) */}
          {!hit && (
            <motion.div
              key={`miss-${lastThrowIdRef.current}`}
              className="absolute rounded-full pointer-events-none z-20"
              style={{
                width: BALL_SIZE,
                height: BALL_SIZE,
                background: 'radial-gradient(circle at 35% 35%, #ffffff, #f5f5f5, #e0e0e0)',
                boxShadow: '0 2px 4px rgba(0,0,0,0.3), inset 0 -1px 2px rgba(0,0,0,0.1)',
              }}
              initial={{
                x: endX - BALL_SIZE / 2,
                y: endY - BALL_SIZE / 2,
                opacity: 0,
                scale: 1,
              }}
              animate={{
                x: endX - BALL_SIZE / 2 + (endX > tableWidth / 2 ? 20 : -20),
                y: endY - BALL_SIZE / 2 + 25,
                opacity: [0, 1, 0],
                scale: 0.4,
              }}
              transition={{ duration: 0.3, ease: 'easeIn', delay: duration }}
            />
          )}
        </>
      )}

      {phase === 'splash' && (
        <motion.div
          key={`splash-${lastThrowIdRef.current}`}
          className="absolute pointer-events-none z-20"
          style={{
            left: endX - 20,
            top: endY - 20,
            width: 40,
            height: 40,
          }}
          initial={{ scale: 0.3, opacity: 1 }}
          animate={{ scale: 1.5, opacity: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          {[0, 60, 120, 180, 240, 300].map((deg) => (
            <motion.div
              key={deg}
              className="absolute w-1.5 h-1.5 rounded-full bg-amber-200/80"
              style={{ left: '50%', top: '50%' }}
              initial={{ x: 0, y: 0, opacity: 1 }}
              animate={{
                x: Math.cos((deg * Math.PI) / 180) * 16,
                y: Math.sin((deg * Math.PI) / 180) * 16,
                opacity: 0,
              }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            />
          ))}
        </motion.div>
      )}
    </>
  );
});

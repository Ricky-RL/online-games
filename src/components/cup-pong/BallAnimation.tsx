'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useAnimation } from 'framer-motion';
import type { ThrowResult, Cup } from '@/lib/cup-pong-types';

interface BallAnimationProps {
  /** The throw to animate */
  throwResult: ThrowResult | null;
  /** Which end the thrower is at (player 1 throws from bottom) */
  throwerSide: 'bottom' | 'top';
  /** Target cups (to compute landing position for hits) */
  targetCups: Cup[];
  /** Container dimensions */
  tableWidth: number;
  tableHeight: number;
  /** Called when ball animation finishes */
  onComplete: () => void;
}

const BALL_SIZE = 14;

export function BallAnimation({
  throwResult,
  throwerSide,
  targetCups,
  tableWidth,
  tableHeight,
  onComplete,
}: BallAnimationProps) {
  const controls = useAnimation();
  const [visible, setVisible] = useState(false);
  const [splash, setSplash] = useState<{ x: number; y: number } | null>(null);
  const animatingRef = useRef(false);
  const lastThrowRef = useRef<ThrowResult | null>(null);

  useEffect(() => {
    if (!throwResult || animatingRef.current) return;
    if (throwResult === lastThrowRef.current) return;

    lastThrowRef.current = throwResult;
    animatingRef.current = true;

    const { throwVector, power, hit, cupId } = throwResult;

    // Starting position: center of the thrower's end
    const startX = tableWidth / 2;
    const startY = throwerSide === 'bottom' ? tableHeight - 30 : 30;

    // Compute landing position
    let endX: number;
    let endY: number;

    if (hit && cupId !== null) {
      // Land on the hit cup's position
      const hitCup = targetCups.find((c) => c.id === cupId);
      if (hitCup) {
        endX = hitCup.position.x * tableWidth;
        endY = hitCup.position.y * tableHeight;
      } else {
        endX = tableWidth / 2 + throwVector.dx * tableWidth * 0.3;
        endY = throwerSide === 'bottom' ? tableHeight * 0.2 : tableHeight * 0.8;
      }
    } else {
      // Miss: compute landing based on throw vector
      const lateralOffset = throwVector.dx * tableWidth * 0.35;
      endX = tableWidth / 2 + lateralOffset;
      endY = throwerSide === 'bottom'
        ? tableHeight * (0.15 + (1 - power) * 0.2)
        : tableHeight * (0.85 - (1 - power) * 0.2);
    }

    // Midpoint (arc apex)
    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2 - 20; // Arc above the straight line

    const duration = 0.45 + (1 - power) * 0.25;

    setVisible(true);
    setSplash(null);

    controls.set({
      x: startX - BALL_SIZE / 2,
      y: startY - BALL_SIZE / 2,
      scale: 1,
      opacity: 1,
    });

    controls
      .start({
        x: [startX - BALL_SIZE / 2, midX - BALL_SIZE / 2, endX - BALL_SIZE / 2],
        y: [startY - BALL_SIZE / 2, midY - BALL_SIZE / 2, endY - BALL_SIZE / 2],
        scale: [1, 1.3, hit ? 0.5 : 1],
        opacity: [1, 1, hit ? 0 : 1],
        transition: {
          duration,
          ease: 'easeOut',
          times: [0, 0.5, 1],
        },
      })
      .then(() => {
        if (hit) {
          // Show splash effect
          setSplash({ x: endX, y: endY });
          setTimeout(() => {
            setSplash(null);
            setVisible(false);
            animatingRef.current = false;
            onComplete();
          }, 350);
        } else {
          // Miss: ball bounces off and fades
          controls
            .start({
              x: endX - BALL_SIZE / 2 + (Math.random() > 0.5 ? 20 : -20),
              y: endY - BALL_SIZE / 2 + 25,
              opacity: 0,
              scale: 0.4,
              transition: { duration: 0.25, ease: 'easeIn' },
            })
            .then(() => {
              setVisible(false);
              animatingRef.current = false;
              onComplete();
            });
        }
      });
  }, [throwResult, controls, throwerSide, targetCups, tableWidth, tableHeight, onComplete]);

  return (
    <>
      {visible && (
        <motion.div
          className="absolute rounded-full pointer-events-none z-20"
          style={{
            width: BALL_SIZE,
            height: BALL_SIZE,
            background: 'radial-gradient(circle at 35% 35%, #ffffff, #f5f5f5, #e0e0e0)',
            boxShadow: '0 2px 4px rgba(0,0,0,0.3), inset 0 -1px 2px rgba(0,0,0,0.1)',
          }}
          animate={controls}
        />
      )}

      {splash && (
        <motion.div
          className="absolute pointer-events-none z-20"
          style={{
            left: splash.x - 20,
            top: splash.y - 20,
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
              style={{
                left: '50%',
                top: '50%',
              }}
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
}

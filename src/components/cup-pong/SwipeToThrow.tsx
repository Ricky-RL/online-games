'use client';

import { useRef, useCallback, useState } from 'react';
import type { ThrowVector } from '@/lib/cup-pong-types';

interface SwipeToThrowProps {
  /** Whether the player can currently throw */
  enabled: boolean;
  /** Called when a valid swipe/throw is released */
  onThrow: (direction: ThrowVector, power: number) => void;
  /** Called during swipe to show aim preview */
  onAimUpdate?: (direction: ThrowVector, power: number) => void;
  /** Called when aiming starts */
  onAimStart?: () => void;
  /** Called when aiming is cancelled */
  onAimCancel?: () => void;
}

const MIN_SWIPE_DISTANCE = 20;
const MAX_SWIPE_DISTANCE = 200;

export function SwipeToThrow({
  enabled,
  onThrow,
  onAimUpdate,
  onAimStart,
  onAimCancel,
}: SwipeToThrowProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  const [aiming, setAiming] = useState(false);
  const [aimState, setAimState] = useState<{ direction: ThrowVector; power: number } | null>(null);

  const getRelativePos = useCallback((clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }, []);

  const computeThrow = useCallback((startX: number, startY: number, endX: number, endY: number) => {
    const dxRaw = endX - startX;
    const dyRaw = endY - startY; // Negative = swipe up = forward
    const distance = Math.sqrt(dxRaw * dxRaw + dyRaw * dyRaw);

    // Power normalized 0-1
    const power = Math.min(distance / MAX_SWIPE_DISTANCE, 1);

    // Direction vector: dx is lateral (-1 to 1), dy is always positive (forward)
    // Swipe up = negative clientY delta = forward throw
    const angle = Math.atan2(dxRaw, -dyRaw);
    const direction: ThrowVector = {
      dx: Math.sin(angle), // -1 (left) to 1 (right)
      dy: Math.cos(angle), // always positive (forward component)
    };

    return { direction, power };
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!enabled) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const pos = getRelativePos(e.clientX, e.clientY);
    startPosRef.current = pos;
    setAiming(true);
    setAimState(null);
    onAimStart?.();
  }, [enabled, getRelativePos, onAimStart]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!aiming || !startPosRef.current) return;
    const pos = getRelativePos(e.clientX, e.clientY);
    const distance = Math.sqrt(
      (pos.x - startPosRef.current.x) ** 2 + (pos.y - startPosRef.current.y) ** 2
    );

    if (distance >= MIN_SWIPE_DISTANCE) {
      const { direction, power } = computeThrow(
        startPosRef.current.x,
        startPosRef.current.y,
        pos.x,
        pos.y
      );
      setAimState({ direction, power });
      onAimUpdate?.(direction, power);
    } else {
      setAimState(null);
    }
  }, [aiming, getRelativePos, computeThrow, onAimUpdate]);

  const handlePointerUp = useCallback(() => {
    if (!aiming || !startPosRef.current) {
      setAiming(false);
      return;
    }

    if (aimState && aimState.power > 0) {
      // Add a tiny random perturbation for realism (as mentioned in the logic file)
      const perturbedDirection: ThrowVector = {
        dx: aimState.direction.dx + (Math.random() - 0.5) * 0.05,
        dy: aimState.direction.dy,
      };
      onThrow(perturbedDirection, aimState.power);
    } else {
      onAimCancel?.();
    }

    startPosRef.current = null;
    setAiming(false);
    setAimState(null);
  }, [aiming, aimState, onThrow, onAimCancel]);

  // Compute visual angle for the arrow indicator
  const aimAngle = aimState
    ? Math.atan2(aimState.direction.dx, aimState.direction.dy) * (180 / Math.PI)
    : 0;

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-10"
      style={{ touchAction: 'none' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* Aim direction indicator */}
      {aiming && aimState && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 pointer-events-none">
          {/* Direction arrow */}
          <svg
            width="40"
            height="40"
            viewBox="0 0 40 40"
            className="text-white/80"
            style={{
              transform: `rotate(${aimAngle}deg)`,
            }}
          >
            <path
              d="M20 4 L20 36 M20 4 L12 14 M20 4 L28 14"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
          {/* Power bar */}
          <div className="w-16 h-2 rounded-full bg-white/20 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-75"
              style={{
                width: `${aimState.power * 100}%`,
                backgroundColor: aimState.power > 0.8
                  ? '#ef4444'
                  : aimState.power > 0.5
                    ? '#f59e0b'
                    : '#22c55e',
              }}
            />
          </div>
        </div>
      )}

      {/* Swipe hint when idle and enabled */}
      {enabled && !aiming && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none">
          <p className="text-xs text-white/50 font-medium whitespace-nowrap animate-pulse">
            Swipe up to throw
          </p>
        </div>
      )}
    </div>
  );
}

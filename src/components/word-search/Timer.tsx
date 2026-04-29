'use client';

import { useState, useEffect, useRef } from 'react';

interface TimerProps {
  timeLimit: number; // seconds
  started: boolean;
  onTimeUp: () => void;
}

export function Timer({ timeLimit, started, onTimeUp }: TimerProps) {
  const [remaining, setRemaining] = useState(timeLimit);
  const onTimeUpRef = useRef(onTimeUp);
  onTimeUpRef.current = onTimeUp;
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (!started) return;
    if (startTimeRef.current === null) {
      startTimeRef.current = Date.now();
    }

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current!) / 1000);
      const left = Math.max(0, timeLimit - elapsed);
      setRemaining(left);
      if (left === 0) {
        clearInterval(interval);
        onTimeUpRef.current();
      }
    }, 250);

    return () => clearInterval(interval);
  }, [started, timeLimit]);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const isUrgent = remaining <= 30;

  return (
    <div className={`font-mono text-2xl font-bold tabular-nums ${isUrgent ? 'text-[#E63946] animate-pulse' : 'text-text-primary'}`}>
      {minutes}:{seconds.toString().padStart(2, '0')}
    </div>
  );
}

export function getElapsedSeconds(startTime: number): number {
  return Math.floor((Date.now() - startTime) / 1000);
}

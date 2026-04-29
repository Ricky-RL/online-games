'use client';

import { MAX_STROKES } from '@/lib/mini-golf/types';

interface StrokeCounterProps {
  stroke: number;
  holeNumber: number;
  totalHoles: number;
}

export function StrokeCounter({ stroke, holeNumber, totalHoles }: StrokeCounterProps) {
  return (
    <div className="absolute top-2 left-1/2 -translate-x-1/2 pointer-events-none z-10">
      <div className="bg-surface/90 border border-border rounded-full px-4 py-1 text-sm font-medium text-text-primary backdrop-blur-sm">
        Hole {holeNumber}/{totalHoles} · Stroke {stroke}/{MAX_STROKES}
      </div>
    </div>
  );
}

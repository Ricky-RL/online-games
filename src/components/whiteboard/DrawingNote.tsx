'use client';

import { useRef, useEffect } from 'react';
import type { Stroke } from '@/lib/whiteboard-types';

interface DrawingNoteProps {
  strokes: Stroke[];
  width: number;
  height: number;
}

export function DrawingNote({ strokes, width, height }: DrawingNoteProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    for (const stroke of strokes) {
      if (stroke.points.length < 2) continue;
      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    }
  }, [strokes, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="rounded pointer-events-none"
      style={{ width: '100%', height: '100%' }}
    />
  );
}

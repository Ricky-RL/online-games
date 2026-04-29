'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import type { Stroke } from '@/lib/whiteboard-types';

interface DrawingCanvasProps {
  initialStrokes: Stroke[] | null;
  width: number;
  height: number;
  onSave: (strokes: Stroke[]) => void;
  onCancel: () => void;
  inline?: boolean;
}

const PEN_COLORS = ['#333333', '#E63946', '#457B9D', '#2A9D8F', '#E9C46A', '#F4A261'];
const PEN_WIDTHS = [2, 4, 8];

export function DrawingCanvas({ initialStrokes, width, height, onSave, onCancel, inline }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [strokes, setStrokes] = useState<Stroke[]>(initialStrokes ?? []);
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);
  const [penColor, setPenColor] = useState('#333333');
  const [penWidth, setPenWidth] = useState(4);
  const isDrawing = useRef(false);

  const renderStrokes = useCallback((strokesToRender: Stroke[], current: Stroke | null) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    const allStrokes = current ? [...strokesToRender, current] : strokesToRender;
    for (const stroke of allStrokes) {
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
  }, [width, height]);

  useEffect(() => {
    renderStrokes(strokes, currentStroke);
  }, [strokes, currentStroke, renderStrokes]);

  function getCanvasPoint(e: React.PointerEvent): { x: number; y: number } {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  function handlePointerDown(e: React.PointerEvent) {
    isDrawing.current = true;
    const point = getCanvasPoint(e);
    setCurrentStroke({ points: [point], color: penColor, width: penWidth });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!isDrawing.current || !currentStroke) return;
    const point = getCanvasPoint(e);
    setCurrentStroke((prev) =>
      prev ? { ...prev, points: [...prev.points, point] } : null
    );
  }

  function handlePointerUp() {
    if (!isDrawing.current || !currentStroke) return;
    isDrawing.current = false;
    if (currentStroke.points.length > 1) {
      setStrokes((prev) => [...prev, currentStroke]);
    }
    setCurrentStroke(null);
  }

  function handleUndo() {
    setStrokes((prev) => prev.slice(0, -1));
  }

  function handleClear() {
    setStrokes([]);
  }

  useEffect(() => {
    if (inline) {
      onSave(strokes);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strokes, inline]);

  return (
    <div className="flex flex-col gap-3">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        className="rounded-lg border border-border bg-white cursor-crosshair touch-none"
        style={{ width, height }}
      />

      {/* Drawing tools */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Pen colors */}
        <div className="flex items-center gap-1.5">
          {PEN_COLORS.map((color) => (
            <button
              key={color}
              onClick={() => setPenColor(color)}
              className="w-5 h-5 rounded-full cursor-pointer border-2 transition-transform"
              style={{
                backgroundColor: color,
                borderColor: penColor === color ? '#000' : 'transparent',
                transform: penColor === color ? 'scale(1.2)' : 'scale(1)',
              }}
            />
          ))}
        </div>

        {/* Pen widths */}
        <div className="flex items-center gap-1.5 border-l border-border pl-3">
          {PEN_WIDTHS.map((w) => (
            <button
              key={w}
              onClick={() => setPenWidth(w)}
              className="flex items-center justify-center w-7 h-7 rounded cursor-pointer transition-colors"
              style={{ backgroundColor: penWidth === w ? 'rgba(0,0,0,0.1)' : 'transparent' }}
            >
              <div
                className="rounded-full bg-text-primary"
                style={{ width: w + 2, height: w + 2 }}
              />
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 border-l border-border pl-3 ml-auto">
          <button
            onClick={handleUndo}
            disabled={strokes.length === 0}
            className="px-2 py-1 text-xs rounded bg-surface border border-border hover:bg-border/50 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Undo
          </button>
          <button
            onClick={handleClear}
            disabled={strokes.length === 0}
            className="px-2 py-1 text-xs rounded bg-surface border border-border hover:bg-border/50 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Save/Cancel — hidden in inline mode (parent handles save) */}
      {!inline && (
        <div className="flex items-center gap-2 justify-end pt-1">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-sm rounded-lg border border-border hover:bg-border/50 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(strokes)}
            className="px-3 py-1.5 text-sm rounded-lg bg-text-primary text-surface font-medium hover:opacity-90 transition-opacity cursor-pointer"
          >
            Save
          </button>
        </div>
      )}
    </div>
  );
}

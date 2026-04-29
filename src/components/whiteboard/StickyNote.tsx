'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import type { WhiteboardNote, NotePosition, NoteSize, Stroke } from '@/lib/whiteboard-types';
import { DrawingNote } from './DrawingNote';
import { ColorPicker } from './ColorPicker';

interface StickyNoteProps {
  note: WhiteboardNote;
  onMove: (position: NotePosition) => void;
  onSave: (params: { textContent: string; drawingData: Stroke[] | null }) => void;
  onDelete: () => void;
  onResize: (size: NoteSize) => void;
  onColorChange: (color: string) => void;
  viewportOffset: NotePosition;
}

export function StickyNote({ note, onMove, onSave, onDelete, onResize, onColorChange, viewportOffset }: StickyNoteProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawTool, setDrawTool] = useState<'pen' | 'eraser' | 'fill'>('pen');
  const [penColor, setPenColor] = useState('#333333');
  const [text, setText] = useState(note.text_content);
  const [strokes, setStrokes] = useState<Stroke[]>(note.drawing_data ?? []);
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [localPosition, setLocalPosition] = useState<NotePosition>({
    x: note.position_x,
    y: note.position_y,
  });
  const [localSize, setLocalSize] = useState<NoteSize>({
    width: note.width,
    height: note.height,
  });

  const dragStart = useRef<{ pointerX: number; pointerY: number; noteX: number; noteY: number } | null>(null);
  const resizeStart = useRef<{ pointerX: number; pointerY: number; width: number; height: number } | null>(null);
  const drawingRef = useRef(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync from props when not interacting
  if (!isDragging && (localPosition.x !== note.position_x || localPosition.y !== note.position_y)) {
    setLocalPosition({ x: note.position_x, y: note.position_y });
  }
  if (!isResizing && (localSize.width !== note.width || localSize.height !== note.height)) {
    setLocalSize({ width: note.width, height: note.height });
  }
  if (!isEditing && text !== note.text_content) {
    setText(note.text_content);
  }
  if (!isDrawing && JSON.stringify(strokes) !== JSON.stringify(note.drawing_data ?? [])) {
    setStrokes(note.drawing_data ?? []);
  }

  // Render strokes on canvas
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = localSize.width - 24;
    const h = localSize.height - 36;
    canvas.width = w;
    canvas.height = h;
    ctx.clearRect(0, 0, w, h);

    const allStrokes = currentStroke ? [...strokes, currentStroke] : strokes;
    for (const stroke of allStrokes) {
      if (stroke.points.length < 1) continue;
      if (stroke.color === '__fill__' || stroke.color.startsWith('__fill_')) {
        // Replay flood fill — extract color from stroke marker
        let fillR = 51, fillG = 51, fillB = 51;
        const colorMatch = stroke.color.match(/__fill_(#[0-9a-fA-F]{6})__/);
        if (colorMatch) {
          fillR = parseInt(colorMatch[1].slice(1, 3), 16);
          fillG = parseInt(colorMatch[1].slice(3, 5), 16);
          fillB = parseInt(colorMatch[1].slice(5, 7), 16);
        }
        const fillA = 255;
        const px = Math.floor(stroke.points[0].x);
        const py = Math.floor(stroke.points[0].y);
        if (px < 0 || px >= w || py < 0 || py >= h) continue;
        const imageData = ctx.getImageData(0, 0, w, h);
        const data = imageData.data;
        const targetIdx = (py * w + px) * 4;
        const targetR = data[targetIdx];
        const targetG = data[targetIdx + 1];
        const targetB = data[targetIdx + 2];
        const targetA = data[targetIdx + 3];
        if (!(targetR === fillR && targetG === fillG && targetB === fillB && targetA === fillA)) {
          const stack: [number, number][] = [[px, py]];
          const visited = new Set<number>();
          while (stack.length > 0) {
            const [cx, cy] = stack.pop()!;
            const idx = (cy * w + cx) * 4;
            if (visited.has(idx)) continue;
            if (cx < 0 || cx >= w || cy < 0 || cy >= h) continue;
            if (Math.abs(data[idx] - targetR) > 10 || Math.abs(data[idx + 1] - targetG) > 10 || Math.abs(data[idx + 2] - targetB) > 10 || Math.abs(data[idx + 3] - targetA) > 30) continue;
            visited.add(idx);
            data[idx] = fillR;
            data[idx + 1] = fillG;
            data[idx + 2] = fillB;
            data[idx + 3] = fillA;
            stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
          }
          ctx.putImageData(imageData, 0, 0);
        }
        continue;
      }
      if (stroke.points.length < 2) continue;
      ctx.beginPath();
      if (stroke.color === '__eraser__') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.strokeStyle = 'rgba(0,0,0,1)';
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = stroke.color;
      }
      ctx.lineWidth = stroke.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
  }, [strokes, currentStroke, localSize]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.selectionStart = textareaRef.current.value.length;
    }
  }, [isEditing]);

  // Save on blur or when leaving edit/draw modes
  function handleSave() {
    onSave({
      textContent: text,
      drawingData: strokes.length > 0 ? strokes : null,
    });
  }

  function handleTextBlur() {
    setIsEditing(false);
    handleSave();
  }

  function handleTextKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      setIsEditing(false);
      handleSave();
    }
  }

  // Drawing handlers
  function handleCanvasPointerDown(e: React.PointerEvent) {
    if (!isDrawing) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const point = { x: e.clientX - rect.left, y: e.clientY - rect.top };

    if (drawTool === 'fill') {
      // Flood fill at the clicked point
      const canvas = canvasRef.current!;
      const ctx = canvas.getContext('2d')!;
      const w = canvas.width;
      const h = canvas.height;
      const imageData = ctx.getImageData(0, 0, w, h);
      const data = imageData.data;
      const px = Math.floor(point.x);
      const py = Math.floor(point.y);
      if (px < 0 || px >= w || py < 0 || py >= h) return;

      const targetIdx = (py * w + px) * 4;
      const targetR = data[targetIdx];
      const targetG = data[targetIdx + 1];
      const targetB = data[targetIdx + 2];
      const targetA = data[targetIdx + 3];

      // Parse penColor hex to RGB
      const fillR = parseInt(penColor.slice(1, 3), 16);
      const fillG = parseInt(penColor.slice(3, 5), 16);
      const fillB = parseInt(penColor.slice(5, 7), 16);
      const fillA = 255;
      if (targetR === fillR && targetG === fillG && targetB === fillB && targetA === fillA) return;

      const stack: [number, number][] = [[px, py]];
      const visited = new Set<number>();

      while (stack.length > 0) {
        const [cx, cy] = stack.pop()!;
        const idx = (cy * w + cx) * 4;
        if (visited.has(idx)) continue;
        if (cx < 0 || cx >= w || cy < 0 || cy >= h) continue;
        if (Math.abs(data[idx] - targetR) > 10 || Math.abs(data[idx + 1] - targetG) > 10 || Math.abs(data[idx + 2] - targetB) > 10 || Math.abs(data[idx + 3] - targetA) > 30) continue;

        visited.add(idx);
        data[idx] = fillR;
        data[idx + 1] = fillG;
        data[idx + 2] = fillB;
        data[idx + 3] = fillA;

        stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
      }

      ctx.putImageData(imageData, 0, 0);
      // Save as a fill stroke with the color used
      const fillStroke: Stroke = { points: [point], color: `__fill_${penColor}__`, width: 0 };
      const newStrokes = [...strokes, fillStroke];
      setStrokes(newStrokes);
      onSave({ textContent: text, drawingData: newStrokes });
      return;
    }

    drawingRef.current = true;
    const strokeColor = drawTool === 'eraser' ? '__eraser__' : penColor;
    const strokeWidth = drawTool === 'eraser' ? 12 : 3;
    setCurrentStroke({ points: [point], color: strokeColor, width: strokeWidth });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function handleCanvasPointerMove(e: React.PointerEvent) {
    if (!drawingRef.current || !currentStroke) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const point = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    setCurrentStroke((prev) => prev ? { ...prev, points: [...prev.points, point] } : null);
  }

  function handleCanvasPointerUp() {
    if (!drawingRef.current || !currentStroke) return;
    drawingRef.current = false;
    if (currentStroke.points.length > 1) {
      const newStrokes = [...strokes, currentStroke];
      setStrokes(newStrokes);
      onSave({ textContent: text, drawingData: newStrokes });
    }
    setCurrentStroke(null);
  }

  function handleUndo() {
    const newStrokes = strokes.slice(0, -1);
    setStrokes(newStrokes);
    onSave({ textContent: text, drawingData: newStrokes.length > 0 ? newStrokes : null });
  }

  // Drag handlers
  function handlePointerDown(e: React.PointerEvent) {
    if ((e.target as HTMLElement).closest('[data-no-drag]')) return;
    if ((e.target as HTMLElement).closest('[data-resize-handle]')) return;
    e.preventDefault();
    setIsDragging(true);
    dragStart.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      noteX: localPosition.x,
      noteY: localPosition.y,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!isDragging || !dragStart.current) return;
    const dx = e.clientX - dragStart.current.pointerX;
    const dy = e.clientY - dragStart.current.pointerY;
    setLocalPosition({
      x: dragStart.current.noteX + dx,
      y: dragStart.current.noteY + dy,
    });
  }

  function handlePointerUp() {
    if (!isDragging) return;
    setIsDragging(false);
    dragStart.current = null;
    onMove(localPosition);
  }

  // Resize handlers
  function handleResizePointerDown(e: React.PointerEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    resizeStart.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      width: localSize.width,
      height: localSize.height,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function handleResizePointerMove(e: React.PointerEvent) {
    if (!isResizing || !resizeStart.current) return;
    const dx = e.clientX - resizeStart.current.pointerX;
    const dy = e.clientY - resizeStart.current.pointerY;
    setLocalSize({
      width: Math.max(120, resizeStart.current.width + dx),
      height: Math.max(80, resizeStart.current.height + dy),
    });
  }

  function handleResizePointerUp() {
    if (!isResizing) return;
    setIsResizing(false);
    resizeStart.current = null;
    onResize(localSize);
  }

  const rotation = ((note.id.charCodeAt(0) % 7) - 3) * 0.7;
  const isActive = isEditing || isDrawing;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className="absolute select-none"
      style={{
        left: localPosition.x + viewportOffset.x,
        top: localPosition.y + viewportOffset.y,
        width: localSize.width,
        height: localSize.height,
        zIndex: isDragging || isResizing || isActive ? 999 : 1,
        transform: `rotate(${isDragging || isActive ? 0 : rotation}deg) scale(${isDragging ? 1.05 : 1})`,
        transition: isDragging || isResizing ? 'none' : 'transform 0.2s ease',
      }}
    >
      <div
        className="rounded-xl shadow-lg hover:shadow-xl transition-shadow cursor-grab active:cursor-grabbing overflow-hidden h-full flex flex-col"
        style={{ backgroundColor: note.color }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 pt-2 pb-1 shrink-0">
          <div className="flex items-center gap-1.5">
            <div className="flex gap-0.5 opacity-40">
              <div className="w-1 h-1 rounded-full bg-current" />
              <div className="w-1 h-1 rounded-full bg-current" />
              <div className="w-1 h-1 rounded-full bg-current" />
            </div>
            {note.created_by_name && (
              <span className="text-[10px] font-medium text-text-primary/40 uppercase tracking-wider">
                {note.created_by_name}
              </span>
            )}
          </div>
          <div className="flex items-center gap-0.5" data-no-drag>
            {/* Draw toggle */}
            <button
              onClick={() => { setIsDrawing(!isDrawing); setIsEditing(false); }}
              className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors cursor-pointer ${isDrawing ? 'bg-black/20' : 'hover:bg-black/10'}`}
              title={isDrawing ? 'Stop drawing' : 'Draw'}
            >
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M1.5 10.5c2-2 3-6 4.5-6.5s3 .5 3 2-1.5 3-3.5 3.5-3 0-4 1" strokeLinecap="round" />
              </svg>
            </button>
            {/* Color */}
            <button
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-black/10 transition-colors cursor-pointer"
              title="Color"
            >
              <div className="w-3.5 h-3.5 rounded-full border border-black/20" style={{ backgroundColor: note.color }} />
            </button>
            {/* Delete */}
            <button
              onClick={onDelete}
              className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-red-500/20 transition-colors cursor-pointer"
              title="Delete"
            >
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M2 2l8 8M10 2l-8 8" />
              </svg>
            </button>
          </div>
        </div>

        {/* Color picker dropdown */}
        {showColorPicker && (
          <div className="px-3 pb-2 shrink-0" data-no-drag>
            <ColorPicker selected={note.color} onChange={(c) => { onColorChange(c); setShowColorPicker(false); }} />
          </div>
        )}

        {/* Drawing toolbar — shows when in draw mode */}
        {isDrawing && (
          <div className="flex items-center gap-1 px-3 pb-1 shrink-0 flex-wrap" data-no-drag>
            <button
              onClick={() => setDrawTool('pen')}
              className={`px-2 py-0.5 text-[10px] rounded font-medium transition-colors cursor-pointer ${drawTool === 'pen' ? 'bg-black/15 text-text-primary' : 'text-text-primary/50 hover:bg-black/5'}`}
            >
              Pen
            </button>
            <button
              onClick={() => setDrawTool('eraser')}
              className={`px-2 py-0.5 text-[10px] rounded font-medium transition-colors cursor-pointer ${drawTool === 'eraser' ? 'bg-black/15 text-text-primary' : 'text-text-primary/50 hover:bg-black/5'}`}
            >
              Eraser
            </button>
            <button
              onClick={() => setDrawTool('fill')}
              className={`px-2 py-0.5 text-[10px] rounded font-medium transition-colors cursor-pointer ${drawTool === 'fill' ? 'bg-black/15 text-text-primary' : 'text-text-primary/50 hover:bg-black/5'}`}
            >
              Fill
            </button>
            <div className="w-px h-3 bg-black/10 mx-1" />
            {/* Pen/fill color swatches */}
            {['#333333', '#E63946', '#457B9D', '#2A9D8F', '#E9C46A', '#F4A261', '#FFFFFF'].map((c) => (
              <button
                key={c}
                onClick={() => setPenColor(c)}
                className="w-4 h-4 rounded-full cursor-pointer border transition-transform"
                style={{
                  backgroundColor: c,
                  borderColor: penColor === c ? '#000' : 'rgba(0,0,0,0.15)',
                  transform: penColor === c ? 'scale(1.3)' : 'scale(1)',
                }}
              />
            ))}
            <div className="w-px h-3 bg-black/10 mx-1" />
            <button
              onClick={handleUndo}
              disabled={strokes.length === 0}
              className="px-2 py-0.5 text-[10px] rounded font-medium text-text-primary/50 hover:bg-black/5 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Undo
            </button>
          </div>
        )}

        {/* Content area — text + drawing canvas layered */}
        <div
          className="flex-1 relative mx-3 mb-3 overflow-hidden rounded-lg"
          data-no-drag
        >
          {/* Text layer */}
          {isEditing ? (
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onBlur={handleTextBlur}
              onKeyDown={handleTextKeyDown}
              placeholder="Type here..."
              className="absolute inset-0 w-full h-full p-2 text-sm bg-transparent resize-none text-text-primary placeholder:text-text-secondary/30 focus:outline-none z-10"
            />
          ) : (
            <div
              className="absolute inset-0 p-2 overflow-auto cursor-text z-10"
              onDoubleClick={() => { setIsEditing(true); setIsDrawing(false); }}
              style={{ pointerEvents: isDrawing ? 'none' : 'auto' }}
            >
              {text ? (
                <p className="text-sm text-text-primary/80 whitespace-pre-wrap break-words leading-relaxed">
                  {text}
                </p>
              ) : !strokes.length ? (
                <span className="italic text-sm text-text-secondary/40">Double-click to type...</span>
              ) : null}
            </div>
          )}

          {/* Drawing canvas layer (overlays text) */}
          <canvas
            ref={canvasRef}
            className={`absolute inset-0 z-20 rounded-lg ${isDrawing ? 'border border-dashed border-black/15' : ''}`}
            style={{
              width: localSize.width - 24,
              height: localSize.height - 36,
              pointerEvents: isDrawing ? 'auto' : 'none',
              cursor: isDrawing ? (drawTool === 'eraser' ? 'cell' : drawTool === 'fill' ? 'pointer' : 'crosshair') : 'default',
            }}
            onPointerDown={handleCanvasPointerDown}
            onPointerMove={handleCanvasPointerMove}
            onPointerUp={handleCanvasPointerUp}
            onPointerLeave={handleCanvasPointerUp}
          />

          {/* Static drawing display when not in draw mode and canvas empty */}
          {!isDrawing && strokes.length > 0 && !canvasRef.current && (
            <div className="absolute inset-0 z-15">
              <DrawingNote
                strokes={strokes}
                width={localSize.width - 24}
                height={localSize.height - 36}
              />
            </div>
          )}
        </div>
      </div>

      {/* Resize handle */}
      <div
        data-resize-handle
        className="absolute bottom-0 right-0 w-5 h-5 cursor-se-resize z-10 flex items-end justify-end"
        onPointerDown={handleResizePointerDown}
        onPointerMove={handleResizePointerMove}
        onPointerUp={handleResizePointerUp}
        onPointerLeave={handleResizePointerUp}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" className="opacity-40">
          <path d="M9 1L1 9M9 5L5 9M9 9L9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
    </motion.div>
  );
}

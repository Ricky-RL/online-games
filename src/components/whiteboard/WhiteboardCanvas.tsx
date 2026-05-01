'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import type { WhiteboardNote, NotePosition, NoteContentType, NoteSize, Stroke } from '@/lib/whiteboard-types';
import { StickyNote } from './StickyNote';

interface WhiteboardCanvasProps {
  notes: WhiteboardNote[];
  onNoteMove: (noteId: string, position: NotePosition) => void;
  onNoteSave: (noteId: string, params: { textContent: string; drawingData: Stroke[] | null }) => void;
  onNoteDelete: (noteId: string) => void;
  onNoteColorChange: (noteId: string, color: string) => void;
  onNoteResize: (noteId: string, size: NoteSize) => void;
  onCreateNote: (position: NotePosition, type: NoteContentType) => void;
}

export function WhiteboardCanvas({
  notes,
  onNoteMove,
  onNoteSave,
  onNoteDelete,
  onNoteColorChange,
  onNoteResize,
  onCreateNote,
}: WhiteboardCanvasProps) {
  const [viewportOffset, setViewportOffset] = useState<NotePosition>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef<{ pointerX: number; pointerY: number; offsetX: number; offsetY: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // Track active touch count for multi-touch pan detection
  const activeTouchCount = useRef(0);
  // Track two-finger pan midpoint
  const twoFingerStart = useRef<{ midX: number; midY: number; offsetX: number; offsetY: number } | null>(null);
  // Ref to avoid re-registering touch listeners on every pan frame
  const viewportOffsetRef = useRef(viewportOffset);
  viewportOffsetRef.current = viewportOffset;

  // Use native touch event listeners for two-finger pan detection.
  // This allows single-finger touches to pass through to notes for drawing/dragging,
  // while two-finger gestures always pan the canvas.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function handleTouchStart(e: TouchEvent) {
      activeTouchCount.current = e.touches.length;

      if (e.touches.length === 2) {
        // Two-finger gesture: start panning regardless of target
        e.preventDefault();
        const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        twoFingerStart.current = {
          midX,
          midY,
          offsetX: viewportOffsetRef.current.x,
          offsetY: viewportOffsetRef.current.y,
        };
        setIsPanning(true);
        // Cancel any single-finger pan that may have started
        panStart.current = null;
      }
    }

    function handleTouchMove(e: TouchEvent) {
      if (e.touches.length === 2 && twoFingerStart.current) {
        e.preventDefault();
        const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        const dx = midX - twoFingerStart.current.midX;
        const dy = midY - twoFingerStart.current.midY;
        setViewportOffset({
          x: twoFingerStart.current.offsetX + dx,
          y: twoFingerStart.current.offsetY + dy,
        });
      }
    }

    function handleTouchEnd(e: TouchEvent) {
      activeTouchCount.current = e.touches.length;
      if (e.touches.length < 2) {
        twoFingerStart.current = null;
        setIsPanning(false);
      }
    }

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);
    container.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, []); // Stable: reads viewportOffset through ref

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    // Only allow single-pointer pan on the background itself (not on notes)
    if (e.target !== containerRef.current) return;
    // Skip if two-finger pan is active
    if (activeTouchCount.current >= 2) return;
    e.preventDefault();
    setIsPanning(true);
    panStart.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      offsetX: viewportOffset.x,
      offsetY: viewportOffset.y,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [viewportOffset]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isPanning || !panStart.current) return;
    // If two-finger pan took over, ignore single-pointer moves
    if (twoFingerStart.current) return;
    const dx = e.clientX - panStart.current.pointerX;
    const dy = e.clientY - panStart.current.pointerY;
    setViewportOffset({
      x: panStart.current.offsetX + dx,
      y: panStart.current.offsetY + dy,
    });
  }, [isPanning]);

  const handlePointerUp = useCallback(() => {
    if (twoFingerStart.current) return; // Two-finger pan handles its own cleanup
    setIsPanning(false);
    panStart.current = null;
  }, []);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    if (e.target !== containerRef.current) return;
    const rect = containerRef.current!.getBoundingClientRect();
    const position: NotePosition = {
      x: e.clientX - rect.left - viewportOffset.x - 100,
      y: e.clientY - rect.top - viewportOffset.y - 100,
    };
    onCreateNote(position, 'text');
  }, [viewportOffset, onCreateNote]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden cursor-grab active:cursor-grabbing touch-none"
      style={{
        backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.04) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
        backgroundPosition: `${viewportOffset.x % 24}px ${viewportOffset.y % 24}px`,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onDoubleClick={handleDoubleClick}
    >
      <AnimatePresence>
        {notes.map((note) => (
          <StickyNote
            key={note.id}
            note={note}
            viewportOffset={viewportOffset}
            onMove={(pos) => onNoteMove(note.id, pos)}
            onSave={(params) => onNoteSave(note.id, params)}
            onDelete={() => onNoteDelete(note.id)}
            onResize={(size) => onNoteResize(note.id, size)}
            onColorChange={(color) => onNoteColorChange(note.id, color)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

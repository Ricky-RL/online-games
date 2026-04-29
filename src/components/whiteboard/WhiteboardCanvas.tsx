'use client';

import { useState, useRef, useCallback } from 'react';
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

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.target !== containerRef.current) return;
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
    const dx = e.clientX - panStart.current.pointerX;
    const dy = e.clientY - panStart.current.pointerY;
    setViewportOffset({
      x: panStart.current.offsetX + dx,
      y: panStart.current.offsetY + dy,
    });
  }, [isPanning]);

  const handlePointerUp = useCallback(() => {
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
      className="absolute inset-0 overflow-hidden cursor-grab active:cursor-grabbing"
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

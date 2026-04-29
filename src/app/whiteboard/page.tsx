'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useWhiteboard } from '@/hooks/useWhiteboard';
import { WhiteboardCanvas } from '@/components/whiteboard/WhiteboardCanvas';
import { Toolbar } from '@/components/whiteboard/Toolbar';
import type { NoteContentType, NotePosition } from '@/lib/whiteboard-types';
import { NOTE_COLORS } from '@/lib/whiteboard-types';

export default function WhiteboardPage() {
  const router = useRouter();
  const { notes, loading, error, createNote, updateNotePosition, updateNoteContent, updateNoteColor, updateNoteSize, deleteNote } = useWhiteboard();
  const [selectedColor, setSelectedColor] = useState<string>(NOTE_COLORS[0]);

  async function handleAddNote(type: NoteContentType) {
    const position: NotePosition = {
      x: (typeof window !== 'undefined' ? window.innerWidth / 2 : 400) - 100 + (Math.random() * 200 - 100),
      y: (typeof window !== 'undefined' ? window.innerHeight / 2 : 300) - 100 + (Math.random() * 150 - 75),
    };

    await createNote({
      contentType: type,
      position,
      color: selectedColor,
    });
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-text-secondary text-lg"
        >
          Loading whiteboard...
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen bg-background overflow-hidden">
      {/* Back button */}
      <div className="absolute top-4 left-4 z-40">
        <motion.button
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          onClick={() => router.push('/')}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface/90 backdrop-blur-sm border border-border hover:bg-surface transition-colors cursor-pointer"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M10 12L6 8l4-4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-sm font-medium text-text-primary">Back</span>
        </motion.button>
      </div>

      {/* Title */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40">
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-lg font-bold text-text-primary/70"
        >
          Whiteboard
        </motion.h1>
      </div>

      {/* Error display */}
      {error && (
        <div className="absolute top-4 right-4 z-40 px-3 py-2 rounded-lg bg-red-100 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Canvas hint when empty */}
      {notes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-center"
          >
            <p className="text-xl font-semibold text-text-secondary/40 mb-2">
              Your whiteboard is empty
            </p>
            <p className="text-sm text-text-secondary/30">
              Double-click anywhere or use the toolbar to add a note
            </p>
          </motion.div>
        </div>
      )}

      {/* Main canvas */}
      <WhiteboardCanvas
        notes={notes}
        onNoteMove={(id, pos) => updateNotePosition(id, pos)}
        onNoteSave={(id, params) => updateNoteContent(id, { textContent: params.textContent, drawingData: params.drawingData ?? undefined })}
        onNoteDelete={(id) => deleteNote(id)}
        onNoteColorChange={(id, color) => updateNoteColor(id, color)}
        onNoteResize={(id, size) => updateNoteSize(id, size)}
        onCreateNote={(pos) => {
          createNote({ contentType: 'text', position: pos, color: selectedColor });
        }}
      />

      {/* Toolbar */}
      <Toolbar
        selectedColor={selectedColor}
        onColorChange={setSelectedColor}
        onAddNote={handleAddNote}
      />
    </div>
  );
}

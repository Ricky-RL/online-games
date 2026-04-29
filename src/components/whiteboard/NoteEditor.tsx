'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { WhiteboardNote, Stroke } from '@/lib/whiteboard-types';
import { DrawingCanvas } from './DrawingCanvas';
import { ColorPicker } from './ColorPicker';

interface NoteEditorProps {
  note: WhiteboardNote;
  onSave: (params: { textContent: string; drawingData: Stroke[] | null }) => void;
  onColorChange: (color: string) => void;
  onClose: () => void;
}

export function NoteEditor({ note, onSave, onColorChange, onClose }: NoteEditorProps) {
  const [activeTab, setActiveTab] = useState<'text' | 'draw'>(
    note.drawing_data && note.drawing_data.length > 0 && !note.text_content ? 'draw' : 'text'
  );
  const [text, setText] = useState(note.text_content);
  const [strokes, setStrokes] = useState<Stroke[] | null>(note.drawing_data);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (activeTab === 'text' && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.selectionStart = textareaRef.current.value.length;
    }
  }, [activeTab]);

  function handleSave() {
    onSave({ textContent: text, drawingData: strokes });
    onClose();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      onClose();
    }
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSave();
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="rounded-2xl p-6 shadow-2xl max-w-lg w-full mx-4"
          style={{ backgroundColor: note.color }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-text-primary/60">Edit Note</span>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-black/10 transition-colors cursor-pointer"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 1l12 12M13 1L1 13" />
              </svg>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 mb-4 p-1 rounded-lg bg-black/5">
            <button
              onClick={() => setActiveTab('text')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                activeTab === 'text' ? 'bg-white/80 shadow-sm text-text-primary' : 'text-text-primary/50 hover:text-text-primary/70'
              }`}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M2 3h10M2 7h5M2 11h7" />
              </svg>
              Text
            </button>
            <button
              onClick={() => setActiveTab('draw')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                activeTab === 'draw' ? 'bg-white/80 shadow-sm text-text-primary' : 'text-text-primary/50 hover:text-text-primary/70'
              }`}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M1.5 12.5c2.5-2.5 3.5-7 5-7.5s3.5 1 3.5 2.5-1.5 3.5-4 4-3.5 0-4.5 1" strokeLinecap="round" />
              </svg>
              Draw
            </button>
          </div>

          {/* Content area */}
          {activeTab === 'text' ? (
            <div className="flex flex-col gap-3">
              <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Write something..."
                className="w-full min-h-[120px] p-3 rounded-lg bg-white/50 border border-black/10 resize-none text-text-primary placeholder:text-text-secondary/40 focus:outline-none focus:ring-2 focus:ring-black/10"
              />
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <DrawingCanvas
                initialStrokes={strokes}
                width={280}
                height={200}
                onSave={(newStrokes) => setStrokes(newStrokes)}
                onCancel={() => setActiveTab('text')}
                inline
              />
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between mt-4">
            <ColorPicker selected={note.color} onChange={onColorChange} />
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-3 py-1.5 text-sm rounded-lg border border-black/10 hover:bg-black/5 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-3 py-1.5 text-sm rounded-lg bg-text-primary text-white font-medium hover:opacity-90 transition-opacity cursor-pointer"
              >
                Save
              </button>
            </div>
          </div>
          <p className="text-xs text-text-secondary/40 text-right mt-2">
            Cmd+Enter to save
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

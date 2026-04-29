'use client';

import { motion } from 'framer-motion';
import type { NoteContentType } from '@/lib/whiteboard-types';
import { ColorPicker } from './ColorPicker';

interface ToolbarProps {
  selectedColor: string;
  onColorChange: (color: string) => void;
  onAddNote: (type: NoteContentType) => void;
}

export function Toolbar({ selectedColor, onColorChange, onAddNote }: ToolbarProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, type: 'spring', stiffness: 300, damping: 25 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-4 px-5 py-3 rounded-2xl bg-surface/95 backdrop-blur-md border border-border shadow-xl max-w-[calc(100vw-2rem)] overflow-x-auto"
    >
      <ColorPicker selected={selectedColor} onChange={onColorChange} />

      <div className="w-px h-8 bg-border shrink-0" />

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => onAddNote('text')}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-text-primary/5 hover:bg-text-primary/10 transition-colors cursor-pointer shrink-0"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M8 3v10M3 8h10" strokeLinecap="round" />
        </svg>
        <span className="text-sm font-medium text-text-primary">Add Note</span>
      </motion.button>
    </motion.div>
  );
}

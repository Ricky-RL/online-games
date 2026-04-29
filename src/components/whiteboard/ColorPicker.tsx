'use client';

import { NOTE_COLORS } from '@/lib/whiteboard-types';
import { motion } from 'framer-motion';

interface ColorPickerProps {
  selected: string;
  onChange: (color: string) => void;
}

export function ColorPicker({ selected, onChange }: ColorPickerProps) {
  return (
    <div className="flex items-center gap-2">
      {NOTE_COLORS.map((color) => (
        <motion.button
          key={color}
          onClick={() => onChange(color)}
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.95 }}
          className="w-7 h-7 rounded-full cursor-pointer relative flex items-center justify-center"
          style={{
            backgroundColor: color,
            boxShadow: selected === color
              ? '0 0 0 2.5px #fff, 0 0 0 4.5px #333'
              : '0 0 0 1px rgba(0,0,0,0.12)',
          }}
        >
          {selected === color && (
            <motion.svg
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              stroke="#333"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 7.5l2.5 2.5L11 4.5" />
            </motion.svg>
          )}
        </motion.button>
      ))}
    </div>
  );
}

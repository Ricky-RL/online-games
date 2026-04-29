'use client';

import { useEffect, useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { useColors } from '@/contexts/PlayerColorsContext';
import { COLOR_PRESETS, type ColorPreset } from '@/lib/colors';

interface SettingsModalProps {
  onClose: () => void;
}

export function SettingsModal({ onClose }: SettingsModalProps) {
  const { player1Color, player2Color, updateMyColor, loading } = useColors();
  const [hoveredTaken, setHoveredTaken] = useState<string | null>(null);

  const playerName = typeof window !== 'undefined'
    ? localStorage.getItem('player-name')
    : null;

  const isPlayer1 = playerName === 'Ricky';
  const myColor = isPlayer1 ? player1Color : player2Color;
  const opponentColor = isPlayer1 ? player2Color : player1Color;
  const opponentName = isPlayer1 ? 'Lilian' : 'Ricky';

  // Close on Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Prevent body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const handleColorSelect = (color: ColorPreset) => {
    if (color.hex === opponentColor || loading) return;
    updateMyColor(color.hex);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Choose your color"
    >
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />

      {/* Modal content */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 10 }}
        transition={{ duration: 0.25, ease: [0.21, 0.47, 0.32, 0.98] }}
        onClick={(e) => e.stopPropagation()}
        className="relative bg-surface border border-border rounded-3xl p-8 shadow-2xl w-full max-w-sm"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-border/50 transition-colors cursor-pointer"
          aria-label="Close settings"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-text-secondary"
          >
            <path d="M18 6L6 18" />
            <path d="M6 6l12 12" />
          </svg>
        </button>

        {/* Heading */}
        <h2 className="text-xl font-bold text-text-primary mb-6">
          Choose Your Color
        </h2>

        {/* Color grid */}
        <div className="grid grid-cols-4 gap-3">
          {COLOR_PRESETS.map((preset) => {
            const isMine = preset.hex === myColor;
            const isTaken = preset.hex === opponentColor;

            return (
              <div
                key={preset.hex}
                className="relative flex flex-col items-center gap-1.5"
                onMouseEnter={() => isTaken && setHoveredTaken(preset.hex)}
                onMouseLeave={() => setHoveredTaken(null)}
              >
                <motion.button
                  whileHover={!isTaken ? { scale: 1.1 } : undefined}
                  whileTap={!isTaken ? { scale: 0.95 } : undefined}
                  onClick={() => handleColorSelect(preset)}
                  disabled={isTaken || loading}
                  className={`
                    relative w-12 h-12 rounded-full transition-all cursor-pointer
                    ${isMine ? 'ring-3 ring-offset-2 ring-text-primary/30' : ''}
                    ${isTaken ? 'cursor-not-allowed opacity-40 grayscale' : 'hover:shadow-lg'}
                  `}
                  style={{ backgroundColor: preset.hex }}
                  aria-label={`${preset.name}${isMine ? ' (selected)' : ''}${isTaken ? ` (taken by ${opponentName})` : ''}`}
                >
                  {/* Checkmark for selected color */}
                  {isMine && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                      className="absolute inset-0 flex items-center justify-center"
                    >
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="white"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </motion.div>
                  )}

                  {/* Slash-through for taken color */}
                  {isTaken && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div
                        className="w-10 h-0.5 bg-text-primary/60 rotate-[-45deg] rounded-full"
                      />
                    </div>
                  )}
                </motion.button>

                {/* Color name */}
                <span className={`text-[10px] font-medium ${isTaken ? 'text-text-secondary/40' : 'text-text-secondary'}`}>
                  {preset.name}
                </span>

                {/* Tooltip for taken color */}
                {isTaken && hoveredTaken === preset.hex && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-1 rounded-md bg-board text-white text-[10px] font-medium shadow-lg z-10"
                  >
                    Taken by {opponentName}
                  </motion.div>
                )}
              </div>
            );
          })}
        </div>

        {/* Loading indicator */}
        {loading && (
          <div className="mt-4 flex items-center justify-center gap-2 text-sm text-text-secondary">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-4 h-4 border-2 border-border border-t-text-primary rounded-full"
            />
            <span>Saving...</span>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

'use client';

import { motion } from 'framer-motion';

interface CellProps {
  state: 'water' | 'ship' | 'hit' | 'miss' | 'sunk';
  onClick?: () => void;
  disabled?: boolean;
  isNew?: boolean;
  size?: 'sm' | 'md';
}

const sizeClasses = {
  sm: 'w-8 h-8 sm:w-10 sm:h-10',
  md: 'w-10 h-10 sm:w-12 sm:h-12',
};

export function Cell({
  state,
  onClick,
  disabled = false,
  isNew = false,
  size = 'md',
}: CellProps) {
  const isClickable = state === 'water' && onClick && !disabled;

  const baseClasses = `${sizeClasses[size]} rounded-sm relative flex items-center justify-center transition-colors`;

  const stateClasses: Record<CellProps['state'], string> = {
    water: isClickable
      ? 'bg-slate-700 hover:bg-slate-600 cursor-crosshair'
      : 'bg-slate-800',
    ship: 'bg-slate-600 border border-slate-500',
    hit: 'bg-red-600',
    miss: 'bg-slate-800',
    sunk: 'bg-red-900',
  };

  // Read-only cell (player board)
  if (!onClick || disabled) {
    return (
      <motion.div
        className={`${baseClasses} ${stateClasses[state]}`}
        initial={isNew ? { scale: 0.5, opacity: 0 } : false}
        animate={
          isNew && state === 'hit'
            ? { scale: [1, 1.3, 1], opacity: 1 }
            : isNew && state === 'miss'
              ? { scale: [0.5, 1.1, 1], opacity: 1 }
              : { scale: 1, opacity: 1 }
        }
        transition={
          isNew
            ? { type: 'spring', stiffness: 200, damping: 12 }
            : { duration: 0 }
        }
      >
        <CellContent state={state} isNew={isNew} />
      </motion.div>
    );
  }

  // Clickable cell (tracking board)
  return (
    <motion.button
      type="button"
      className={`${baseClasses} ${stateClasses[state]}`}
      onClick={isClickable ? onClick : undefined}
      disabled={!isClickable}
      whileHover={isClickable ? { scale: 1.05 } : undefined}
      whileTap={isClickable ? { scale: 0.95 } : undefined}
      initial={isNew ? { scale: 0.5, opacity: 0 } : false}
      animate={
        isNew && state === 'hit'
          ? { scale: [1, 1.3, 1], opacity: 1 }
          : isNew && state === 'miss'
            ? { scale: [0.5, 1.1, 1], opacity: 1 }
            : { scale: 1, opacity: 1 }
      }
      transition={
        isNew
          ? { type: 'spring', stiffness: 200, damping: 12 }
          : { duration: 0 }
      }
    >
      <CellContent state={state} isNew={isNew} />
    </motion.button>
  );
}

function CellContent({ state, isNew }: { state: CellProps['state']; isNew: boolean }) {
  switch (state) {
    case 'hit':
      return (
        <motion.div
          className="w-3/4 h-3/4 rounded-full bg-orange-400"
          animate={{
            boxShadow: [
              '0 0 4px 1px rgba(251, 146, 60, 0.4)',
              '0 0 8px 3px rgba(251, 146, 60, 0.7)',
              '0 0 4px 1px rgba(251, 146, 60, 0.4)',
            ],
          }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        />
      );
    case 'miss':
      return (
        <motion.div
          className="w-2.5 h-2.5 rounded-full bg-slate-400"
          initial={isNew ? { opacity: 0, scale: 0.5 } : false}
          animate={{ opacity: 0.7, scale: 1 }}
          transition={{ duration: 0.2 }}
        />
      );
    case 'sunk':
      return (
        <svg
          className="w-4 h-4 text-red-300"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        >
          <line x1="4" y1="4" x2="20" y2="20" />
          <line x1="20" y1="4" x2="4" y2="20" />
        </svg>
      );
    default:
      return null;
  }
}

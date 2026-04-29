'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface DiceRollProps {
  lastRoll: { player: 1 | 2; value: number } | null;
  isMyTurn: boolean;
  onRoll: () => Promise<void>;
  disabled: boolean;
}

function DiceFace({ value }: { value: number }) {
  const dotPositions: Record<number, [number, number][]> = {
    1: [[50, 50]],
    2: [[25, 25], [75, 75]],
    3: [[25, 25], [50, 50], [75, 75]],
    4: [[25, 25], [75, 25], [25, 75], [75, 75]],
    5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
    6: [[25, 25], [75, 25], [25, 50], [75, 50], [25, 75], [75, 75]],
  };

  const dots = dotPositions[value] || [];

  return (
    <div className="w-16 h-16 bg-white rounded-xl border-2 border-border shadow-lg flex items-center justify-center">
      <svg width="48" height="48" viewBox="0 0 100 100">
        {dots.map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r="8" fill="#1a1a1a" />
        ))}
      </svg>
    </div>
  );
}

export function DiceRoll({ lastRoll, isMyTurn, onRoll, disabled }: DiceRollProps) {
  const [rolling, setRolling] = useState(false);
  const animKeyRef = useRef(0);
  const prevRollRef = useRef(lastRoll);

  useEffect(() => {
    if (lastRoll !== prevRollRef.current) {
      animKeyRef.current += 1;
      prevRollRef.current = lastRoll;
    }
  }, [lastRoll]);

  const handleRoll = async () => {
    setRolling(true);
    await onRoll();
    setTimeout(() => setRolling(false), 300);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Dice display */}
      <AnimatePresence mode="wait">
        {lastRoll ? (
          <motion.div
            key={`roll-${animKeyRef.current}`}
            initial={{ rotateZ: -20, scale: 0.8 }}
            animate={{ rotateZ: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 15 }}
          >
            <DiceFace value={lastRoll.value} />
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="w-16 h-16 bg-surface rounded-xl border-2 border-dashed border-border flex items-center justify-center">
              <span className="text-text-secondary/40 text-xl">?</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Extra turn indicator */}
      {lastRoll?.value === 6 && isMyTurn && (
        <motion.span
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm font-semibold text-[#538D4E]"
        >
          Extra turn!
        </motion.span>
      )}

      {/* Roll button */}
      <button
        onClick={handleRoll}
        disabled={!isMyTurn || disabled || rolling}
        className="px-6 py-3 text-sm font-semibold rounded-xl bg-text-primary text-background hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
      >
        {rolling ? 'Rolling...' : isMyTurn ? 'Roll Dice' : 'Waiting...'}
      </button>
    </div>
  );
}

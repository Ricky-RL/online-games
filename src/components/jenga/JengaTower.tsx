'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { JengaBlockComponent } from './JengaBlockComponent';
import type { JengaGameState } from '@/lib/types';
import { calculateBlockRisk, getPlayableBlocks } from '@/lib/jenga-logic';

interface JengaTowerProps {
  state: JengaGameState;
  isMyTurn: boolean;
  selectedBlock: [number, number] | null;
  onBlockClick: (row: number, col: number) => void;
  disabled: boolean;
}

const ROTATIONS = [0, 90, 180, 270] as const;

export function JengaTower({ state, isMyTurn, selectedBlock, onBlockClick, disabled }: JengaTowerProps) {
  const [rotationIdx, setRotationIdx] = useState(0);
  const rotation = ROTATIONS[rotationIdx];

  const playableBlocks = isMyTurn && !disabled ? getPlayableBlocks(state) : [];
  const playableSet = new Set(playableBlocks.map(([r, c]) => `${r}-${c}`));

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Tower container with isometric perspective */}
      <div
        className="relative"
        style={{
          perspective: '800px',
          perspectiveOrigin: '50% 40%',
        }}
      >
        <motion.div
          animate={{ rotateY: rotation }}
          transition={{ type: 'spring', stiffness: 100, damping: 20 }}
          className="flex flex-col-reverse items-center gap-[2px]"
          style={{
            transformStyle: 'preserve-3d',
            transform: `rotateX(15deg) rotateY(${rotation}deg)`,
          }}
        >
          {state.tower.map((row, rowIdx) => {
            const orientation = rowIdx % 2 === 0 ? 'horizontal' : 'vertical';
            return (
              <div
                key={rowIdx}
                className={`flex items-center justify-center gap-[2px] ${
                  orientation === 'horizontal' ? 'flex-row' : 'flex-col'
                }`}
              >
                {row.map((block, colIdx) => (
                  <JengaBlockComponent
                    key={block.id}
                    row={rowIdx}
                    col={colIdx}
                    exists={block.exists}
                    risk={calculateBlockRisk(state, rowIdx, colIdx)}
                    isPlayable={playableSet.has(`${rowIdx}-${colIdx}`)}
                    isSelected={selectedBlock?.[0] === rowIdx && selectedBlock?.[1] === colIdx}
                    orientation={orientation}
                    onClick={() => onBlockClick(rowIdx, colIdx)}
                  />
                ))}
              </div>
            );
          })}
        </motion.div>
      </div>

      {/* Rotation controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setRotationIdx((i) => (i + 3) % 4)}
          className="px-3 py-1.5 text-sm font-medium rounded-lg border border-border bg-surface text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
        >
          ← Rotate
        </button>
        <button
          onClick={() => setRotationIdx((i) => (i + 1) % 4)}
          className="px-3 py-1.5 text-sm font-medium rounded-lg border border-border bg-surface text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
        >
          Rotate →
        </button>
      </div>
    </div>
  );
}

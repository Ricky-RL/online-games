'use client';

import { useRef, useState, useCallback } from 'react';
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

export function JengaTower({ state, isMyTurn, selectedBlock, onBlockClick, disabled }: JengaTowerProps) {
  const [rotationY, setRotationY] = useState(-25);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef<{ x: number; startRotation: number } | null>(null);

  const playableBlocks = isMyTurn && !disabled ? getPlayableBlocks(state) : [];
  const playableSet = new Set(playableBlocks.map(([r, c]) => `${r}-${c}`));

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button[data-block]')) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX, startRotation: rotationY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, [rotationY]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging || !dragStart.current) return;
    const dx = e.clientX - dragStart.current.x;
    setRotationY(dragStart.current.startRotation + dx * 0.5);
  }, [isDragging]);

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
    dragStart.current = null;
  }, []);

  // Real Jenga proportions: block is 3x longer than it is wide
  // A layer of 3 blocks side-by-side = a square footprint
  const BLOCK_LENGTH = 48;   // long dimension of a block
  const BLOCK_WIDTH = 16;    // short dimension (width/depth)
  const BLOCK_HEIGHT = 12;   // thickness
  const GAP = 1;
  const ROW_HEIGHT = BLOCK_HEIGHT + 1;
  const towerRows = state.tower.length;

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        className="relative select-none"
        style={{
          perspective: '600px',
          perspectiveOrigin: '50% 40%',
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <motion.div
          animate={{ rotateY: rotationY }}
          transition={isDragging ? { duration: 0 } : { type: 'spring', stiffness: 100, damping: 20 }}
          style={{
            transformStyle: 'preserve-3d',
            transform: `rotateX(12deg) rotateY(${rotationY}deg)`,
            position: 'relative',
            width: `${BLOCK_LENGTH * 3 + GAP * 2 + 60}px`,
            height: `${towerRows * ROW_HEIGHT + 60}px`,
          }}
        >
          {state.tower.map((row, rowIdx) => {
            const isPerp = rowIdx % 2 === 1;
            const yOffset = (towerRows - 1 - rowIdx) * ROW_HEIGHT;

            if (isPerp) {
              // Perpendicular row: blocks run front-to-back (Z axis)
              // Visible from front: you see the short end (BLOCK_WIDTH wide)
              // 3 blocks side by side showing their ends = 3 * BLOCK_WIDTH wide
              return (
                <div
                  key={rowIdx}
                  style={{
                    position: 'absolute',
                    bottom: `${yOffset}px`,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    transformStyle: 'preserve-3d',
                    display: 'flex',
                    justifyContent: 'center',
                    gap: `${GAP}px`,
                  }}
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
                      blockWidth={BLOCK_WIDTH}
                      blockHeight={BLOCK_HEIGHT}
                      blockDepth={BLOCK_LENGTH}
                      onClick={() => onBlockClick(rowIdx, colIdx)}
                    />
                  ))}
                </div>
              );
            }

            // Normal row: blocks run left-to-right (X axis)
            // Visible from front: you see the long face (BLOCK_LENGTH wide)
            return (
              <div
                key={rowIdx}
                style={{
                  position: 'absolute',
                  bottom: `${yOffset}px`,
                  left: '50%',
                  transformStyle: 'preserve-3d',
                  transform: `translateX(-50%)`,
                  display: 'flex',
                  justifyContent: 'center',
                  gap: `${GAP}px`,
                }}
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
                    blockWidth={BLOCK_LENGTH}
                    blockHeight={BLOCK_HEIGHT}
                    blockDepth={BLOCK_WIDTH}
                    onClick={() => onBlockClick(rowIdx, colIdx)}
                  />
                ))}
              </div>
            );
          })}
        </motion.div>
      </div>

      <p className="text-xs text-text-secondary">Drag to rotate</p>
    </div>
  );
}

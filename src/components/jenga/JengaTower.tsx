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
  const [rotationY, setRotationY] = useState(-35);
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

  const BLOCK_WIDTH = 24;
  const BLOCK_LENGTH = 72;
  const BLOCK_HEIGHT = 16;
  const GAP = 1;
  const ROW_HEIGHT = BLOCK_HEIGHT + GAP;
  const towerRows = state.tower.length;
  const ROW_WIDTH = BLOCK_WIDTH * 3 + GAP * 2;

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        className="relative select-none"
        style={{
          perspective: '800px',
          perspectiveOrigin: '50% 35%',
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
            transform: `rotateX(18deg) rotateY(${rotationY}deg)`,
            position: 'relative',
            width: `${ROW_WIDTH + 80}px`,
            height: `${towerRows * ROW_HEIGHT + 60}px`,
          }}
        >
          {state.tower.map((row, rowIdx) => {
            const isPerp = rowIdx % 2 === 1;
            const yOffset = (towerRows - 1 - rowIdx) * ROW_HEIGHT;

            // Both layers show 3 blocks side-by-side in a flex row.
            // The alternating direction is conveyed by rotating the entire row
            // 90 degrees around Y in 3D space. This way, when the tower is viewed
            // with perspective/rotation, you see the cross-hatch pattern.
            //
            // Even rows: blocks run left-right (no extra rotation)
            //   - Blocks show their NARROW end (BLOCK_WIDTH) side-by-side
            //   - Block depth = BLOCK_LENGTH (going into screen)
            //
            // Odd rows: blocks run front-back (row rotated 90deg Y)
            //   - Same block arrangement but rotated, so they appear perpendicular
            //   - Blocks show their NARROW end (BLOCK_WIDTH) side-by-side
            //   - Block depth = BLOCK_LENGTH (now going left-right due to rotation)

            return (
              <div
                key={rowIdx}
                style={{
                  position: 'absolute',
                  bottom: `${yOffset}px`,
                  left: '50%',
                  transform: `translateX(-50%)${isPerp ? ' rotateY(90deg)' : ''}`,
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
          })}
        </motion.div>
      </div>

      <p className="text-xs text-text-secondary">Drag to rotate</p>
    </div>
  );
}

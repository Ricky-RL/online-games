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

  const BLOCK_W = 54;
  const BLOCK_H = 14;
  const BLOCK_D = 18;
  const GAP = 0;
  const ROW_HEIGHT = BLOCK_H + 1;
  const towerRows = state.tower.length;
  const towerWidth = BLOCK_W * 3 + GAP * 2;

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        className="relative select-none"
        style={{
          perspective: '800px',
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
            transform: `rotateX(15deg) rotateY(${rotationY}deg)`,
            position: 'relative',
            width: `${towerWidth + 40}px`,
            height: `${towerRows * ROW_HEIGHT + 40}px`,
          }}
        >
          {state.tower.map((row, rowIdx) => {
            const isPerp = rowIdx % 2 === 1;
            const yOffset = (towerRows - 1 - rowIdx) * ROW_HEIGHT;

            if (isPerp) {
              return (
                <div
                  key={rowIdx}
                  style={{
                    position: 'absolute',
                    bottom: `${yOffset}px`,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    transformStyle: 'preserve-3d',
                    width: `${BLOCK_W}px`,
                    height: `${BLOCK_H}px`,
                  }}
                >
                  {row.map((block, colIdx) => {
                    const zOffset = (colIdx - 1) * (BLOCK_D + GAP);
                    return (
                      <div
                        key={block.id}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          transformStyle: 'preserve-3d',
                          transform: `translateZ(${zOffset}px)`,
                        }}
                      >
                        <JengaBlockComponent
                          row={rowIdx}
                          col={colIdx}
                          exists={block.exists}
                          risk={calculateBlockRisk(state, rowIdx, colIdx)}
                          isPlayable={playableSet.has(`${rowIdx}-${colIdx}`)}
                          isSelected={selectedBlock?.[0] === rowIdx && selectedBlock?.[1] === colIdx}
                          blockWidth={BLOCK_W}
                          blockHeight={BLOCK_H}
                          blockDepth={BLOCK_D}
                          onClick={() => onBlockClick(rowIdx, colIdx)}
                        />
                      </div>
                    );
                  })}
                </div>
              );
            }

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
                    blockWidth={BLOCK_W}
                    blockHeight={BLOCK_H}
                    blockDepth={BLOCK_D}
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

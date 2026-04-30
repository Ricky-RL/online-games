'use client';

import { useRef, useState, useCallback } from 'react';
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
  const [rotationY, setRotationY] = useState(-45);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef<{ x: number; startRotation: number } | null>(null);

  const playableBlocks = isMyTurn && !disabled ? getPlayableBlocks(state) : [];
  const playableSet = new Set(playableBlocks.map(([r, c]) => `${r}-${c}`));

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button[data-block]')) return;
    e.preventDefault();
    setIsDragging(true);
    dragStart.current = { x: e.clientX, startRotation: rotationY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, [rotationY]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging || !dragStart.current) return;
    e.preventDefault();
    const dx = e.clientX - dragStart.current.x;
    setRotationY(dragStart.current.startRotation + dx * 0.5);
  }, [isDragging]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    setIsDragging(false);
    dragStart.current = null;
  }, [isDragging]);

  const BLOCK_WIDTH = 24;
  const BLOCK_DEPTH = 72;
  const BLOCK_HEIGHT = 14;
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
          perspectiveOrigin: '50% 30%',
          cursor: isDragging ? 'grabbing' : 'grab',
          touchAction: 'none',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div
          style={{
            transformStyle: 'preserve-3d',
            transform: `rotateX(30deg) rotateY(${rotationY}deg)`,
            transition: isDragging ? 'none' : 'transform 0.3s ease-out',
            position: 'relative',
            width: `${ROW_WIDTH + 80}px`,
            height: `${towerRows * ROW_HEIGHT + 60}px`,
          }}
        >
          {state.tower.map((row, rowIdx) => {
            const isPerp = rowIdx % 2 === 1;
            const yOffset = (towerRows - 1 - rowIdx) * ROW_HEIGHT;

            // Both layers show 3 blocks side-by-side in a flex row.
            // Even rows: blocks run left-right (long face visible, 72px wide x 24px deep)
            // Odd rows: rotated 90deg Y so blocks run front-back (cross-hatch)

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
                    blockDepth={BLOCK_DEPTH}
                    onClick={() => onBlockClick(rowIdx, colIdx)}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-xs text-text-secondary">Drag to rotate</p>
    </div>
  );
}

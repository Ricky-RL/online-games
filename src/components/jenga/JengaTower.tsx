'use client';

import { useMemo, useRef, useCallback } from 'react';
import type { JengaGameState, Point } from '@/lib/types';
import { calculateBlockRisk, getPlayableBlocks, getPlayableBlocksAboveThreshold } from '@/lib/jenga-logic';

interface JengaTowerProps {
  state: JengaGameState;
  isMyTurn: boolean;
  selectedBlock: [number, number] | null;
  pullingBlock: [number, number] | null;
  onBlockClick: (row: number, col: number) => void;
  disabled: boolean;
  riskThreshold?: number;
  flashingBlocks?: string[];
  onDragStart?: (row: number, col: number) => void;
  onDragMove?: (point: Point) => void;
  onDragEnd?: () => void;
}

function riskColor(risk: number): { top: string; front: string; side: string } {
  if (risk < 15) return { top: '#f0dbb8', front: '#c9935e', side: '#9e6d3a' };
  if (risk < 30) return { top: '#ecd39e', front: '#be8035', side: '#8f5f28' };
  if (risk < 50) return { top: '#f7d26a', front: '#cc8a20', side: '#9a6818' };
  return { top: '#f09080', front: '#c04030', side: '#8a2818' };
}

export function JengaTower({ state, isMyTurn, selectedBlock, pullingBlock, onBlockClick, disabled, riskThreshold, flashingBlocks, onDragStart, onDragMove, onDragEnd }: JengaTowerProps) {
  const playableBlocks = isMyTurn && !disabled
    ? (riskThreshold != null
        ? getPlayableBlocksAboveThreshold(state, riskThreshold)
        : getPlayableBlocks(state))
    : [];
  const playableSet = new Set(playableBlocks.map(([r, c]) => `${r}-${c}`));
  const flashSet = useMemo(() => new Set(flashingBlocks ?? []), [flashingBlocks]);

  const BLOCK_FACE_H = 18;
  const BLOCK_TOP_H = 7;
  const ROW_HEIGHT = BLOCK_FACE_H + BLOCK_TOP_H + 1;

  const WIDE_W = 36;
  const NARROW_W = 20;
  const BLOCK_GAP = 2;

  const towerRows = state.tower.length;
  const towerPixelH = towerRows * ROW_HEIGHT + 50;
  const towerPixelW = 180;

  // Drag state
  const isDragging = useRef(false);
  const dragBlockRef = useRef<[number, number] | null>(null);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = useCallback((row: number, col: number, e: React.PointerEvent) => {
    // Only start drag on selected block
    if (!selectedBlock || selectedBlock[0] !== row || selectedBlock[1] !== col) return;
    if (!onDragStart) return;

    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    // Use a short hold to distinguish tap from drag (150ms)
    holdTimerRef.current = setTimeout(() => {
      isDragging.current = true;
      dragBlockRef.current = [row, col];
      onDragStart(row, col);
    }, 150);
  }, [selectedBlock, onDragStart]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current || !onDragMove || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const point: Point = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    onDragMove(point);

    // Mobile haptics when deviation is high — the parent computes deviation
    // and triggers haptics via the hook. We do a simple vibration pulse here
    // as a fallback when the user pointer moves far from block center.
  }, [onDragMove]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (isDragging.current) {
      isDragging.current = false;
      dragBlockRef.current = null;
      onDragEnd?.();
      e.preventDefault();
    }
  }, [onDragEnd]);

  const blocks = useMemo(() => {
    const result: Array<{
      rowIdx: number;
      colIdx: number;
      x: number;
      y: number;
      w: number;
      isPerp: boolean;
      risk: number;
      exists: boolean;
      id: string;
    }> = [];

    for (let rowIdx = 0; rowIdx < state.tower.length; rowIdx++) {
      const row = state.tower[rowIdx];
      const isPerp = rowIdx % 2 === 1;
      const blockW = isPerp ? NARROW_W : WIDE_W;
      const totalRowW = 3 * blockW + 2 * BLOCK_GAP;
      const startX = (towerPixelW - totalRowW) / 2;
      const y = towerPixelH - 40 - (rowIdx + 1) * ROW_HEIGHT;

      for (let colIdx = 0; colIdx < row.length; colIdx++) {
        const block = row[colIdx];
        result.push({
          rowIdx,
          colIdx,
          x: startX + colIdx * (blockW + BLOCK_GAP),
          y,
          w: blockW,
          isPerp,
          risk: calculateBlockRisk(state, rowIdx, colIdx),
          exists: block.exists,
          id: block.id,
        });
      }
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, towerPixelH, towerPixelW]);

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        ref={containerRef}
        className="relative select-none touch-none"
        style={{ width: `${towerPixelW}px`, height: `${towerPixelH}px` }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* Base platform */}
        <div
          className="absolute"
          style={{
            bottom: '8px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '130px',
            height: '12px',
            background: 'linear-gradient(to bottom, #7a6040, #5a4530)',
            borderRadius: '2px',
            boxShadow: '0 3px 6px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.1)',
          }}
        />

        {blocks.map((b) => {
          if (!b.exists) return null;

          const colors = riskColor(b.risk);
          const isPlayable = playableSet.has(`${b.rowIdx}-${b.colIdx}`);
          const isSelected = selectedBlock?.[0] === b.rowIdx && selectedBlock?.[1] === b.colIdx;
          const isPulling = pullingBlock?.[0] === b.rowIdx && pullingBlock?.[1] === b.colIdx;
          const isFlashing = flashSet.has(`${b.rowIdx}-${b.colIdx}`);

          return (
            <button
              key={b.id}
              data-block
              data-row={b.rowIdx}
              data-col={b.colIdx}
              aria-label={`Block row ${b.rowIdx + 1}, column ${b.colIdx + 1}${isPlayable ? `, ${b.risk}% risk` : ''}`}
              onClick={isPlayable ? () => onBlockClick(b.rowIdx, b.colIdx) : undefined}
              onPointerDown={isSelected ? (e) => handlePointerDown(b.rowIdx, b.colIdx, e) : undefined}
              className="absolute group"
              style={{
                left: `${b.x}px`,
                top: `${b.y}px`,
                width: `${b.w}px`,
                height: `${BLOCK_FACE_H + BLOCK_TOP_H}px`,
                cursor: isPlayable ? 'pointer' : 'default',
                transition: 'transform 0.15s ease, opacity 0.3s ease',
                opacity: isPulling ? 0 : (isMyTurn && !disabled && !isPlayable ? 0.45 : 1),
                transform: isPulling ? 'scale(0.8) translateY(-8px)' : undefined,
              }}
            >
              {/* Top face - lighter, gives depth */}
              <div
                className="absolute left-0 top-0"
                style={{
                  width: `${b.w}px`,
                  height: `${BLOCK_TOP_H}px`,
                  background: `linear-gradient(180deg, ${colors.top}, ${adjustBrightness(colors.top, -10)})`,
                  borderTopLeftRadius: '2px',
                  borderTopRightRadius: '2px',
                  borderLeft: '1px solid rgba(0,0,0,0.05)',
                  borderTop: '1px solid rgba(0,0,0,0.03)',
                  borderRight: '1px solid rgba(0,0,0,0.07)',
                }}
              />

              {/* Front face */}
              <div
                className="absolute left-0"
                style={{
                  top: `${BLOCK_TOP_H}px`,
                  width: `${b.w}px`,
                  height: `${BLOCK_FACE_H}px`,
                  background: b.isPerp
                    ? `linear-gradient(90deg, ${adjustBrightness(colors.front, -5)}, ${colors.front} 30%, ${colors.front} 70%, ${adjustBrightness(colors.front, -5)})`
                    : `linear-gradient(180deg, ${colors.front}, ${adjustBrightness(colors.front, -12)})`,
                  borderBottomLeftRadius: '2px',
                  borderBottomRightRadius: '2px',
                  borderLeft: `1px solid rgba(0,0,0,0.1)`,
                  borderRight: `1px solid rgba(0,0,0,0.12)`,
                  borderBottom: `1px solid rgba(0,0,0,0.15)`,
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15), 0 1px 2px rgba(0,0,0,0.08)',
                }}
              />

              {/* Subtle wood grain for wide (non-perp) blocks */}
              {!b.isPerp && (
                <>
                  <div className="absolute pointer-events-none" style={{
                    top: `${BLOCK_TOP_H + 5}px`, left: '4px', right: '4px', height: '1px',
                    background: 'rgba(0,0,0,0.04)', borderRadius: '1px',
                  }} />
                  <div className="absolute pointer-events-none" style={{
                    top: `${BLOCK_TOP_H + 11}px`, left: '6px', right: '5px', height: '1px',
                    background: 'rgba(0,0,0,0.03)', borderRadius: '1px',
                  }} />
                </>
              )}

              {/* End-grain dot pattern for perpendicular blocks */}
              {b.isPerp && (
                <div className="absolute pointer-events-none" style={{
                  top: `${BLOCK_TOP_H + 6}px`, left: '50%', transform: 'translateX(-50%)',
                  width: '4px', height: '4px', borderRadius: '50%',
                  border: '1px solid rgba(0,0,0,0.06)',
                }} />
              )}

              {/* Selection highlight */}
              {isSelected && (
                <div
                  className="absolute inset-0 rounded-[2px] z-10 pointer-events-none"
                  style={{
                    boxShadow: '0 0 0 2px #fff, 0 0 14px 3px rgba(255,255,255,0.5), inset 0 0 4px rgba(255,255,255,0.3)',
                  }}
                />
              )}

              {/* Playable hover highlight */}
              {isPlayable && !isSelected && (
                <div className="absolute inset-0 rounded-[2px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                  style={{
                    boxShadow: '0 0 0 1.5px rgba(245,180,50,0.7), 0 0 8px rgba(245,180,50,0.25)',
                  }}
                />
              )}

              {/* Risk tooltip on selection */}
              {isSelected && (
                <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-white bg-black/85 px-2 py-0.5 rounded-md whitespace-nowrap z-20 shadow-lg">
                  {b.risk}% risk
                </span>
              )}

              {/* Cascade flash animation */}
              {isFlashing && (
                <div
                  className="absolute inset-0 rounded-[2px] pointer-events-none z-10 animate-[cascade-flash_0.4s_ease-out_forwards]"
                  style={{
                    background: 'rgba(250, 204, 21, 0.6)',
                  }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function adjustBrightness(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, ((num >> 16) & 0xff) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount));
  const b = Math.min(255, Math.max(0, (num & 0xff) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

'use client';

import { motion } from 'framer-motion';

interface JengaBlockComponentProps {
  row: number;
  col: number;
  exists: boolean;
  risk: number;
  isPlayable: boolean;
  isSelected: boolean;
  blockWidth: number;
  blockHeight: number;
  blockDepth: number;
  onClick: () => void;
}

function woodColor(risk: number): { front: string; side: string; top: string; dark: string } {
  if (risk < 15) return { front: '#d4a574', side: '#b08050', top: '#e8c9a0', dark: '#8a6038' };
  if (risk < 30) return { front: '#c99a5f', side: '#a06b38', top: '#e0ba85', dark: '#7a5528' };
  if (risk < 50) return { front: '#e8a849', side: '#b87a28', top: '#f5c96e', dark: '#8a5a18' };
  return { front: '#d45a3a', side: '#a03020', top: '#e87060', dark: '#702018' };
}

export function JengaBlockComponent({
  exists,
  risk,
  isPlayable,
  isSelected,
  blockWidth,
  blockHeight,
  blockDepth,
  onClick,
}: JengaBlockComponentProps) {
  if (!exists) {
    return <div style={{ width: `${blockWidth}px`, height: `${blockHeight}px` }} />;
  }

  const colors = woodColor(risk);
  const halfDepth = blockDepth / 2;
  const halfWidth = blockWidth / 2;
  const halfHeight = blockHeight / 2;

  return (
    <motion.button
      data-block
      onClick={isPlayable ? onClick : undefined}
      className="relative"
      style={{
        width: `${blockWidth}px`,
        height: `${blockHeight}px`,
        transformStyle: 'preserve-3d',
        cursor: isPlayable ? 'pointer' : 'default',
      }}
      whileHover={isPlayable ? { z: 6, transition: { duration: 0.15 } } : undefined}
    >
      {/* Front face */}
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: colors.front,
          transform: `translateZ(${halfDepth}px)`,
          border: isSelected ? '2px solid #fff' : '1px solid rgba(0,0,0,0.12)',
          boxShadow: isSelected
            ? '0 0 10px rgba(255,255,255,0.7)'
            : 'inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -1px 0 rgba(0,0,0,0.1)',
          borderRadius: '1px',
        }}
      />
      {/* Back face */}
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: colors.dark,
          transform: `translateZ(-${halfDepth}px) rotateY(180deg)`,
          borderRadius: '1px',
        }}
      />
      {/* Top face */}
      <div
        className="absolute left-0"
        style={{
          width: `${blockWidth}px`,
          height: `${blockDepth}px`,
          backgroundColor: colors.top,
          transform: `rotateX(90deg) translateZ(${halfHeight}px)`,
          transformOrigin: 'center center',
          borderRadius: '1px',
          border: '1px solid rgba(0,0,0,0.06)',
          boxShadow: 'inset 0 0 4px rgba(255,255,255,0.3)',
        }}
      />
      {/* Bottom face */}
      <div
        className="absolute left-0"
        style={{
          width: `${blockWidth}px`,
          height: `${blockDepth}px`,
          backgroundColor: colors.dark,
          transform: `rotateX(-90deg) translateZ(${halfHeight}px)`,
          transformOrigin: 'center center',
          borderRadius: '1px',
        }}
      />
      {/* Right face */}
      <div
        className="absolute top-0"
        style={{
          width: `${blockDepth}px`,
          height: `${blockHeight}px`,
          backgroundColor: colors.side,
          transform: `rotateY(90deg) translateZ(${halfWidth}px)`,
          transformOrigin: 'center center',
          borderRadius: '1px',
          border: '1px solid rgba(0,0,0,0.08)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15)',
        }}
      />
      {/* Left face */}
      <div
        className="absolute top-0"
        style={{
          width: `${blockDepth}px`,
          height: `${blockHeight}px`,
          backgroundColor: colors.side,
          transform: `rotateY(-90deg) translateZ(${halfWidth}px)`,
          transformOrigin: 'center center',
          borderRadius: '1px',
          border: '1px solid rgba(0,0,0,0.08)',
        }}
      />
      {/* Risk indicator on selected */}
      {isSelected && (
        <motion.span
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-bold text-white bg-black/80 px-1.5 py-0.5 rounded whitespace-nowrap"
          style={{ transform: `translateX(-50%) translateZ(${halfDepth + 4}px)` }}
        >
          {risk}% risk
        </motion.span>
      )}
    </motion.button>
  );
}

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
  const hw = blockWidth / 2;
  const hh = blockHeight / 2;
  const hd = blockDepth / 2;

  // Each face is sized exactly to cover that side of the rectangular prism,
  // positioned at the center of the button, then translated outward by half
  // the perpendicular dimension. backface-visibility:hidden ensures we never
  // see through the back of any face.
  const faceBase: React.CSSProperties = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    backfaceVisibility: 'hidden',
    pointerEvents: 'none',
  };

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
        pointerEvents: 'auto',
      }}
      whileHover={isPlayable ? { z: 6, transition: { duration: 0.15 } } : undefined}
    >
      {/* Front face (width x height), pushed forward by half-depth */}
      <div
        style={{
          ...faceBase,
          width: `${blockWidth}px`,
          height: `${blockHeight}px`,
          marginLeft: `-${hw}px`,
          marginTop: `-${hh}px`,
          backgroundColor: colors.front,
          transform: `translateZ(${hd}px)`,
          border: isSelected ? '2px solid #fff' : '1px solid rgba(0,0,0,0.12)',
          boxShadow: isSelected
            ? '0 0 10px rgba(255,255,255,0.7)'
            : 'inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -1px 0 rgba(0,0,0,0.1)',
        }}
      />
      {/* Back face (width x height), pushed back by half-depth */}
      <div
        style={{
          ...faceBase,
          width: `${blockWidth}px`,
          height: `${blockHeight}px`,
          marginLeft: `-${hw}px`,
          marginTop: `-${hh}px`,
          backgroundColor: colors.dark,
          transform: `rotateY(180deg) translateZ(${hd}px)`,
        }}
      />
      {/* Top face (width x depth), pushed up by half-height */}
      <div
        style={{
          ...faceBase,
          width: `${blockWidth}px`,
          height: `${blockDepth}px`,
          marginLeft: `-${hw}px`,
          marginTop: `-${hd}px`,
          backgroundColor: colors.top,
          transform: `rotateX(90deg) translateZ(${hh}px)`,
          border: '1px solid rgba(0,0,0,0.06)',
          boxShadow: 'inset 0 0 4px rgba(255,255,255,0.3)',
        }}
      />
      {/* Bottom face (width x depth), pushed down by half-height */}
      <div
        style={{
          ...faceBase,
          width: `${blockWidth}px`,
          height: `${blockDepth}px`,
          marginLeft: `-${hw}px`,
          marginTop: `-${hd}px`,
          backgroundColor: colors.dark,
          transform: `rotateX(-90deg) translateZ(${hh}px)`,
        }}
      />
      {/* Right face (depth x height), pushed right by half-width */}
      <div
        style={{
          ...faceBase,
          width: `${blockDepth}px`,
          height: `${blockHeight}px`,
          marginLeft: `-${hd}px`,
          marginTop: `-${hh}px`,
          backgroundColor: colors.side,
          transform: `rotateY(90deg) translateZ(${hw}px)`,
          border: '1px solid rgba(0,0,0,0.08)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15)',
        }}
      />
      {/* Left face (depth x height), pushed left by half-width */}
      <div
        style={{
          ...faceBase,
          width: `${blockDepth}px`,
          height: `${blockHeight}px`,
          marginLeft: `-${hd}px`,
          marginTop: `-${hh}px`,
          backgroundColor: colors.side,
          transform: `rotateY(-90deg) translateZ(${hw}px)`,
          border: '1px solid rgba(0,0,0,0.08)',
        }}
      />
      {/* Risk indicator on selected */}
      {isSelected && (
        <motion.span
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-bold text-white bg-black/80 px-1.5 py-0.5 rounded whitespace-nowrap"
          style={{ transform: `translateX(-50%) translateZ(${hd + 4}px)` }}
        >
          {risk}% risk
        </motion.span>
      )}
    </motion.button>
  );
}

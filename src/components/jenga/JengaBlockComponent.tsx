'use client';

import { motion } from 'framer-motion';

interface JengaBlockComponentProps {
  row: number;
  col: number;
  exists: boolean;
  risk: number;
  isPlayable: boolean;
  isSelected: boolean;
  orientation: 'horizontal' | 'vertical';
  onClick: () => void;
}

function riskColor(risk: number): string {
  if (risk < 15) return 'bg-emerald-600';
  if (risk < 30) return 'bg-yellow-500';
  if (risk < 50) return 'bg-orange-500';
  return 'bg-red-500';
}

export function JengaBlockComponent({
  exists,
  risk,
  isPlayable,
  isSelected,
  orientation,
  onClick,
}: JengaBlockComponentProps) {
  if (!exists) {
    const emptyWidth = orientation === 'horizontal' ? 'w-[60px] h-[20px]' : 'w-[20px] h-[60px]';
    return <div className={emptyWidth} />;
  }

  const isHorizontal = orientation === 'horizontal';
  const blockWidth = isHorizontal ? 'w-[60px] h-[20px]' : 'w-[20px] h-[60px]';

  return (
    <motion.button
      onClick={isPlayable ? onClick : undefined}
      className={`
        ${blockWidth} relative rounded-sm transition-all
        ${isSelected ? 'ring-2 ring-white shadow-lg scale-105' : ''}
        ${isPlayable ? 'cursor-pointer hover:brightness-110' : 'cursor-default'}
        ${riskColor(risk)}
      `}
      whileHover={isPlayable ? { scale: 1.05 } : undefined}
      whileTap={isPlayable ? { scale: 0.95 } : undefined}
      style={{
        transformStyle: 'preserve-3d',
      }}
    >
      {/* Top face for 3D depth */}
      <div
        className="absolute inset-0 rounded-sm opacity-30 bg-white"
        style={{ clipPath: 'polygon(0 0, 100% 0, 90% 30%, 10% 30%)' }}
      />
      {/* Right face for 3D depth */}
      <div
        className="absolute inset-0 rounded-sm opacity-20 bg-black"
        style={{ clipPath: 'polygon(100% 0, 100% 100%, 90% 70%, 90% 30%)' }}
      />
      {/* Risk indicator on selected */}
      {isSelected && (
        <motion.span
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold text-white bg-black/80 px-1.5 py-0.5 rounded whitespace-nowrap"
        >
          {risk}%
        </motion.span>
      )}
    </motion.button>
  );
}

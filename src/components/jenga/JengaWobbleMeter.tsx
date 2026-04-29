'use client';

import { motion } from 'framer-motion';

interface JengaWobbleMeterProps {
  wobble: number;
}

function wobbleLabel(wobble: number): string {
  if (wobble < 15) return 'Stable';
  if (wobble < 35) return 'Wobbly';
  if (wobble < 60) return 'Shaky';
  if (wobble < 80) return 'Dangerous';
  return 'Critical';
}

function wobbleColor(wobble: number): string {
  if (wobble < 15) return 'bg-emerald-500';
  if (wobble < 35) return 'bg-yellow-500';
  if (wobble < 60) return 'bg-orange-500';
  return 'bg-red-500';
}

export function JengaWobbleMeter({ wobble }: JengaWobbleMeterProps) {
  return (
    <div className="flex items-center gap-3 w-full max-w-[200px]">
      <div className="flex-1 h-2 bg-surface rounded-full overflow-hidden border border-border">
        <motion.div
          className={`h-full rounded-full ${wobbleColor(wobble)}`}
          animate={{ width: `${wobble}%` }}
          transition={{ type: 'spring', stiffness: 80, damping: 15 }}
        />
      </div>
      <span className="text-xs font-medium text-text-secondary whitespace-nowrap">
        {wobbleLabel(wobble)}
      </span>
    </div>
  );
}

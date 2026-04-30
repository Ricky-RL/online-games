'use client';

import { LastRoll } from '@/lib/monopoly/types';

interface DiceDisplayProps {
  lastRoll: LastRoll | null;
}

export function DiceDisplay({ lastRoll }: DiceDisplayProps) {
  if (!lastRoll) return null;

  const [d1, d2] = lastRoll.dice;
  const total = d1 + d2;
  const doubles = d1 === d2;

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <div className="flex items-center gap-1.5 sm:gap-2">
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-surface border border-border flex items-center justify-center text-base sm:text-lg font-bold text-text-primary">
          {d1}
        </div>
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-surface border border-border flex items-center justify-center text-base sm:text-lg font-bold text-text-primary">
          {d2}
        </div>
      </div>
      <span className="text-xs sm:text-sm text-text-secondary">
        = {total}{doubles && ' (Doubles!)'}
      </span>
    </div>
  );
}

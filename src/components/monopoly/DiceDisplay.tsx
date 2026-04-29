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
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <div className="w-10 h-10 rounded-lg bg-surface border border-border flex items-center justify-center text-lg font-bold text-text-primary">
          {d1}
        </div>
        <div className="w-10 h-10 rounded-lg bg-surface border border-border flex items-center justify-center text-lg font-bold text-text-primary">
          {d2}
        </div>
      </div>
      <span className="text-sm text-text-secondary">
        = {total}{doubles && ' (Doubles!)'}
      </span>
    </div>
  );
}

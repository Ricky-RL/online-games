'use client';

import { getSuitSymbol, type CrazyEightsCard as CrazyEightsCardType } from '@/lib/crazy-eights-logic';

interface CrazyEightsCardProps {
  card: CrazyEightsCardType;
  selected?: boolean;
  disabled?: boolean;
  compact?: boolean;
  onClick?: () => void;
}

function suitColor(suit: CrazyEightsCardType['suit']): string {
  return suit === 'hearts' || suit === 'diamonds' ? 'text-red-600' : 'text-slate-900';
}

export function CrazyEightsCard({
  card,
  selected = false,
  disabled = false,
  compact = false,
  onClick,
}: CrazyEightsCardProps) {
  const width = compact ? 'w-14' : 'w-[4.5rem]';
  const height = compact ? 'h-20' : 'h-[6.5rem]';
  const rankSize = compact ? 'text-lg' : 'text-2xl';

  return (
    <button
      onClick={onClick}
      disabled={disabled || !onClick}
      className={`${width} ${height} rounded-xl border-2 bg-white transition-all shadow-sm ${
        selected ? 'border-board -translate-y-2 shadow-lg' : 'border-black/15'
      } ${disabled ? 'opacity-55 cursor-not-allowed' : onClick ? 'cursor-pointer hover:-translate-y-1' : ''}`}
      aria-label={`${card.rank} of ${card.suit}`}
      title={`${card.rank} of ${card.suit}`}
    >
      <div className={`w-full h-full flex flex-col items-center justify-between py-1.5 font-bold ${suitColor(card.suit)}`}>
        <div className="w-full px-1.5 flex items-center justify-between text-[10px] leading-none">
          <span>{card.rank}</span>
          <span>{getSuitSymbol(card.suit)}</span>
        </div>
        <span className={`${rankSize} leading-none`}>{card.rank}</span>
        <div className="w-full px-1.5 flex items-center justify-between text-[10px] leading-none">
          <span>{getSuitSymbol(card.suit)}</span>
          <span>{card.rank}</span>
        </div>
      </div>
    </button>
  );
}

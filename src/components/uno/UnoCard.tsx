'use client';

import type { UnoCard as UnoCardType } from '@/lib/uno-logic';

interface UnoCardProps {
  card: UnoCardType;
  selected?: boolean;
  disabled?: boolean;
  compact?: boolean;
  onClick?: () => void;
}

function cardColor(color: UnoCardType['color']): string {
  switch (color) {
    case 'red':
      return '#DC2626';
    case 'yellow':
      return '#CA8A04';
    case 'green':
      return '#16A34A';
    case 'blue':
      return '#2563EB';
    case 'wild':
      return '#111827';
  }
}

function cardText(rank: UnoCardType['rank']): string {
  switch (rank) {
    case 'draw2':
      return '+2';
    case 'wild-draw4':
      return '+4';
    case 'reverse':
      return 'REV';
    case 'skip':
      return 'SKIP';
    case 'wild':
      return 'WILD';
    default:
      return rank;
  }
}

export function UnoCard({ card, selected = false, disabled = false, compact = false, onClick }: UnoCardProps) {
  const width = compact ? 'w-14' : 'w-[4.5rem]';
  const height = compact ? 'h-20' : 'h-[6.5rem]';
  const textSize = compact ? 'text-base' : 'text-xl';

  return (
    <button
      onClick={onClick}
      disabled={disabled || !onClick}
      className={`${width} ${height} rounded-xl border-2 transition-all shadow-sm ${
        selected ? 'border-white -translate-y-2 shadow-lg' : 'border-black/20'
      } ${disabled ? 'opacity-55 cursor-not-allowed' : onClick ? 'cursor-pointer hover:-translate-y-1' : ''}`}
      style={{ backgroundColor: cardColor(card.color) }}
      aria-label={`${card.color} ${card.rank}`}
      title={`${card.color} ${card.rank}`}
    >
      <div className="w-full h-full flex flex-col items-center justify-between py-2 text-white font-black">
        <span className="text-[10px] leading-none uppercase tracking-wide">{card.color === 'wild' ? 'W' : card.color[0]}</span>
        <span className={`${textSize} leading-none`}>{cardText(card.rank)}</span>
        <span className="text-[10px] leading-none uppercase tracking-wide">{card.color === 'wild' ? 'W' : card.color[0]}</span>
      </div>
    </button>
  );
}

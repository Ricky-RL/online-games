'use client';

import { motion } from 'framer-motion';
import { getCardLabel, type BigTwoCard } from '@/lib/big-2-logic';

interface Big2CardProps {
  card: BigTwoCard;
  selected?: boolean;
  disabled?: boolean;
  compact?: boolean;
  onClick?: () => void;
}

function isRed(card: BigTwoCard): boolean {
  return card.suit === 'H' || card.suit === 'D';
}

export function Big2Card({ card, selected = false, disabled = false, compact = false, onClick }: Big2CardProps) {
  const content = (
    <motion.div
      animate={{ y: selected ? -10 : 0, scale: selected ? 1.03 : 1 }}
      transition={{ type: 'spring', stiffness: 320, damping: 22 }}
      className={`relative flex flex-col justify-between rounded-lg border bg-white shadow-sm ${
        compact ? 'h-16 w-11 p-1.5' : 'h-24 w-16 p-2'
      } ${
        selected
          ? 'border-text-primary shadow-lg'
          : 'border-black/10'
      } ${disabled ? 'opacity-50' : ''}`}
    >
      <span className={`text-sm font-bold leading-none ${isRed(card) ? 'text-red-600' : 'text-neutral-950'}`}>
        {card.rank}
      </span>
      <span className={`self-center text-2xl leading-none ${compact ? 'text-lg' : ''} ${isRed(card) ? 'text-red-600' : 'text-neutral-950'}`}>
        {getCardLabel(card).slice(card.rank.length)}
      </span>
      <span className={`self-end rotate-180 text-sm font-bold leading-none ${isRed(card) ? 'text-red-600' : 'text-neutral-950'}`}>
        {card.rank}
      </span>
    </motion.div>
  );

  if (!onClick) return content;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="shrink-0 cursor-pointer disabled:cursor-not-allowed"
      aria-pressed={selected}
      aria-label={`${selected ? 'Deselect' : 'Select'} ${getCardLabel(card)}`}
    >
      {content}
    </button>
  );
}

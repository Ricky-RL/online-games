'use client';

import { Big2Card } from './Big2Card';
import type { BigTwoCard } from '@/lib/big-2-logic';

interface Big2HandProps {
  cards: BigTwoCard[];
  selectedIds: string[];
  disabled?: boolean;
  onToggleCard: (cardId: string) => void;
}

export function Big2Hand({ cards, selectedIds, disabled = false, onToggleCard }: Big2HandProps) {
  return (
    <div className="w-full overflow-x-auto pb-3">
      <div className="flex min-w-max items-end gap-2 px-1 pt-3">
        {cards.map((card) => (
          <Big2Card
            key={card.id}
            card={card}
            selected={selectedIds.includes(card.id)}
            disabled={disabled}
            onClick={() => onToggleCard(card.id)}
          />
        ))}
      </div>
    </div>
  );
}

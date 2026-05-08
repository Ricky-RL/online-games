'use client';

import { useEffect, useRef } from 'react';
import { Big2Card } from './Big2Card';
import type { BigTwoCard, BigTwoRuleset } from '@/lib/big-2-rules';

interface Big2HandProps {
  cards: BigTwoCard[];
  ruleset?: BigTwoRuleset;
  selectedIds: string[];
  disabled?: boolean;
  onToggleCard: (cardId: string) => void;
}

export function Big2Hand({ cards, ruleset = 'classic', selectedIds, disabled = false, onToggleCard }: Big2HandProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const touchStartXRef = useRef<number | null>(null);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const onTouchStart = (event: TouchEvent) => {
      touchStartXRef.current = event.touches[0]?.clientX ?? null;
    };

    const onTouchMove = (event: TouchEvent) => {
      if (touchStartXRef.current === null || event.touches.length === 0) {
        return;
      }

      const currentX = event.touches[0].clientX;
      const deltaX = currentX - touchStartXRef.current;
      const maxScrollLeft = Math.max(0, container.scrollWidth - container.clientWidth);
      const atLeftEdge = container.scrollLeft <= 0;
      const atRightEdge = container.scrollLeft >= maxScrollLeft - 1;
      const isPullingPastLeft = atLeftEdge && deltaX > 0;
      const isPullingPastRight = atRightEdge && deltaX < 0;

      if (isPullingPastLeft || isPullingPastRight) {
        // Prevent browser-level back/forward swipe gestures at horizontal boundaries.
        event.preventDefault();
      }
    };

    const clearTouchStart = () => {
      touchStartXRef.current = null;
    };

    container.addEventListener('touchstart', onTouchStart, { passive: true });
    container.addEventListener('touchmove', onTouchMove, { passive: false });
    container.addEventListener('touchend', clearTouchStart, { passive: true });
    container.addEventListener('touchcancel', clearTouchStart, { passive: true });

    return () => {
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchmove', onTouchMove);
      container.removeEventListener('touchend', clearTouchStart);
      container.removeEventListener('touchcancel', clearTouchStart);
    };
  }, []);

  return (
    <div
      ref={scrollRef}
      className="w-full overflow-x-auto pb-3"
      style={{ overscrollBehaviorX: 'contain', touchAction: 'pan-x' }}
    >
      <div className="flex min-w-max items-end gap-2 px-1 pt-3">
        {cards.map((card) => (
          <Big2Card
            key={card.id}
            card={card}
            ruleset={ruleset}
            selected={selectedIds.includes(card.id)}
            disabled={disabled}
            onClick={() => onToggleCard(card.id)}
          />
        ))}
      </div>
    </div>
  );
}

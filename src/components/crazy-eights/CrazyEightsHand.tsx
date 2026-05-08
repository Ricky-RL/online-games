'use client';

import { useEffect, useRef } from 'react';
import type { CrazyEightsCard as CrazyEightsCardType } from '@/lib/crazy-eights-logic';
import { CrazyEightsCard } from './CrazyEightsCard';

interface CrazyEightsHandProps {
  cards: CrazyEightsCardType[];
  selectedCardId: string | null;
  disabled?: boolean;
  playableCardIds: Set<string>;
  onSelectCard: (cardId: string) => void;
}

export function CrazyEightsHand({
  cards,
  selectedCardId,
  disabled = false,
  playableCardIds,
  onSelectCard,
}: CrazyEightsHandProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const touchStartXRef = useRef<number | null>(null);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const onTouchStart = (event: TouchEvent) => {
      touchStartXRef.current = event.touches[0]?.clientX ?? null;
    };

    const onTouchMove = (event: TouchEvent) => {
      if (touchStartXRef.current === null || event.touches.length === 0) return;
      const currentX = event.touches[0].clientX;
      const deltaX = currentX - touchStartXRef.current;
      const maxScrollLeft = Math.max(0, container.scrollWidth - container.clientWidth);
      const atLeftEdge = container.scrollLeft <= 0;
      const atRightEdge = container.scrollLeft >= maxScrollLeft - 1;
      const isPullingPastLeft = atLeftEdge && deltaX > 0;
      const isPullingPastRight = atRightEdge && deltaX < 0;
      if (isPullingPastLeft || isPullingPastRight) event.preventDefault();
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
        {cards.map((card) => {
          const canPlay = playableCardIds.has(card.id);
          return (
            <CrazyEightsCard
              key={card.id}
              card={card}
              selected={selectedCardId === card.id}
              disabled={disabled || !canPlay}
              onClick={() => onSelectCard(card.id)}
            />
          );
        })}
      </div>
    </div>
  );
}

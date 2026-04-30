'use client';

import type { MemoryBoardState } from '@/lib/memory-types';
import { MemoryCard } from './MemoryCard';

interface MemoryBoardProps {
  board: MemoryBoardState;
  firstFlip: number | null;
  revealedCards: [number, number] | null;
  isMyTurn: boolean;
  myPlayerNumber: 1 | 2 | null;
  onCardClick: (index: number) => void;
  disabled: boolean;
}

export function MemoryBoard({
  board,
  firstFlip,
  revealedCards,
  isMyTurn,
  myPlayerNumber,
  onCardClick,
  disabled,
}: MemoryBoardProps) {
  const isCardRevealed = (cardId: number): boolean => {
    if (board.cards[cardId]?.matched) return true;
    if (cardId === firstFlip) return true;
    if (revealedCards && (revealedCards[0] === cardId || revealedCards[1] === cardId)) return true;
    return false;
  };

  const isCardDisabled = (cardId: number): boolean => {
    if (disabled) return true;
    if (!isMyTurn) return true;
    if (board.cards[cardId]?.matched) return true;
    if (cardId === firstFlip) return true;
    return false;
  };

  return (
    <div className="w-full max-w-[340px] sm:max-w-[420px] mx-auto">
      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        {board.cards.map((card) => (
          <MemoryCard
            key={card.id}
            card={card}
            isRevealed={isCardRevealed(card.id)}
            disabled={isCardDisabled(card.id)}
            onClick={() => onCardClick(card.id)}
          />
        ))}
      </div>
    </div>
  );
}

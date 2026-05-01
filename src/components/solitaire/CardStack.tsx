'use client';

import { useDroppable } from '@dnd-kit/core';
import { SolitaireCard, EmptySlot } from './Card';

interface TableauColumnProps {
  col: number;
  cards: number[];
  faceUp: Set<number>;
  onCardClick?: (cardId: number) => void;
}

export function TableauColumn({ col, cards, faceUp, onCardClick }: TableauColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `tableau-${col}`,
    data: { type: 'tableau', col },
  });

  if (cards.length === 0) {
    return (
      <div ref={setNodeRef} className={`relative ${isOver ? 'ring-2 ring-green-400 rounded-lg' : ''}`}>
        <EmptySlot label="K" />
      </div>
    );
  }

  return (
    <div ref={setNodeRef} className={`relative ${isOver ? 'ring-2 ring-green-400 rounded-lg' : ''}`}>
      {cards.map((cardId, idx) => (
        <SolitaireCard
          key={cardId}
          cardId={cardId}
          faceUp={faceUp.has(cardId)}
          draggable={faceUp.has(cardId)}
          dragData={{ source: 'tableau', col, cardIndex: idx }}
          onClick={() => faceUp.has(cardId) && onCardClick?.(cardId)}
          style={{ marginTop: idx > 0 ? '-60px' : '0' }}
          className={idx < cards.length - 1 ? '' : ''}
        />
      ))}
    </div>
  );
}

interface FoundationPileProps {
  suit: number;
  cards: number[];
}

const SUIT_SYMBOLS = ['♠', '♥', '♦', '♣'];

export function FoundationPile({ suit, cards }: FoundationPileProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `foundation-${suit}`,
    data: { type: 'foundation', suit },
  });

  const topCard = cards.length > 0 ? cards[cards.length - 1] : null;

  return (
    <div ref={setNodeRef} className={`${isOver ? 'ring-2 ring-green-400 rounded-lg' : ''}`}>
      {topCard !== null ? (
        <SolitaireCard cardId={topCard} faceUp={true} />
      ) : (
        <EmptySlot label={SUIT_SYMBOLS[suit]} />
      )}
    </div>
  );
}

interface StockPileProps {
  stock: number[];
  waste: number[];
  onDraw: () => void;
  onWasteCardClick?: (cardId: number) => void;
}

export function StockPile({ stock, waste, onDraw, onWasteCardClick }: StockPileProps) {
  const topWaste = waste.length > 0 ? waste[waste.length - 1] : null;

  return (
    <div className="flex gap-2">
      {/* Stock */}
      <div onClick={onDraw} className="cursor-pointer">
        {stock.length > 0 ? (
          <SolitaireCard cardId={stock[stock.length - 1]} faceUp={false} />
        ) : (
          <div className="w-[60px] h-[84px] rounded-lg border-2 border-dashed border-border/40 flex items-center justify-center cursor-pointer hover:border-green-400/60 transition-colors">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-secondary/40">
              <path d="M4 10a6 6 0 1 1 12 0 6 6 0 0 1-12 0z" />
              <path d="M14 6l2-2M16 4l-2 0M16 4l0 2" strokeLinecap="round" />
            </svg>
          </div>
        )}
      </div>

      {/* Waste */}
      {topWaste !== null ? (
        <SolitaireCard
          cardId={topWaste}
          faceUp={true}
          draggable={true}
          dragData={{ source: 'waste' }}
          onClick={() => onWasteCardClick?.(topWaste)}
        />
      ) : (
        <EmptySlot />
      )}
    </div>
  );
}

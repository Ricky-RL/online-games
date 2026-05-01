'use client';

import { useDraggable } from '@dnd-kit/core';
import { getCard, isRed } from '@/lib/solitaire-logic';

const SUIT_SYMBOLS = ['♠', '♥', '♦', '♣'];
const RANK_LABELS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

interface CardProps {
  cardId: number;
  faceUp: boolean;
  draggable?: boolean;
  dragData?: { source: string; col?: number; cardIndex?: number };
  onClick?: () => void;
  style?: React.CSSProperties;
  className?: string;
}

export function SolitaireCard({ cardId, faceUp, draggable = false, dragData, onClick, style, className = '' }: CardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `card-${cardId}`,
    data: dragData,
    disabled: !draggable || !faceUp,
  });

  const transformStyle = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined;

  if (!faceUp) {
    return (
      <div
        className={`w-[60px] h-[84px] rounded-lg border border-border bg-gradient-to-br from-blue-900 to-blue-700 shadow-sm ${className}`}
        style={style}
      >
        <div className="w-full h-full rounded-lg border border-blue-600/30 flex items-center justify-center">
          <div className="w-8 h-12 rounded border border-blue-400/20 bg-blue-800/50" />
        </div>
      </div>
    );
  }

  const card = getCard(cardId);
  const red = isRed(cardId);
  const colorClass = red ? 'text-red-500' : 'text-text-primary';

  return (
    <div
      ref={draggable ? setNodeRef : undefined}
      {...(draggable ? { ...listeners, ...attributes } : {})}
      onClick={onClick}
      className={`w-[60px] h-[84px] rounded-lg border border-border bg-white shadow-sm select-none ${draggable && faceUp ? 'cursor-grab active:cursor-grabbing' : ''} ${isDragging ? 'opacity-50 z-50' : ''} ${className}`}
      style={{ ...style, ...transformStyle }}
    >
      <div className={`p-1 ${colorClass} text-xs font-bold leading-none`}>
        <div>{RANK_LABELS[card.rank]}</div>
        <div className="text-sm">{SUIT_SYMBOLS[card.suit]}</div>
      </div>
      <div className={`absolute inset-0 flex items-center justify-center ${colorClass} text-2xl pointer-events-none`}>
        {SUIT_SYMBOLS[card.suit]}
      </div>
    </div>
  );
}

export function EmptySlot({ label, className = '' }: { label?: string; className?: string }) {
  return (
    <div className={`w-[60px] h-[84px] rounded-lg border-2 border-dashed border-border/40 flex items-center justify-center ${className}`}>
      {label && <span className="text-text-secondary/40 text-xs">{label}</span>}
    </div>
  );
}

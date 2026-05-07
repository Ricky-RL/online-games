'use client';

import type { Player } from '@/lib/types';
import type { UnoCard } from '@/lib/uno-logic';
import { UnoCard as UnoCardView } from './UnoCard';

interface UnoTableProps {
  topCard: UnoCard;
  activeColor: 'red' | 'yellow' | 'green' | 'blue';
  lastAction: string | null;
  lastPlayedBy: Player | null;
  player1Name: string | null;
  player2Name: string | null;
  drawPileCount: number;
}

function activeColorLabel(color: 'red' | 'yellow' | 'green' | 'blue'): string {
  return color[0].toUpperCase() + color.slice(1);
}

export function UnoTable({
  topCard,
  activeColor,
  lastAction,
  lastPlayedBy,
  player1Name,
  player2Name,
  drawPileCount,
}: UnoTableProps) {
  const lastPlayerName = lastPlayedBy === 1 ? player1Name : lastPlayedBy === 2 ? player2Name : null;

  return (
    <div className="w-full max-w-3xl rounded-2xl border border-border bg-surface/70 px-4 py-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary/70">Discard Pile</p>
          <p className="text-sm text-text-secondary">
            {lastPlayerName && lastAction ? `${lastPlayerName}: ${lastAction}` : 'Match color or symbol'}
          </p>
        </div>
        <span className="rounded-full border border-border bg-background px-3 py-1 text-xs text-text-secondary">
          Draw pile: {drawPileCount}
        </span>
      </div>

      <div className="flex min-h-28 items-center justify-center gap-6 rounded-xl border border-dashed border-border bg-background/60 p-4">
        <UnoCardView card={topCard} compact />
        <div className="text-sm text-text-secondary">
          Active color:{' '}
          <span className="font-semibold text-text-primary">{activeColorLabel(activeColor)}</span>
        </div>
      </div>
    </div>
  );
}

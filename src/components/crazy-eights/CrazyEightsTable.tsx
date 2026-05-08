'use client';

import type { Player } from '@/lib/types';
import { getSuitSymbol, type CrazyEightsCard, type CrazyEightsSuit } from '@/lib/crazy-eights-logic';
import { CrazyEightsCard as CrazyEightsCardView } from './CrazyEightsCard';

interface CrazyEightsTableProps {
  topCard: CrazyEightsCard;
  activeSuit: CrazyEightsSuit;
  lastAction: string | null;
  lastPlayedBy: Player | null;
  player1Name: string | null;
  player2Name: string | null;
  drawPileCount: number;
}

const SUITS: CrazyEightsSuit[] = ['clubs', 'diamonds', 'hearts', 'spades'];

export function CrazyEightsTable({
  topCard,
  activeSuit,
  lastAction,
  lastPlayedBy,
  player1Name,
  player2Name,
  drawPileCount,
}: CrazyEightsTableProps) {
  const lastPlayerName = lastPlayedBy === 1 ? player1Name : lastPlayedBy === 2 ? player2Name : null;

  return (
    <div className="w-full max-w-3xl rounded-2xl border border-border bg-surface/70 px-4 py-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary/70">Discard Pile</p>
          <p className="text-sm text-text-secondary">
            {lastPlayerName && lastAction ? `${lastPlayerName}: ${lastAction}` : 'Match suit or rank. Eights are wild.'}
          </p>
        </div>
        <span className="rounded-full border border-border bg-background px-3 py-1 text-xs text-text-secondary">
          Draw pile: {drawPileCount}
        </span>
      </div>

      <div className="flex min-h-28 flex-wrap items-center justify-center gap-5 rounded-xl border border-dashed border-border bg-background/60 p-4">
        <CrazyEightsCardView card={topCard} compact />
        <div className="space-y-2">
          <p className="text-sm text-text-secondary">
            Active suit:{' '}
            <span className="font-semibold text-text-primary">{getSuitSymbol(activeSuit)}</span>
          </p>
          <div className="flex items-center gap-1.5">
            {SUITS.map((suit) => (
              <span
                key={suit}
                className={`rounded-full border px-2 py-0.5 text-[11px] uppercase ${
                  suit === activeSuit
                    ? 'border-board bg-board/10 text-board'
                    : 'border-border bg-surface text-text-secondary'
                }`}
              >
                {getSuitSymbol(suit)}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

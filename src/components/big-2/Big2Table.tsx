'use client';

import { Big2Card } from './Big2Card';
import { describeCombination, type BigTwoCombination, type BigTwoRuleset } from '@/lib/big-2-rules';
import type { Player } from '@/lib/types';

interface Big2TableProps {
  ruleset?: BigTwoRuleset;
  activeCombination: BigTwoCombination | null;
  lastPlayedBy: Player | null;
  player1Name: string | null;
  player2Name: string | null;
  discardsCount: number;
}

export function Big2Table({ ruleset = 'classic', activeCombination, lastPlayedBy, player1Name, player2Name, discardsCount }: Big2TableProps) {
  const lastPlayerName = lastPlayedBy === 1 ? player1Name : lastPlayedBy === 2 ? player2Name : null;

  return (
    <div className="w-full max-w-3xl rounded-2xl border border-border bg-surface/70 px-4 py-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary/70">Current Trick</p>
          <p className="text-sm text-text-secondary">
            {activeCombination && lastPlayerName
              ? `${lastPlayerName} played ${describeCombination(activeCombination.type, ruleset)}`
              : 'Lead any valid combination'}
          </p>
        </div>
        <span className="rounded-full border border-border bg-background px-3 py-1 text-xs text-text-secondary">
          {discardsCount} discarded
        </span>
      </div>

      <div className="flex min-h-28 items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-background/60 p-4">
        {activeCombination ? (
          activeCombination.cards.map((card) => (
            <Big2Card key={card.id} card={card} ruleset={ruleset} compact />
          ))
        ) : (
          <p className="text-sm text-text-secondary/70">No active cards on the table</p>
        )}
      </div>
    </div>
  );
}

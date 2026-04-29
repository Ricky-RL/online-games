'use client';

import { MonopolyBoard, JAIL_FEE } from '@/lib/monopoly/types';
import { Player } from '@/lib/types';
import { getPlayerState } from '@/lib/monopoly/logic';

interface JailDecisionProps {
  board: MonopolyBoard;
  player: Player;
  onPayFee: () => void;
  onRollForDoubles: () => void;
}

export function JailDecision({ board, player, onPayFee, onRollForDoubles }: JailDecisionProps) {
  const state = getPlayerState(board, player);

  return (
    <div className="rounded-2xl border border-border bg-surface p-6 max-w-sm mx-auto">
      <h3 className="text-lg font-bold text-text-primary mb-2">In Jail</h3>
      <p className="text-sm text-text-secondary mb-4">
        Turn {state.jailTurns + 1} of 3. Roll doubles to escape, or pay ${JAIL_FEE}.
      </p>
      <div className="flex gap-3">
        <button
          onClick={onRollForDoubles}
          className="flex-1 px-4 py-2 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors cursor-pointer"
        >
          Roll for Doubles
        </button>
        <button
          onClick={onPayFee}
          disabled={state.cash < JAIL_FEE}
          className="flex-1 px-4 py-2 rounded-xl bg-background border border-border text-text-secondary font-medium hover:bg-surface transition-colors cursor-pointer disabled:opacity-50"
        >
          Pay ${JAIL_FEE}
        </button>
      </div>
    </div>
  );
}

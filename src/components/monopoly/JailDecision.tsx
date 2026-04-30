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
    <div className="rounded-xl sm:rounded-2xl border border-border bg-surface p-4 sm:p-6 w-full max-w-sm mx-auto">
      <h3 className="text-base sm:text-lg font-bold text-text-primary mb-1.5 sm:mb-2">In Jail</h3>
      <p className="text-sm text-text-secondary mb-3 sm:mb-4">
        Turn {state.jailTurns + 1} of 3. Roll doubles to escape, or pay ${JAIL_FEE}.
      </p>
      <div className="flex gap-2 sm:gap-3">
        <button
          onClick={onRollForDoubles}
          className="flex-1 px-3 sm:px-4 py-2.5 min-h-[48px] rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 active:bg-blue-800 transition-colors cursor-pointer text-sm sm:text-base"
        >
          Roll for Doubles
        </button>
        <button
          onClick={onPayFee}
          disabled={state.cash < JAIL_FEE}
          className="flex-1 px-3 sm:px-4 py-2.5 min-h-[48px] rounded-xl bg-background border border-border text-text-secondary font-medium hover:bg-surface active:bg-surface transition-colors cursor-pointer disabled:opacity-50 text-sm sm:text-base"
        >
          Pay ${JAIL_FEE}
        </button>
      </div>
    </div>
  );
}

'use client';

import { BOARD } from '@/lib/monopoly/board-data';
import { MonopolyBoard } from '@/lib/monopoly/types';

interface BuildMenuProps {
  board: MonopolyBoard;
  buildableProperties: number[];
  onBuild: (spaceIndex: number) => void;
  onDone: () => void;
}

export function BuildMenu({ board, buildableProperties, onBuild, onDone }: BuildMenuProps) {
  if (buildableProperties.length === 0) return null;

  return (
    <div className="rounded-xl sm:rounded-2xl border border-border bg-surface p-3 sm:p-4">
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <h4 className="text-sm font-semibold text-text-primary">Build Houses</h4>
        <button
          onClick={onDone}
          className="text-xs text-text-secondary hover:text-text-primary transition-colors cursor-pointer min-h-[44px] flex items-center px-2"
        >
          Done Building
        </button>
      </div>
      <div className="space-y-1 sm:space-y-2">
        {buildableProperties.map(idx => {
          const space = BOARD[idx];
          const houses = board.properties[idx]?.houses ?? 0;
          return (
            <button
              key={idx}
              onClick={() => onBuild(idx)}
              className="w-full flex items-center justify-between p-2.5 sm:p-2 min-h-[44px] rounded-xl hover:bg-background active:bg-background transition-colors cursor-pointer"
            >
              <span className="text-sm text-text-primary">{space.name} ({houses}H)</span>
              <span className="text-xs text-text-secondary">${space.housePrice}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

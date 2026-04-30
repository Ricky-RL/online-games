'use client';

import { BOARD } from '@/lib/monopoly/board-data';
import { MonopolyBoard } from '@/lib/monopoly/types';
import { Player } from '@/lib/types';
import { getPlayerState } from '@/lib/monopoly/logic';

interface PropertyCardProps {
  board: MonopolyBoard;
  player: Player;
  onBuy: () => void;
  onPass: () => void;
}

export function PropertyCard({ board, player, onBuy, onPass }: PropertyCardProps) {
  const state = getPlayerState(board, player);
  const space = BOARD[state.position];
  if (!space || !space.price) return null;

  return (
    <div className="rounded-xl sm:rounded-2xl border border-border bg-surface p-4 sm:p-6 w-full max-w-sm mx-auto">
      <h3 className="text-base sm:text-lg font-bold text-text-primary mb-1">{space.name}</h3>
      {space.color && (
        <div className="text-xs text-text-secondary mb-2 sm:mb-3 capitalize">{space.color.replace('-', ' ')} group</div>
      )}
      <div className="space-y-1 mb-3 sm:mb-4 text-sm">
        <div className="flex justify-between">
          <span className="text-text-secondary">Price</span>
          <span className="font-semibold">${space.price}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-secondary">
            {space.type === 'utility' ? 'Rent' : space.type === 'railroad' ? 'Base Rent' : 'Base Rent'}
          </span>
          <span>
            {space.type === 'utility' ? `${space.rent[0]}x dice roll` : `$${space.rent[0]}`}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-secondary">Your Cash</span>
          <span className="font-semibold">${state.cash}</span>
        </div>
      </div>
      <div className="flex gap-2 sm:gap-3">
        <button
          onClick={onBuy}
          className="flex-1 px-3 sm:px-4 py-2.5 min-h-[48px] rounded-xl bg-green-600 text-white font-medium hover:bg-green-700 active:bg-green-800 transition-colors cursor-pointer text-sm sm:text-base"
        >
          Buy ${space.price}
        </button>
        <button
          onClick={onPass}
          className="flex-1 px-3 sm:px-4 py-2.5 min-h-[48px] rounded-xl bg-background border border-border text-text-secondary font-medium hover:bg-surface active:bg-surface transition-colors cursor-pointer text-sm sm:text-base"
        >
          Pass
        </button>
      </div>
    </div>
  );
}

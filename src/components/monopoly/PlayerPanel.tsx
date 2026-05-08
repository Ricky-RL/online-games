'use client';

import { Player } from '@/lib/types';
import { MonopolyBoard } from '@/lib/monopoly/types';
import { BOARD } from '@/lib/monopoly/board-data';

interface PlayerPanelProps {
  board: MonopolyBoard;
  player: Player;
  name: string;
  isActive: boolean;
  lastCashDelta: number;
  turnCashDelta: number;
}

function formatDelta(delta: number): string {
  if (delta === 0) return '$0';
  return `${delta > 0 ? '+' : '-'}$${Math.abs(delta)}`;
}

export function PlayerPanel({ board, player, name, isActive, lastCashDelta, turnCashDelta }: PlayerPanelProps) {
  const state = board.players[player - 1];
  const ownedProperties = Object.entries(board.properties)
    .filter(([, prop]) => prop.owner === player)
    .map(([idx]) => Number(idx));
  const activeClass = isActive
    ? player === 1
      ? 'border-player1 bg-player1/5'
      : 'border-player2 bg-player2/10'
    : 'border-border bg-surface/50';
  const activeBadgeClass = player === 1
    ? 'bg-player1/10 text-player1'
    : 'bg-player2/20 text-text-primary';
  const lastDeltaClass = lastCashDelta > 0 ? 'text-emerald-600 bg-emerald-100/60' : 'text-red-500 bg-red-100/70';
  const turnDeltaClass = turnCashDelta > 0 ? 'text-emerald-600' : turnCashDelta < 0 ? 'text-red-500' : 'text-text-secondary';

  return (
    <div className={`rounded-xl sm:rounded-2xl border p-2.5 sm:p-4 ${activeClass}`}>
      <div className="flex items-center justify-between mb-1.5 sm:mb-3">
        <h3 className="font-semibold text-text-primary text-sm sm:text-base truncate">{name}</h3>
        {isActive && <span className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full font-medium shrink-0 ml-1 ${activeBadgeClass}`}>Active</span>}
      </div>
      <div className="space-y-1 sm:space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs sm:text-sm text-text-secondary">Cash</span>
          <div className="flex items-center gap-1.5 sm:gap-2">
            {lastCashDelta !== 0 && (
              <span className={`text-[10px] sm:text-xs font-semibold px-1.5 py-0.5 rounded-full ${lastDeltaClass}`}>
                {formatDelta(lastCashDelta)}
              </span>
            )}
            <span className="text-xs sm:text-sm font-semibold text-text-primary">${state.cash}</span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs sm:text-sm text-text-secondary">This turn</span>
          <span className={`text-xs sm:text-sm font-semibold ${turnDeltaClass}`}>
            {formatDelta(turnCashDelta)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs sm:text-sm text-text-secondary">Position</span>
          <span className="text-xs sm:text-sm text-text-primary truncate ml-2">#{state.position} {BOARD[state.position]?.name ?? 'GO'}</span>
        </div>
        {state.inJail && (
          <div className="text-[10px] sm:text-xs text-red-500 font-medium">In Jail (Turn {state.jailTurns + 1}/3)</div>
        )}
        {ownedProperties.length > 0 && (
          <div className="mt-1.5 sm:mt-2 pt-1.5 sm:pt-2 border-t border-border">
            <span className="text-[10px] sm:text-xs text-text-secondary">Properties ({ownedProperties.length})</span>
            <div className="flex flex-wrap gap-0.5 sm:gap-1 mt-1">
              {ownedProperties.map(idx => {
                const space = BOARD[idx];
                return (
                  <span
                    key={idx}
                    className="text-[10px] sm:text-xs px-1 sm:px-1.5 py-0.5 rounded bg-background border border-border text-text-secondary"
                    title={space.name}
                  >
                    {space.name.split(' ')[0]}
                    {board.properties[idx].houses > 0 && ` (${board.properties[idx].houses}H)`}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { Player } from '@/lib/types';
import { MonopolyBoard, PropertyOwnership } from '@/lib/monopoly/types';
import { BOARD } from '@/lib/monopoly/board-data';

interface PlayerPanelProps {
  board: MonopolyBoard;
  player: Player;
  name: string;
  isActive: boolean;
}

export function PlayerPanel({ board, player, name, isActive }: PlayerPanelProps) {
  const state = board.players[player - 1];
  const ownedProperties = Object.entries(board.properties)
    .filter(([, prop]) => prop.owner === player)
    .map(([idx]) => Number(idx));

  return (
    <div className={`rounded-2xl border p-4 ${isActive ? 'border-player1 bg-player1/5' : 'border-border bg-surface/50'}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-text-primary">{name}</h3>
        {isActive && <span className="text-xs px-2 py-0.5 rounded-full bg-player1/10 text-player1 font-medium">Active</span>}
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-text-secondary">Cash</span>
          <span className="text-sm font-semibold text-text-primary">${state.cash}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-text-secondary">Position</span>
          <span className="text-sm text-text-primary">{BOARD[state.position]?.name ?? 'GO'}</span>
        </div>
        {state.inJail && (
          <div className="text-xs text-red-500 font-medium">In Jail (Turn {state.jailTurns + 1}/3)</div>
        )}
        {ownedProperties.length > 0 && (
          <div className="mt-2 pt-2 border-t border-border">
            <span className="text-xs text-text-secondary">Properties ({ownedProperties.length})</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {ownedProperties.map(idx => {
                const space = BOARD[idx];
                return (
                  <span
                    key={idx}
                    className="text-xs px-1.5 py-0.5 rounded bg-background border border-border text-text-secondary"
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

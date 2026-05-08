'use client';

import { AutoMatchmakingPage } from '@/components/AutoMatchmakingPage';
import { createInitialBoard } from '@/lib/monopoly/logic';

export default function MonopolyLobby() {
  return (
    <AutoMatchmakingPage
      gameType="monopoly"
      label="Monopoly"
      createData={() => ({ game_type: 'monopoly', board: createInitialBoard(1), current_turn: 1, winner: null })}
    />
  );
}

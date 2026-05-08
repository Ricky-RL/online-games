'use client';

import { AutoMatchmakingPage } from '@/components/AutoMatchmakingPage';
import { createUnoBoard } from '@/lib/uno-logic';

export default function UnoLobby() {
  return (
    <AutoMatchmakingPage
      gameType="uno"
      label="UNO"
      createData={() => ({ game_type: 'uno', board: createUnoBoard(1), current_turn: 1, winner: null })}
    />
  );
}

'use client';

import { AutoMatchmakingPage } from '@/components/AutoMatchmakingPage';
import { createInitialTower } from '@/lib/jenga-logic';

export default function JengaLobby() {
  return (
    <AutoMatchmakingPage
      gameType="jenga"
      label="Jenga"
      createData={() => ({ game_type: 'jenga', board: createInitialTower(), current_turn: 1, winner: null })}
    />
  );
}

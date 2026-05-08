'use client';

import { AutoMatchmakingPage } from '@/components/AutoMatchmakingPage';
import { createCrazyEightsBoard } from '@/lib/crazy-eights-logic';

export default function CrazyEightsLobby() {
  return (
    <AutoMatchmakingPage
      gameType="crazy-eights"
      label="Crazy Eights"
      createData={() => ({ game_type: 'crazy-eights', board: createCrazyEightsBoard(1), current_turn: 1, winner: null })}
    />
  );
}

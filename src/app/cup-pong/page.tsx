'use client';

import { AutoMatchmakingPage } from '@/components/AutoMatchmakingPage';
import { createInitialBoard } from '@/lib/cup-pong-logic';

export default function CupPongLobby() {
  return (
    <AutoMatchmakingPage
      gameType="cup-pong"
      label="Cup Pong"
      createData={() => ({ game_type: 'cup-pong', board: createInitialBoard(), current_turn: 1, winner: null })}
    />
  );
}

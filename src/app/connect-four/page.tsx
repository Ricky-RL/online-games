'use client';

import { AutoMatchmakingPage } from '@/components/AutoMatchmakingPage';
import { createEmptyBoard } from '@/lib/game-logic';

export default function ConnectFourLobby() {
  return (
    <AutoMatchmakingPage
      gameType="connect-four"
      label="Connect Four"
      createData={() => ({ game_type: 'connect-four', board: createEmptyBoard(), current_turn: 1, winner: null })}
    />
  );
}

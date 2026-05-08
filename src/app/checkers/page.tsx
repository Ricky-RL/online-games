'use client';

import { AutoMatchmakingPage } from '@/components/AutoMatchmakingPage';
import { createInitialBoard } from '@/lib/checkers-logic';

export default function CheckersLobby() {
  return (
    <AutoMatchmakingPage
      gameType="checkers"
      label="Checkers"
      createData={() => ({ game_type: 'checkers', board: createInitialBoard(), current_turn: 1, winner: null })}
    />
  );
}

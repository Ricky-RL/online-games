'use client';

import { AutoMatchmakingPage } from '@/components/AutoMatchmakingPage';
import { createBigTwoBoard } from '@/lib/big-2-logic';

export default function Big2Lobby() {
  return (
    <AutoMatchmakingPage
      gameType="big-2"
      label="Big 2"
      createData={() => ({ game_type: 'big-2', board: createBigTwoBoard(1), current_turn: 1, winner: null })}
    />
  );
}

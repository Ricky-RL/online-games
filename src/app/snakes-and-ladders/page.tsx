'use client';

import { AutoMatchmakingPage } from '@/components/AutoMatchmakingPage';
import { generateBoard } from '@/lib/snakes-and-ladders-logic';

export default function SnakesAndLaddersLobby() {
  return (
    <AutoMatchmakingPage
      gameType="snakes-and-ladders"
      label="Snakes & Ladders"
      createData={() => ({ game_type: 'snakes-and-ladders', board: generateBoard(), current_turn: 1, winner: null })}
    />
  );
}

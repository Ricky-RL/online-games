'use client';

import { AutoMatchmakingPage } from '@/components/AutoMatchmakingPage';
import { createEmptyBoard } from '@/lib/wordle-together-logic';

export default function WordleTogetherLobby() {
  return (
    <AutoMatchmakingPage
      gameType="wordle-together"
      label="Wordle Together"
      table="games"
      createData={() => ({
        game_type: 'wordle-together',
        board: createEmptyBoard(),
        current_turn: 0,
        winner: null,
      })}
    />
  );
}

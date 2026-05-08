'use client';

import { AutoMatchmakingPage } from '@/components/AutoMatchmakingPage';
import { createSolvableDeck } from '@/lib/solitaire-solver';

export default function SolitaireLobby() {
  return (
    <AutoMatchmakingPage
      gameType="solitaire"
      label="Solitaire"
      createData={() => ({
        game_type: 'solitaire',
        board: { deck: createSolvableDeck(), player1_result: null, player2_result: null },
        current_turn: 1,
        winner: null,
      })}
    />
  );
}

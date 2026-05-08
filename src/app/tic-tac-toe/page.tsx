'use client';

import { AutoMatchmakingPage } from '@/components/AutoMatchmakingPage';
import { createEmptyBoard } from '@/lib/tic-tac-toe-logic';

export default function TicTacToeLobby() {
  return (
    <AutoMatchmakingPage
      gameType="tic-tac-toe"
      label="Tic Tac Toe"
      createData={() => ({ game_type: 'tic-tac-toe', board: createEmptyBoard(), current_turn: 1, winner: null })}
    />
  );
}

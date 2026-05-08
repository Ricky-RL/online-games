'use client';

import { AutoMatchmakingPage } from '@/components/AutoMatchmakingPage';
import { generateRandomPlacement } from '@/lib/battleship-logic';
import type { BattleshipBoardState } from '@/lib/types';

export default function BattleshipLobby() {
  return (
    <AutoMatchmakingPage
      gameType="battleship"
      label="Battleship"
      createData={() => {
        const board: BattleshipBoardState = {
          player1Ships: generateRandomPlacement(),
          player2Ships: generateRandomPlacement(),
          player1Attacks: [],
          player2Attacks: [],
          phase: 'setup',
        };
        return { game_type: 'battleship', board, current_turn: 1, winner: null };
      }}
    />
  );
}

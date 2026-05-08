'use client';

import { AutoMatchmakingPage } from '@/components/AutoMatchmakingPage';
import { createInitialBoard } from '@/lib/mini-golf/logic';
import { EASY_LEVEL_IDS, MEDIUM_LEVEL_IDS, HARD_LEVEL_IDS } from '@/lib/mini-golf/levels';

export default function MiniGolfLobby() {
  return (
    <AutoMatchmakingPage
      gameType="mini-golf"
      label="Mini Golf"
      createData={() => ({
        game_type: 'mini-golf',
        board: createInitialBoard(EASY_LEVEL_IDS, MEDIUM_LEVEL_IDS, HARD_LEVEL_IDS),
        current_turn: 1,
        winner: null,
      })}
    />
  );
}

'use client';

import { AutoMatchmakingPage } from '@/components/AutoMatchmakingPage';
import { createInitialBalls } from '@/lib/pool/setup';
import { createInitialBoard } from '@/lib/pool/logic';

export default function PoolLobby() {
  return (
    <AutoMatchmakingPage
      gameType="pool"
      label="Pool"
      createData={() => ({
        game_type: 'pool',
        board: createInitialBoard(createInitialBalls()),
        current_turn: 1,
        winner: null,
      })}
    />
  );
}

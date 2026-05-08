'use client';

import { AutoMatchmakingPage } from '@/components/AutoMatchmakingPage';
import { createMemoryBoard } from '@/lib/memory-logic';

export default function MemoryLobby() {
  return (
    <AutoMatchmakingPage
      gameType="memory"
      label="Memory"
      createData={() => ({ game_type: 'memory', board: createMemoryBoard(), current_turn: 1, winner: null })}
    />
  );
}

'use client';

import { AutoMatchmakingPage } from '@/components/AutoMatchmakingPage';
import { createReactionBoard } from '@/lib/reaction-logic';

export default function ReactionLobby() {
  return (
    <AutoMatchmakingPage
      gameType="reaction"
      label="Reaction"
      joinData={(game) => {
        const row = game as { board?: { phase?: string } };
        return row.board?.phase === 'p1_done' ? { board: { ...row.board, phase: 'p2_playing' } } : {};
      }}
      createData={() => ({ game_type: 'reaction', board: createReactionBoard(), current_turn: 1, winner: null })}
    />
  );
}

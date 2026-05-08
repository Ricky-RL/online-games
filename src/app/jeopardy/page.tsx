'use client';

import { AutoMatchmakingPage } from '@/components/AutoMatchmakingPage';
import { createInitialBoard, fetchTriviaQuestions } from '@/lib/jeopardy/logic';

export default function JeopardyLobby() {
  return (
    <AutoMatchmakingPage
      gameType="jeopardy"
      label="Jeopardy"
      createData={async () => {
        const categories = await fetchTriviaQuestions();
        return { game_type: 'jeopardy', board: createInitialBoard(categories), current_turn: 1, winner: null };
      }}
    />
  );
}

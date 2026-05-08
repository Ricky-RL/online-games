'use client';

import { AutoMatchmakingPage } from '@/components/AutoMatchmakingPage';
import { generateAnswerIndex } from '@/lib/wordle-logic';

export default function WordleLobby() {
  return (
    <AutoMatchmakingPage
      gameType="wordle"
      label="Wordle"
      table="wordle_games"
      statusFilter="wordle"
      filterGame={(game) => (game as { answer_index?: number }).answer_index !== -1}
      createData={() => ({
        game_type: 'wordle',
        answer_index: generateAnswerIndex(),
        guesses: [],
        guess_count: 0,
        status: 'playing',
        winner: null,
      })}
    />
  );
}

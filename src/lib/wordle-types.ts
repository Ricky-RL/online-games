export type LetterState = 'correct' | 'present' | 'absent';

export interface WordleGuess {
  word: string;
  player: 1 | 2;
}

export interface WordleGame {
  id: string;
  game_type: 'wordle';
  answer_index: number;
  guesses: WordleGuess[];
  guess_count: number;
  player1_typing: string | null;
  player2_typing: string | null;
  status: 'waiting' | 'playing' | 'won' | 'lost';
  winner: 1 | 2 | null;
  player1_id: string | null;
  player2_id: string | null;
  player1_name: string | null;
  player2_name: string | null;
  created_at: string;
  updated_at: string;
}

export type WordleGameStatus = 'waiting' | 'playing' | 'won' | 'lost';

export type KeyboardState = Record<string, LetterState>;

export interface MathQuestion {
  id: number;
  text: string;
  correctAnswer: number;
  options: number[];
}

export interface PlayerAnswer {
  questionId: number;
  answer: number | null;
  correct: boolean;
  timeSpent: number;
}

export interface PlayerResult {
  correctCount: number;
  answers: PlayerAnswer[];
  totalTime: number;
  startedAt: string;
  submittedAt: string;
}

export interface MathTriviaBoardState {
  questions: MathQuestion[];
  timeLimit: number;
  player1Result: PlayerResult | null;
  player2Result: PlayerResult | null;
}

export interface MathTriviaGame {
  id: string;
  game_type: 'math-trivia';
  board: MathTriviaBoardState;
  current_turn: 1 | 2;
  winner: 1 | 2 | null;
  player1_id: string | null;
  player2_id: string | null;
  player1_name: string | null;
  player2_name: string | null;
  created_at: string;
  updated_at: string;
}

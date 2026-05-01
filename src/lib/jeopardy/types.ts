export type JeopardyPhase = 'picking' | 'answering' | 'result' | 'game-over';

export const QUESTION_VALUES = [200, 400, 600, 800, 1000] as const;

export interface JeopardyQuestion {
  value: number;
  question: string;
  correctAnswer: string;
  incorrectAnswers: string[];
  answered: boolean;
  answeredBy: number | null;
}

export interface JeopardyCategory {
  name: string;
  questions: JeopardyQuestion[];
}

export interface JeopardyBoard {
  categories: JeopardyCategory[];
  scores: [number, number];
  phase: JeopardyPhase;
  currentPicker: number;
  activeQuestion: { catIndex: number; qIndex: number } | null;
  lastAnswerCorrect: boolean | null;
  lastAnswerPlayer: number | null;
  winner: number | null;
  version: number;
}

export interface JeopardyGame {
  id: string;
  game_type: string;
  board: JeopardyBoard;
  current_turn: 1 | 2;
  winner: number | null;
  player1_id: string | null;
  player2_id: string | null;
  player1_name: string | null;
  player2_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface CategoryInput {
  name: string;
  questions: Array<{
    question: string;
    correctAnswer: string;
    incorrectAnswers: string[];
  }>;
}

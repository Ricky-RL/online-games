import { supabase } from '@/lib/supabase';

export type GameType = 'connect-four' | 'tic-tac-toe' | 'wordle' | 'mini-golf' | 'jenga' | 'snakes-and-ladders' | 'word-search' | 'monopoly' | 'battleship' | 'memory' | 'big-2' | 'uno' | 'math-trivia' | 'jeopardy' | 'pool' | 'cup-pong' | 'reaction' | 'sudoku' | 'solitaire';

export interface MatchResultInsert {
  game_type: GameType;
  game_id: string;
  winner_id: string | null;
  winner_name: string | null;
  loser_id: string | null;
  loser_name: string | null;
  is_draw: boolean;
  metadata: Record<string, unknown> | null;
  player1_id: string;
  player1_name: string;
  player2_id: string;
  player2_name: string;
}

export async function recordMatchResult(result: MatchResultInsert): Promise<void> {
  const { error } = await supabase
    .from('match_results')
    .insert(result);
  if (error) {
    console.error('Failed to record match result:', error);
  }
}

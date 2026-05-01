export interface SolitaireResult {
  moves: number;
  time_seconds: number;
  completed: boolean;
  started_at: string;
  finished_at: string;
}

export interface SolitaireBoard {
  deck: number[];
  player1_result: SolitaireResult | null;
  player2_result: SolitaireResult | null;
}

export interface Card {
  id: number;       // 0-51
  suit: number;     // 0=Spades, 1=Hearts, 2=Diamonds, 3=Clubs
  rank: number;     // 0=Ace, 1=Two, ... 12=King
}

export interface SolitaireGameState {
  tableau: number[][];      // 7 columns
  foundations: number[][];  // 4 piles (indexed by suit)
  stock: number[];
  waste: number[];
  faceUp: Set<number>;     // card IDs that are face-up
  moves: number;
  startedAt: string | null;
}

export type MoveSource =
  | { type: 'waste' }
  | { type: 'tableau'; col: number; cardIndex: number }
  | { type: 'foundation'; suit: number };

export type MoveTarget =
  | { type: 'tableau'; col: number }
  | { type: 'foundation'; suit: number };

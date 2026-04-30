export interface MemoryCard {
  id: number;          // 0-19 position index
  emoji: string;       // The emoji character
  matched: boolean;    // Has been successfully matched
  matchedBy: 1 | 2 | null;  // Which player matched this pair
}

export interface MemoryBoardState {
  cards: MemoryCard[];          // 20 cards, shuffled
  player1Score: number;         // Number of pairs Player 1 found
  player2Score: number;         // Number of pairs Player 2 found
  lastFlipped: [number, number] | null;  // Indices of last two flipped cards (for display)
  lastFlipResult: 'match' | 'no-match' | null;  // Result of last flip pair
}

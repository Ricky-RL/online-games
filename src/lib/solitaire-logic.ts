import type { Card, SolitaireGameState, SolitaireResult } from './solitaire-types';

export function getCard(id: number): Card {
  return { id, suit: Math.floor(id / 13), rank: id % 13 };
}

export function isRed(cardId: number): boolean {
  const suit = Math.floor(cardId / 13);
  return suit === 1 || suit === 2;
}

export function createShuffledDeck(): number[] {
  const deck = Array.from({ length: 52 }, (_, i) => i);
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export function dealFromDeck(deck: number[]): SolitaireGameState {
  const tableau: number[][] = [[], [], [], [], [], [], []];
  const faceUp = new Set<number>();
  let idx = 0;

  for (let col = 0; col < 7; col++) {
    for (let row = 0; row <= col; row++) {
      tableau[col].push(deck[idx]);
      if (row === col) {
        faceUp.add(deck[idx]);
      }
      idx++;
    }
  }

  const stock = deck.slice(idx);

  return {
    tableau,
    foundations: [[], [], [], []],
    stock,
    waste: [],
    faceUp,
    moves: 0,
    startedAt: null,
  };
}

export function canPlaceOnTableau(cardId: number, column: number[]): boolean {
  const card = getCard(cardId);
  if (column.length === 0) {
    return card.rank === 12; // Only Kings on empty columns
  }
  const topCard = getCard(column[column.length - 1]);
  return isRed(cardId) !== isRed(column[column.length - 1]) && card.rank === topCard.rank - 1;
}

export function canPlaceOnFoundation(cardId: number, foundation: number[], suitIndex: number): boolean {
  const card = getCard(cardId);
  if (card.suit !== suitIndex) return false;
  if (foundation.length === 0) return card.rank === 0; // Ace
  const topCard = getCard(foundation[foundation.length - 1]);
  return card.rank === topCard.rank + 1;
}

export function isGameWon(foundations: number[][]): boolean {
  return foundations.every((f) => f.length === 13);
}

export function canAutoComplete(state: SolitaireGameState): boolean {
  if (state.stock.length > 0 || state.waste.length > 0) return false;
  return state.tableau.every((col) => col.every((cardId) => state.faceUp.has(cardId)));
}

export function determineSolitaireWinner(
  p1: SolitaireResult,
  p2: SolitaireResult
): 0 | 1 | 2 {
  if (p1.completed && !p2.completed) return 1;
  if (!p1.completed && p2.completed) return 2;
  if (!p1.completed && !p2.completed) return 0;
  // Both completed — fewer moves wins
  if (p1.moves < p2.moves) return 1;
  if (p2.moves < p1.moves) return 2;
  // Tie on moves — faster time wins
  if (p1.time_seconds < p2.time_seconds) return 1;
  if (p2.time_seconds < p1.time_seconds) return 2;
  return 0;
}

import { describe, it, expect } from 'vitest';
import {
  createShuffledDeck,
  dealFromDeck,
  getCard,
  isRed,
  canPlaceOnTableau,
  canPlaceOnFoundation,
  isGameWon,
  determineSolitaireWinner,
} from './solitaire-logic';
import type { SolitaireResult } from './solitaire-types';

describe('createShuffledDeck', () => {
  it('returns 52 unique card IDs', () => {
    const deck = createShuffledDeck();
    expect(deck).toHaveLength(52);
    expect(new Set(deck).size).toBe(52);
    deck.forEach((id) => {
      expect(id).toBeGreaterThanOrEqual(0);
      expect(id).toBeLessThanOrEqual(51);
    });
  });
});

describe('getCard', () => {
  it('decodes card 0 as Ace of Spades', () => {
    const card = getCard(0);
    expect(card).toEqual({ id: 0, suit: 0, rank: 0 });
  });

  it('decodes card 51 as King of Clubs', () => {
    const card = getCard(51);
    expect(card).toEqual({ id: 51, suit: 3, rank: 12 });
  });

  it('decodes card 13 as Ace of Hearts', () => {
    const card = getCard(13);
    expect(card).toEqual({ id: 13, suit: 1, rank: 0 });
  });
});

describe('isRed', () => {
  it('hearts and diamonds are red', () => {
    expect(isRed(13)).toBe(true);  // Ace of Hearts
    expect(isRed(26)).toBe(true);  // Ace of Diamonds
  });

  it('spades and clubs are black', () => {
    expect(isRed(0)).toBe(false);  // Ace of Spades
    expect(isRed(39)).toBe(false); // Ace of Clubs
  });
});

describe('dealFromDeck', () => {
  it('deals 28 cards to tableau and 24 to stock', () => {
    const deck = Array.from({ length: 52 }, (_, i) => i);
    const state = dealFromDeck(deck);
    expect(state.tableau).toHaveLength(7);
    expect(state.tableau[0]).toHaveLength(1);
    expect(state.tableau[6]).toHaveLength(7);
    expect(state.stock).toHaveLength(24);
    expect(state.waste).toHaveLength(0);
    expect(state.foundations).toEqual([[], [], [], []]);
    expect(state.moves).toBe(0);
    // Top card of each column is face-up
    state.tableau.forEach((col) => {
      expect(state.faceUp.has(col[col.length - 1])).toBe(true);
    });
  });
});

describe('canPlaceOnTableau', () => {
  it('allows any King on empty column', () => {
    expect(canPlaceOnTableau(12, [])).toBe(true);  // King of Spades
    expect(canPlaceOnTableau(25, [])).toBe(true);  // King of Hearts
  });

  it('rejects non-King on empty column', () => {
    expect(canPlaceOnTableau(0, [])).toBe(false);  // Ace of Spades
  });

  it('allows alternating color and one rank lower', () => {
    // Red Queen (rank 11, Hearts=suit 1, id=24) on Black King (rank 12, Spades=suit 0, id=12)
    expect(canPlaceOnTableau(24, [12])).toBe(true);
  });

  it('rejects same color', () => {
    // Black Queen (rank 11, Spades=suit 0, id=11) on Black King (rank 12, Spades=suit 0, id=12)
    expect(canPlaceOnTableau(11, [12])).toBe(false);
  });
});

describe('canPlaceOnFoundation', () => {
  it('allows Ace on empty foundation of matching suit', () => {
    expect(canPlaceOnFoundation(0, [], 0)).toBe(true);   // Ace of Spades on Spades foundation
  });

  it('rejects Ace on wrong suit foundation', () => {
    expect(canPlaceOnFoundation(0, [], 1)).toBe(false);  // Ace of Spades on Hearts foundation
  });

  it('allows next rank on same suit', () => {
    expect(canPlaceOnFoundation(1, [0], 0)).toBe(true);  // Two of Spades on [Ace of Spades]
  });

  it('rejects skipped rank', () => {
    expect(canPlaceOnFoundation(2, [0], 0)).toBe(false); // Three of Spades on [Ace of Spades]
  });
});

describe('isGameWon', () => {
  it('returns true when all foundations have 13 cards', () => {
    const foundations = [
      Array.from({ length: 13 }, (_, i) => i),
      Array.from({ length: 13 }, (_, i) => i + 13),
      Array.from({ length: 13 }, (_, i) => i + 26),
      Array.from({ length: 13 }, (_, i) => i + 39),
    ];
    expect(isGameWon(foundations)).toBe(true);
  });

  it('returns false when foundations incomplete', () => {
    expect(isGameWon([[], [], [], []])).toBe(false);
    expect(isGameWon([[0, 1, 2], [], [], []])).toBe(false);
  });
});

describe('determineSolitaireWinner', () => {
  const p1Win: SolitaireResult = { moves: 47, time_seconds: 300, completed: true, started_at: '', finished_at: '' };
  const p2Win: SolitaireResult = { moves: 55, time_seconds: 200, completed: true, started_at: '', finished_at: '' };
  const p1Fail: SolitaireResult = { moves: 30, time_seconds: 180, completed: false, started_at: '', finished_at: '' };
  const p2Fail: SolitaireResult = { moves: 25, time_seconds: 150, completed: false, started_at: '', finished_at: '' };

  it('player with fewer moves wins when both complete', () => {
    expect(determineSolitaireWinner(p1Win, p2Win)).toBe(1);
  });

  it('player who completed wins when other failed', () => {
    expect(determineSolitaireWinner(p1Win, p2Fail)).toBe(1);
    expect(determineSolitaireWinner(p1Fail, p2Win)).toBe(2);
  });

  it('draw when both failed', () => {
    expect(determineSolitaireWinner(p1Fail, p2Fail)).toBe(0);
  });

  it('time breaks ties on moves', () => {
    const tied1: SolitaireResult = { moves: 50, time_seconds: 300, completed: true, started_at: '', finished_at: '' };
    const tied2: SolitaireResult = { moves: 50, time_seconds: 200, completed: true, started_at: '', finished_at: '' };
    expect(determineSolitaireWinner(tied1, tied2)).toBe(2); // P2 was faster
  });

  it('draw when identical scores', () => {
    const same: SolitaireResult = { moves: 50, time_seconds: 300, completed: true, started_at: '', finished_at: '' };
    expect(determineSolitaireWinner(same, same)).toBe(0);
  });
});

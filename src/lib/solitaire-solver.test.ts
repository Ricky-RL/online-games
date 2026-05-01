import { describe, it, expect } from 'vitest';
import { isDealSolvable, createSolvableDeck } from './solitaire-solver';

describe('isDealSolvable', () => {
  it('returns true for a trivially solvable deck (sorted by suit ascending)', () => {
    // Deck arranged so aces are accessible early
    // Suits: 0=Spades(0-12), 1=Hearts(13-25), 2=Diamonds(26-38), 3=Clubs(39-51)
    // A sorted deck where tableau tops are low cards of alternating colors
    // This specific arrangement puts aces in reachable positions
    const deck = [
      0, 13, 1, 26, 14, 2, 39, 27, 15, 3, 40, 28, 16, 4, 41, 29, 17, 5, 42, 30, 18, 6, 43, 31, 19, 7, 44, 32,
      // Stock: remaining cards in a helpful order
      8, 9, 10, 11, 12, 20, 21, 22, 23, 24, 25, 33, 34, 35, 36, 37, 38, 45, 46, 47, 48, 49, 50, 51,
    ];
    // With unlimited recycling and these aces exposed, this should be solvable
    const result = isDealSolvable(deck, 100000);
    expect(result).toBe(true);
  });

  it('returns a boolean (does not throw) for a random deck', () => {
    const deck = Array.from({ length: 52 }, (_, i) => i);
    // Simple shuffle
    for (let i = 51; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    const result = isDealSolvable(deck, 10000);
    expect(typeof result).toBe('boolean');
  });
});

describe('createSolvableDeck', () => {
  it('returns a 52-card deck with all unique IDs', () => {
    const deck = createSolvableDeck(10, 30000);
    expect(deck).toHaveLength(52);
    expect(new Set(deck).size).toBe(52);
    deck.forEach((id) => {
      expect(id).toBeGreaterThanOrEqual(0);
      expect(id).toBeLessThanOrEqual(51);
    });
  });

  it('returns a deck verified as solvable', () => {
    const deck = createSolvableDeck(10, 30000);
    const solvable = isDealSolvable(deck, 30000);
    expect(solvable).toBe(true);
  });
});

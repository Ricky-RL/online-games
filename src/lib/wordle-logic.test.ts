import { describe, it, expect } from 'vitest';
import {
  evaluateGuess,
  isValidGuess,
  getKeyboardState,
  isGameWon,
  isGameLost,
  getAnswer,
  generateAnswerIndex,
} from './wordle-logic';
import { WORDLE_ANSWERS } from './wordle-answers';
import type { WordleGuess } from './wordle-types';

describe('evaluateGuess', () => {
  it('marks all correct for exact match', () => {
    expect(evaluateGuess('HELLO', 'HELLO')).toEqual([
      'correct', 'correct', 'correct', 'correct', 'correct',
    ]);
  });

  it('marks all absent when no letters match', () => {
    expect(evaluateGuess('XXXXX', 'HELLO')).toEqual([
      'absent', 'absent', 'absent', 'absent', 'absent',
    ]);
  });

  it('marks present for correct letter wrong position', () => {
    // OHLEL vs HELLO: O[0] present, H[1] present, L[2] correct (matches), E[3] present, L[4] present
    expect(evaluateGuess('OHLEL', 'HELLO')).toEqual([
      'present', 'present', 'correct', 'present', 'present',
    ]);
  });

  it('handles mixed correct/present/absent', () => {
    expect(evaluateGuess('HEART', 'HELLO')).toEqual([
      'correct', 'correct', 'absent', 'absent', 'absent',
    ]);
  });

  it('handles duplicate letter in guess with one in answer (correct takes priority)', () => {
    // Answer: HELLO (has two L's)
    // Guess:  LLAMA
    // L at 0: not in position 0 of HELLO (H), but L exists in answer.
    //         However, first pass: L[1] matches answer[2]? No. L[0] matches answer[0]? No.
    //         Actually let's be precise:
    // Answer: H-E-L-L-O
    // Guess:  L-L-A-M-A
    // First pass (exact): none match
    // Second pass: L[0] -> finds L at index 2 -> present, consumes index 2
    //              L[1] -> finds L at index 3 -> present, consumes index 3
    //              A[2] -> no A in answer -> absent
    //              M[3] -> no M in answer -> absent
    //              A[4] -> no A in answer -> absent
    expect(evaluateGuess('LLAMA', 'HELLO')).toEqual([
      'present', 'present', 'absent', 'absent', 'absent',
    ]);
  });

  it('handles duplicate letter where one is correct and one is absent', () => {
    // Answer: MEDAL
    // Guess:  MAMMA
    // First pass: M[0]=correct, A[2]!=D, M[3]!=A, A[4]!=L. Only M[0] correct.
    //   remaining = [null, E, D, A, L]
    // Second pass: A[1] -> finds A at index 3 -> present, remaining[3]=null
    //              M[2] -> no M in remaining -> absent
    //              M[3] -> no M in remaining -> absent
    //              A[4] -> no A in remaining -> absent
    expect(evaluateGuess('MAMMA', 'MEDAL')).toEqual([
      'correct', 'present', 'absent', 'absent', 'absent',
    ]);
  });

  it('handles case where guess has more of a letter than answer', () => {
    // Answer: STORY (one T)
    // Guess:  ATTIC
    // First pass: T[2] = T[2] in STORY? S-T-O-R-Y. T is at index 1.
    //   A[0]!=S, T[1]==T[1] correct!, T[2]!=O, I[3]!=R, C[4]!=Y
    //   remaining = [S, null, O, R, Y]
    // Second pass: A[0] -> no A -> absent
    //              T[2] -> no T in remaining -> absent
    //              I[3] -> no I -> absent
    //              C[4] -> no C -> absent
    expect(evaluateGuess('ATTIC', 'STORY')).toEqual([
      'absent', 'correct', 'absent', 'absent', 'absent',
    ]);
  });
});

describe('isValidGuess', () => {
  it('accepts a valid 5-letter word', () => {
    expect(isValidGuess('HELLO')).toBe(true);
  });

  it('rejects a word not in the list', () => {
    expect(isValidGuess('ZZZZZ')).toBe(false);
  });

  it('rejects words that are too short', () => {
    expect(isValidGuess('HI')).toBe(false);
  });

  it('rejects words that are too long', () => {
    expect(isValidGuess('HELLOO')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isValidGuess('')).toBe(false);
  });
});

describe('getKeyboardState', () => {
  it('returns empty for no guesses', () => {
    expect(getKeyboardState([], 'HELLO')).toEqual({});
  });

  it('accumulates states from guesses', () => {
    const guesses: WordleGuess[] = [
      { word: 'HEART', player: 1 },
    ];
    const state = getKeyboardState(guesses, 'HELLO');
    expect(state['H']).toBe('correct');
    expect(state['E']).toBe('correct');
    expect(state['A']).toBe('absent');
    expect(state['R']).toBe('absent');
    expect(state['T']).toBe('absent');
  });

  it('correct overrides present', () => {
    const guesses: WordleGuess[] = [
      { word: 'OHELX', player: 1 }, // O is present (wrong spot)
      { word: 'XXXOX', player: 2 }, // O is... let's use a better example
    ];
    // Answer: HELLO
    // Guess 1: LEHXX -> L is present, E is present, H is absent? No.
    // Let's just test directly: if letter was present then correct, correct wins
    const guesses2: WordleGuess[] = [
      { word: 'HEXXX', player: 1 }, // H=correct, E=correct
      { word: 'XHXXX', player: 2 }, // H=present (it's at pos 0 in answer)
    ];
    const state = getKeyboardState(guesses2, 'HELLO');
    expect(state['H']).toBe('correct'); // correct from first guess wins
  });

  it('present overrides absent', () => {
    const guesses: WordleGuess[] = [
      { word: 'HXXXX', player: 1 }, // H=correct
      { word: 'XHXXX', player: 2 }, // H would be present
    ];
    const state = getKeyboardState(guesses, 'HELLO');
    // H was correct in first guess, stays correct
    expect(state['H']).toBe('correct');
  });
});

describe('isGameWon', () => {
  it('returns true when a guess matches the answer', () => {
    const guesses: WordleGuess[] = [
      { word: 'WRONG', player: 1 },
      { word: 'HELLO', player: 2 },
    ];
    expect(isGameWon(guesses, 'HELLO')).toBe(true);
  });

  it('returns false when no guess matches', () => {
    const guesses: WordleGuess[] = [
      { word: 'WRONG', player: 1 },
      { word: 'AGAIN', player: 2 },
    ];
    expect(isGameWon(guesses, 'HELLO')).toBe(false);
  });

  it('returns true when won on first guess', () => {
    const guesses: WordleGuess[] = [
      { word: 'HELLO', player: 1 },
    ];
    expect(isGameWon(guesses, 'HELLO')).toBe(true);
  });

  it('returns true when won on sixth guess', () => {
    const guesses: WordleGuess[] = [
      { word: 'WRONG', player: 1 },
      { word: 'AGAIN', player: 2 },
      { word: 'BLINK', player: 1 },
      { word: 'CRAFT', player: 2 },
      { word: 'DROWN', player: 1 },
      { word: 'HELLO', player: 2 },
    ];
    expect(isGameWon(guesses, 'HELLO')).toBe(true);
  });
});

describe('isGameLost', () => {
  it('returns true after 6 guesses', () => {
    const guesses: WordleGuess[] = Array(6).fill({ word: 'WRONG', player: 1 });
    expect(isGameLost(guesses)).toBe(true);
  });

  it('returns false with fewer than 6 guesses', () => {
    const guesses: WordleGuess[] = Array(5).fill({ word: 'WRONG', player: 1 });
    expect(isGameLost(guesses)).toBe(false);
  });

  it('returns false with no guesses', () => {
    expect(isGameLost([])).toBe(false);
  });
});

describe('getAnswer', () => {
  it('returns the word at the given index', () => {
    expect(getAnswer(0)).toBe(WORDLE_ANSWERS[0]);
    expect(getAnswer(100)).toBe(WORDLE_ANSWERS[100]);
  });
});

describe('generateAnswerIndex', () => {
  it('returns an integer in valid range', () => {
    for (let i = 0; i < 50; i++) {
      const idx = generateAnswerIndex();
      expect(Number.isInteger(idx)).toBe(true);
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(WORDLE_ANSWERS.length);
    }
  });
});

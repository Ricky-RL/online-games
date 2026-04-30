import { WORDLE_ANSWERS } from './wordle-answers';
import { WORDLE_VALID_GUESSES } from './wordle-valid-guesses';
import type { LetterState, WordleGuess, KeyboardState } from './wordle-types';

const validGuessSet = new Set(WORDLE_VALID_GUESSES);

export function evaluateGuess(guess: string, answer: string): LetterState[] {
  const result: LetterState[] = Array(5).fill('absent');
  const answerChars = answer.split('');
  const guessChars = guess.split('');
  const remaining: (string | null)[] = [...answerChars];

  for (let i = 0; i < 5; i++) {
    if (guessChars[i] === answerChars[i]) {
      result[i] = 'correct';
      remaining[i] = null;
    }
  }

  for (let i = 0; i < 5; i++) {
    if (result[i] === 'correct') continue;
    const idx = remaining.indexOf(guessChars[i]);
    if (idx !== -1) {
      result[i] = 'present';
      remaining[idx] = null;
    }
  }

  return result;
}

export function isValidGuess(word: string): boolean {
  return word.length === 5 && validGuessSet.has(word);
}

export function getKeyboardState(guesses: WordleGuess[], answer: string): KeyboardState {
  const state: KeyboardState = {};

  for (const { word } of guesses) {
    const evaluation = evaluateGuess(word, answer);
    for (let i = 0; i < 5; i++) {
      const letter = word[i];
      const current = state[letter];
      const next = evaluation[i];

      if (!current || priority(next) > priority(current)) {
        state[letter] = next;
      }
    }
  }

  return state;
}

function priority(state: LetterState): number {
  if (state === 'correct') return 3;
  if (state === 'present') return 2;
  return 1;
}

export function isGameWon(guesses: WordleGuess[], answer: string): boolean {
  return guesses.some(({ word }) => word === answer);
}

export function isGameLost(guesses: WordleGuess[]): boolean {
  return guesses.length >= 6;
}

export function getAnswer(index: number, answerWord?: string | null): string {
  if (answerWord) return answerWord.toUpperCase();
  return WORDLE_ANSWERS[index];
}

export function generateAnswerIndex(): number {
  return Math.floor(Math.random() * WORDLE_ANSWERS.length);
}

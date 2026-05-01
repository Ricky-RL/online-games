import type { MathQuestion, MathTriviaBoardState } from './math-trivia-types';

type Operation = '+' | '-' | '×' | '÷';

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateQuestion(id: number, difficulty: 'easy' | 'medium'): MathQuestion {
  const ops: Operation[] = ['+', '-', '×', '÷'];
  const op = ops[randomInt(0, 3)];

  let a: number, b: number, answer: number;

  if (difficulty === 'easy') {
    switch (op) {
      case '+':
        a = randomInt(2, 9);
        b = randomInt(2, 9);
        answer = a + b;
        break;
      case '-':
        a = randomInt(5, 15);
        b = randomInt(2, a - 1);
        answer = a - b;
        break;
      case '×':
        a = randomInt(2, 9);
        b = randomInt(2, 9);
        answer = a * b;
        break;
      case '÷':
        b = randomInt(2, 9);
        answer = randomInt(2, 9);
        a = b * answer;
        break;
    }
  } else {
    switch (op) {
      case '+':
        a = randomInt(10, 50);
        b = randomInt(10, 50);
        answer = a + b;
        break;
      case '-':
        a = randomInt(20, 99);
        b = randomInt(10, a - 1);
        answer = a - b;
        break;
      case '×':
        a = randomInt(4, 12);
        b = randomInt(4, 12);
        answer = a * b;
        break;
      case '÷':
        b = randomInt(3, 12);
        answer = randomInt(3, 12);
        a = b * answer;
        break;
    }
  }

  const text = `${a} ${op} ${b}`;
  const distractors = generateDistractors(answer);
  const options = shuffle([answer, ...distractors]);

  return { id, text, correctAnswer: answer, options };
}

export function generateDistractors(correctAnswer: number): number[] {
  const distractors: number[] = [];
  const range = correctAnswer < 20 ? 5 : 15;
  const attempts = new Set<number>();
  attempts.add(correctAnswer);

  while (distractors.length < 3) {
    const offset = randomInt(1, range) * (Math.random() > 0.5 ? 1 : -1);
    const val = correctAnswer + offset;
    if (val > 0 && !attempts.has(val)) {
      attempts.add(val);
      distractors.push(val);
    }
  }

  return distractors;
}

export function generateQuestions(): MathQuestion[] {
  const questions: MathQuestion[] = [];
  const usedTexts = new Set<string>();

  for (let i = 0; i < 15; i++) {
    const difficulty = i < 5 ? 'easy' : 'medium';
    let q: MathQuestion;
    let attempts = 0;
    do {
      q = generateQuestion(i, difficulty);
      attempts++;
    } while (usedTexts.has(q.text) && attempts < 50);
    usedTexts.add(q.text);
    questions.push(q);
  }

  return questions;
}

export function createMathTriviaBoard(): MathTriviaBoardState {
  return {
    questions: generateQuestions(),
    timeLimit: 180,
    player1Result: null,
    player2Result: null,
  };
}

export function checkAnswer(question: MathQuestion, answer: number): boolean {
  return question.correctAnswer === answer;
}

export function determineWinner(board: MathTriviaBoardState): { winner: 1 | 2 | null; isDraw: boolean; reason: string } {
  const p1 = board.player1Result;
  const p2 = board.player2Result;

  if (!p1 || !p2) {
    return { winner: null, isDraw: false, reason: 'Incomplete' };
  }

  if (p1.correctCount > p2.correctCount) {
    return { winner: 1, isDraw: false, reason: `${p1.correctCount}/15 correct in ${formatTime(p1.totalTime)}` };
  }
  if (p2.correctCount > p1.correctCount) {
    return { winner: 2, isDraw: false, reason: `${p2.correctCount}/15 correct in ${formatTime(p2.totalTime)}` };
  }

  // Tied on correct count — faster time wins
  if (p1.totalTime < p2.totalTime) {
    return { winner: 1, isDraw: false, reason: `${p1.correctCount}/15 correct in ${formatTime(p1.totalTime)} (faster)` };
  }
  if (p2.totalTime < p1.totalTime) {
    return { winner: 2, isDraw: false, reason: `${p2.correctCount}/15 correct in ${formatTime(p2.totalTime)} (faster)` };
  }

  return { winner: null, isDraw: true, reason: `Both got ${p1.correctCount}/15 in ${formatTime(p1.totalTime)}` };
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

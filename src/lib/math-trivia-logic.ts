import type { MathQuestion, MathTriviaBoardState } from './math-trivia-types';

type Operation = '+' | '-' | '×' | '÷';
type QuestionCategory = 'arithmetic' | 'squares' | 'cubes' | 'percentage' | 'exponents' |
  'order-of-operations' | 'gcd' | 'modular' | 'geometry' | 'number-theory' | 'algebra' | 'fractions';

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

function gcd(a: number, b: number): number {
  while (b !== 0) {
    [a, b] = [b, a % b];
  }
  return a;
}

function lcm(a: number, b: number): number {
  return (a * b) / gcd(a, b);
}

function generateArithmeticQuestion(id: number, difficulty: 'easy' | 'medium'): MathQuestion {
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

function generateSquaresQuestion(id: number, difficulty: 'easy' | 'medium'): MathQuestion {
  const n = difficulty === 'easy' ? randomInt(2, 9) : randomInt(5, 15);
  const answer = n * n;
  const text = `${n}²`;
  const distractors = generateDistractors(answer);
  const options = shuffle([answer, ...distractors]);
  return { id, text, correctAnswer: answer, options };
}

function generateCubesQuestion(id: number, difficulty: 'easy' | 'medium'): MathQuestion {
  const n = difficulty === 'easy' ? randomInt(2, 5) : randomInt(3, 7);
  const answer = n * n * n;
  const text = `${n}³`;
  const distractors = generateDistractors(answer);
  const options = shuffle([answer, ...distractors]);
  return { id, text, correctAnswer: answer, options };
}

function generatePercentageQuestion(id: number, difficulty: 'easy' | 'medium'): MathQuestion {
  let percent: number, base: number, answer: number, text: string;

  if (difficulty === 'easy') {
    // Simple percentages: 10%, 20%, 25%, 50% of round numbers
    const easyPercents = [10, 20, 25, 50];
    percent = easyPercents[randomInt(0, easyPercents.length - 1)];
    // Ensure integer result: base must be divisible by (100/gcd(percent,100))
    const divisor = 100 / gcd(percent, 100);
    const multiplier = randomInt(1, 5);
    base = divisor * multiplier;
    answer = (percent * base) / 100;
    text = `${percent}% of ${base}`;
  } else {
    // Harder percentages: various percents of various numbers
    const percents = [5, 10, 15, 20, 25, 30, 40, 50, 75];
    percent = percents[randomInt(0, percents.length - 1)];
    // Ensure integer result
    const divisor = 100 / gcd(percent, 100);
    const multiplier = randomInt(2, 8);
    base = divisor * multiplier;
    answer = (percent * base) / 100;
    text = `${percent}% of ${base}`;
  }

  const distractors = generateDistractors(answer);
  const options = shuffle([answer, ...distractors]);
  return { id, text, correctAnswer: answer, options };
}

function generateExponentsQuestion(id: number, difficulty: 'easy' | 'medium'): MathQuestion {
  let base: number, exp: number, answer: number;

  if (difficulty === 'easy') {
    base = randomInt(2, 5);
    exp = randomInt(2, 3);
  } else {
    base = randomInt(2, 6);
    exp = randomInt(3, 4);
  }

  answer = Math.pow(base, exp);
  // Cap to avoid extremely large numbers
  if (answer > 1000) {
    base = randomInt(2, 4);
    exp = 3;
    answer = Math.pow(base, exp);
  }

  const text = `${base}^${exp}`;
  const distractors = generateDistractors(answer);
  const options = shuffle([answer, ...distractors]);
  return { id, text, correctAnswer: answer, options };
}

function generateOrderOfOperationsQuestion(id: number, difficulty: 'easy' | 'medium'): MathQuestion {
  let text: string, answer: number;

  if (difficulty === 'easy') {
    const variant = randomInt(0, 3);
    switch (variant) {
      case 0: {
        // a + b × c
        const a = randomInt(1, 9);
        const b = randomInt(2, 5);
        const c = randomInt(2, 5);
        answer = a + b * c;
        text = `${a} + ${b} × ${c}`;
        break;
      }
      case 1: {
        // a × b + c
        const a = randomInt(2, 5);
        const b = randomInt(2, 5);
        const c = randomInt(1, 9);
        answer = a * b + c;
        text = `${a} × ${b} + ${c}`;
        break;
      }
      case 2: {
        // a × b - c
        const a = randomInt(3, 6);
        const b = randomInt(3, 6);
        const c = randomInt(1, a * b - 1);
        answer = a * b - c;
        text = `${a} × ${b} - ${c}`;
        break;
      }
      default: {
        // a - b × c (ensure positive)
        const b = randomInt(2, 4);
        const c = randomInt(2, 4);
        const product = b * c;
        const a = randomInt(product + 1, product + 10);
        answer = a - b * c;
        text = `${a} - ${b} × ${c}`;
        break;
      }
    }
  } else {
    const variant = randomInt(0, 3);
    switch (variant) {
      case 0: {
        // (a + b) × c
        const a = randomInt(3, 9);
        const b = randomInt(3, 9);
        const c = randomInt(2, 6);
        answer = (a + b) * c;
        text = `(${a} + ${b}) × ${c}`;
        break;
      }
      case 1: {
        // a × (b - c)
        const a = randomInt(3, 8);
        const c = randomInt(2, 5);
        const b = randomInt(c + 1, c + 8);
        answer = a * (b - c);
        text = `${a} × (${b} - ${c})`;
        break;
      }
      case 2: {
        // a² + b
        const a = randomInt(3, 8);
        const b = randomInt(2, 15);
        answer = a * a + b;
        text = `${a}² + ${b}`;
        break;
      }
      default: {
        // a × b + c × d
        const a = randomInt(2, 6);
        const b = randomInt(2, 6);
        const c = randomInt(2, 6);
        const d = randomInt(2, 6);
        answer = a * b + c * d;
        text = `${a} × ${b} + ${c} × ${d}`;
        break;
      }
    }
  }

  const distractors = generateDistractors(answer);
  const options = shuffle([answer, ...distractors]);
  return { id, text, correctAnswer: answer, options };
}

function generateGcdQuestion(id: number, difficulty: 'easy' | 'medium'): MathQuestion {
  let a: number, b: number, answer: number;

  if (difficulty === 'easy') {
    // Numbers with obvious common factors
    const factor = randomInt(2, 6);
    a = factor * randomInt(2, 5);
    b = factor * randomInt(2, 5);
    while (a === b) b = factor * randomInt(2, 5);
  } else {
    a = randomInt(12, 48);
    b = randomInt(12, 48);
    while (a === b) b = randomInt(12, 48);
  }

  answer = gcd(a, b);
  const text = `GCD(${a}, ${b})`;
  const distractors = generateDistractors(answer);
  const options = shuffle([answer, ...distractors]);
  return { id, text, correctAnswer: answer, options };
}

function generateModularQuestion(id: number, difficulty: 'easy' | 'medium'): MathQuestion {
  let a: number, b: number, answer: number;

  if (difficulty === 'easy') {
    a = randomInt(10, 30);
    b = randomInt(3, 7);
  } else {
    a = randomInt(20, 99);
    b = randomInt(4, 12);
  }

  answer = a % b;
  // Ensure non-zero remainder for interest
  while (answer === 0) {
    a = a + 1;
    answer = a % b;
  }

  const text = `${a} mod ${b}`;
  const distractors = generateDistractors(answer);
  const options = shuffle([answer, ...distractors]);
  return { id, text, correctAnswer: answer, options };
}

function generateGeometryQuestion(id: number, difficulty: 'easy' | 'medium'): MathQuestion {
  let text: string, answer: number;

  const variant = randomInt(0, 4);
  switch (variant) {
    case 0: {
      // Perimeter of rectangle
      const w = difficulty === 'easy' ? randomInt(2, 8) : randomInt(5, 15);
      const h = difficulty === 'easy' ? randomInt(2, 8) : randomInt(5, 15);
      answer = 2 * (w + h);
      text = `Perimeter: ${w}×${h} rect`;
      break;
    }
    case 1: {
      // Area of rectangle
      const w = difficulty === 'easy' ? randomInt(2, 8) : randomInt(4, 12);
      const h = difficulty === 'easy' ? randomInt(2, 8) : randomInt(4, 12);
      answer = w * h;
      text = `Area: ${w}×${h} rect`;
      break;
    }
    case 2: {
      // Area of triangle (base × height / 2, ensure integer)
      const base = (difficulty === 'easy' ? randomInt(2, 6) : randomInt(4, 10)) * 2;
      const height = difficulty === 'easy' ? randomInt(2, 8) : randomInt(3, 12);
      answer = (base * height) / 2;
      text = `△ area: b=${base}, h=${height}`;
      break;
    }
    case 3: {
      // Perimeter of square
      const s = difficulty === 'easy' ? randomInt(3, 12) : randomInt(7, 25);
      answer = 4 * s;
      text = `Perimeter: square s=${s}`;
      break;
    }
    default: {
      // Volume of cube
      const s = difficulty === 'easy' ? randomInt(2, 5) : randomInt(3, 7);
      answer = s * s * s;
      text = `Volume: cube s=${s}`;
      break;
    }
  }

  const distractors = generateDistractors(answer);
  const options = shuffle([answer, ...distractors]);
  return { id, text, correctAnswer: answer, options };
}

function generateNumberTheoryQuestion(id: number, difficulty: 'easy' | 'medium'): MathQuestion {
  let text: string, answer: number;

  const variant = randomInt(0, 3);
  switch (variant) {
    case 0: {
      // LCM of two numbers
      const a = difficulty === 'easy' ? randomInt(2, 6) : randomInt(4, 12);
      const b = difficulty === 'easy' ? randomInt(2, 6) : randomInt(4, 12);
      answer = lcm(a, b);
      text = `LCM(${a}, ${b})`;
      break;
    }
    case 1: {
      // Factorial (small numbers)
      const n = difficulty === 'easy' ? randomInt(3, 5) : randomInt(4, 6);
      answer = 1;
      for (let i = 2; i <= n; i++) answer *= i;
      text = `${n}!`;
      break;
    }
    case 2: {
      // Sum of digits
      const num = difficulty === 'easy' ? randomInt(10, 99) : randomInt(100, 999);
      answer = String(num).split('').reduce((s, d) => s + parseInt(d), 0);
      text = `Digit sum of ${num}`;
      break;
    }
    default: {
      // Number of factors
      const candidates = difficulty === 'easy'
        ? [6, 8, 10, 12, 15, 16, 18, 20]
        : [24, 28, 30, 36, 40, 42, 48, 56];
      const num = candidates[randomInt(0, candidates.length - 1)];
      answer = 0;
      for (let i = 1; i <= num; i++) {
        if (num % i === 0) answer++;
      }
      text = `Factors of ${num}: how many?`;
      break;
    }
  }

  const distractors = generateDistractors(answer);
  const options = shuffle([answer, ...distractors]);
  return { id, text, correctAnswer: answer, options };
}

function generateAlgebraQuestion(id: number, difficulty: 'easy' | 'medium'): MathQuestion {
  let text: string, answer: number;

  const variant = randomInt(0, 3);
  switch (variant) {
    case 0: {
      // Solve a × x = b (find x)
      const x = difficulty === 'easy' ? randomInt(2, 9) : randomInt(3, 15);
      const a = difficulty === 'easy' ? randomInt(2, 6) : randomInt(3, 9);
      const b = a * x;
      answer = x;
      text = `${a}x = ${b}, x = ?`;
      break;
    }
    case 1: {
      // Solve x + a = b (find x)
      const x = difficulty === 'easy' ? randomInt(2, 15) : randomInt(5, 30);
      const a = difficulty === 'easy' ? randomInt(3, 12) : randomInt(10, 25);
      const b = x + a;
      answer = x;
      text = `x + ${a} = ${b}, x = ?`;
      break;
    }
    case 2: {
      // Solve x/a = b (find x)
      const a = difficulty === 'easy' ? randomInt(2, 5) : randomInt(3, 8);
      const b = difficulty === 'easy' ? randomInt(2, 8) : randomInt(3, 12);
      answer = a * b;
      text = `x ÷ ${a} = ${b}, x = ?`;
      break;
    }
    default: {
      // Solve ax + b = c (find x)
      const x = difficulty === 'easy' ? randomInt(2, 6) : randomInt(2, 10);
      const a = difficulty === 'easy' ? randomInt(2, 4) : randomInt(2, 7);
      const b = difficulty === 'easy' ? randomInt(1, 10) : randomInt(3, 15);
      const c = a * x + b;
      answer = x;
      text = `${a}x + ${b} = ${c}, x = ?`;
      break;
    }
  }

  const distractors = generateDistractors(answer);
  const options = shuffle([answer, ...distractors]);
  return { id, text, correctAnswer: answer, options };
}

function generateFractionsQuestion(id: number, difficulty: 'easy' | 'medium'): MathQuestion {
  let text: string, answer: number;

  const variant = randomInt(0, 2);
  switch (variant) {
    case 0: {
      // a/b + c/d = ? (as simplified numerator over common denominator, ask for numerator)
      // Keep it simple — same denominator
      const denom = difficulty === 'easy' ? randomInt(3, 8) : randomInt(5, 12);
      const num1 = randomInt(1, denom - 1);
      const num2 = randomInt(1, denom - 1);
      answer = num1 + num2;
      text = `${num1}/${denom} + ${num2}/${denom} = ?/${denom}`;
      break;
    }
    case 1: {
      // a/b of c (fraction of a number)
      const denom = difficulty === 'easy' ? randomInt(2, 5) : randomInt(3, 8);
      const num = randomInt(1, denom - 1);
      const multiple = difficulty === 'easy' ? randomInt(2, 6) : randomInt(3, 10);
      const whole = denom * multiple;
      answer = num * multiple;
      text = `${num}/${denom} of ${whole}`;
      break;
    }
    default: {
      // What is a × b/c (multiplication with fraction, integer result)
      const c = difficulty === 'easy' ? randomInt(2, 5) : randomInt(3, 8);
      const b = randomInt(1, c);
      const multiple = difficulty === 'easy' ? randomInt(2, 6) : randomInt(2, 8);
      const a = c * multiple;
      answer = a * b / c;
      text = `${a} × ${b}/${c}`;
      break;
    }
  }

  const distractors = generateDistractors(answer);
  const options = shuffle([answer, ...distractors]);
  return { id, text, correctAnswer: answer, options };
}

function generateQuestion(id: number, difficulty: 'easy' | 'medium'): MathQuestion {
  // Weighted category selection — arithmetic gets some weight to maintain variety
  // but we now have many more categories
  const categories: QuestionCategory[] = [
    'arithmetic', 'arithmetic',
    'squares', 'cubes',
    'percentage', 'exponents',
    'order-of-operations', 'order-of-operations',
    'gcd', 'modular',
    'geometry', 'geometry',
    'number-theory', 'algebra', 'algebra',
    'fractions',
  ];
  const category = categories[randomInt(0, categories.length - 1)];

  switch (category) {
    case 'arithmetic':
      return generateArithmeticQuestion(id, difficulty);
    case 'squares':
      return generateSquaresQuestion(id, difficulty);
    case 'cubes':
      return generateCubesQuestion(id, difficulty);
    case 'percentage':
      return generatePercentageQuestion(id, difficulty);
    case 'exponents':
      return generateExponentsQuestion(id, difficulty);
    case 'order-of-operations':
      return generateOrderOfOperationsQuestion(id, difficulty);
    case 'gcd':
      return generateGcdQuestion(id, difficulty);
    case 'modular':
      return generateModularQuestion(id, difficulty);
    case 'geometry':
      return generateGeometryQuestion(id, difficulty);
    case 'number-theory':
      return generateNumberTheoryQuestion(id, difficulty);
    case 'algebra':
      return generateAlgebraQuestion(id, difficulty);
    case 'fractions':
      return generateFractionsQuestion(id, difficulty);
    default:
      return generateArithmeticQuestion(id, difficulty);
  }
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

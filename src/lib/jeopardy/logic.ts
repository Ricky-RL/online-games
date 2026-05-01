import { QUESTION_VALUES } from './types';
import type { JeopardyBoard, CategoryInput } from './types';

export function createInitialBoard(categories: CategoryInput[]): JeopardyBoard {
  return {
    categories: categories.map((cat) => ({
      name: cat.name,
      questions: cat.questions.map((q, i) => ({
        value: QUESTION_VALUES[i],
        question: q.question,
        correctAnswer: q.correctAnswer,
        incorrectAnswers: q.incorrectAnswers,
        answered: false,
        answeredBy: null,
      })),
    })),
    scores: [0, 0],
    phase: 'picking',
    currentPicker: 1,
    activeQuestion: null,
    lastAnswerCorrect: null,
    lastAnswerPlayer: null,
    winner: null,
    version: 0,
  };
}

export function pickQuestion(board: JeopardyBoard, catIndex: number, qIndex: number): JeopardyBoard {
  const q = board.categories[catIndex]?.questions[qIndex];
  if (!q || q.answered || board.phase !== 'picking') return board;

  return {
    ...board,
    phase: 'answering',
    activeQuestion: { catIndex, qIndex },
    version: board.version + 1,
  };
}

export function submitAnswer(board: JeopardyBoard, playerNum: number, answer: string): JeopardyBoard {
  if (board.phase !== 'answering' || !board.activeQuestion) return board;

  const { catIndex, qIndex } = board.activeQuestion;
  const question = board.categories[catIndex].questions[qIndex];
  const isCorrect = normalizeAnswer(answer) === normalizeAnswer(question.correctAnswer);

  const newCategories = board.categories.map((cat, ci) => {
    if (ci !== catIndex) return cat;
    return {
      ...cat,
      questions: cat.questions.map((q, qi) => {
        if (qi !== qIndex) return q;
        return { ...q, answered: true, answeredBy: isCorrect ? playerNum : null };
      }),
    };
  });

  const newScores: [number, number] = [...board.scores] as [number, number];
  if (isCorrect) {
    newScores[playerNum - 1] += question.value;
  }

  const nextPicker = isCorrect ? playerNum : (playerNum === 1 ? 2 : 1);

  return {
    ...board,
    categories: newCategories,
    scores: newScores,
    phase: 'result',
    lastAnswerCorrect: isCorrect,
    lastAnswerPlayer: playerNum,
    currentPicker: nextPicker,
    version: board.version + 1,
  };
}

export function advanceFromResult(board: JeopardyBoard): JeopardyBoard {
  if (board.phase !== 'result') return board;

  const gameOver = isGameOver(board);

  return {
    ...board,
    phase: gameOver ? 'game-over' : 'picking',
    activeQuestion: null,
    lastAnswerCorrect: null,
    lastAnswerPlayer: null,
    winner: gameOver ? getWinner(board) : null,
    version: board.version + 1,
  };
}

export function isGameOver(board: JeopardyBoard): boolean {
  return board.categories.every((cat) => cat.questions.every((q) => q.answered));
}

export function getWinner(board: JeopardyBoard): number | null {
  if (board.scores[0] > board.scores[1]) return 1;
  if (board.scores[1] > board.scores[0]) return 2;
  return null;
}

function normalizeAnswer(answer: string): string {
  return answer
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeHtml(html: string): string {
  const txt = typeof document !== 'undefined'
    ? (() => { const el = document.createElement('textarea'); el.innerHTML = html; return el.value; })()
    : html.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#039;/g, "'");
  return txt;
}

export async function fetchTriviaQuestions(): Promise<CategoryInput[]> {
  const res = await fetch('https://opentdb.com/api.php?amount=30&type=multiple');
  const data = await res.json();

  if (data.response_code !== 0 || !data.results || data.results.length < 30) {
    throw new Error('Failed to fetch trivia questions');
  }

  const byCategory = new Map<string, Array<{ question: string; correctAnswer: string; incorrectAnswers: string[] }>>();

  for (const item of data.results) {
    const cat = decodeHtml(item.category);
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat)!.push({
      question: decodeHtml(item.question),
      correctAnswer: decodeHtml(item.correct_answer),
      incorrectAnswers: item.incorrect_answers.map((a: string) => decodeHtml(a)),
    });
  }

  const categories: CategoryInput[] = [];
  for (const [name, questions] of byCategory) {
    if (questions.length >= 5) {
      categories.push({ name, questions: questions.slice(0, 5) });
    }
    if (categories.length === 6) break;
  }

  // If we don't have 6 full categories, pad with mixed categories
  if (categories.length < 6) {
    const allQuestions = data.results.map((item: { category: string; question: string; correct_answer: string; incorrect_answers: string[] }) => ({
      question: decodeHtml(item.question),
      correctAnswer: decodeHtml(item.correct_answer),
      incorrectAnswers: item.incorrect_answers.map((a: string) => decodeHtml(a)),
    }));

    const used = new Set(categories.flatMap((c) => c.questions.map((q) => q.question)));
    const remaining = allQuestions.filter((q: { question: string }) => !used.has(q.question));

    while (categories.length < 6 && remaining.length >= 5) {
      categories.push({
        name: `Mixed ${categories.length + 1}`,
        questions: remaining.splice(0, 5),
      });
    }
  }

  return categories.slice(0, 6);
}

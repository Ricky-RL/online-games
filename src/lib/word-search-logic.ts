import type { Direction, WordPlacement, WordSearchBoardState } from './word-search-types';

export const GRID_SIZE = 10;
export const TIME_LIMIT = 300; // 5 minutes in seconds

export const DIRECTION_VECTORS: Record<Direction, [number, number]> = {
  'right': [0, 1],
  'left': [0, -1],
  'down': [1, 0],
  'up': [-1, 0],
  'down-right': [1, 1],
  'down-left': [1, -1],
  'up-right': [-1, 1],
  'up-left': [-1, -1],
};

const ALL_DIRECTIONS: Direction[] = Object.keys(DIRECTION_VECTORS) as Direction[];

export function getWordCells(placement: WordPlacement): [number, number][] {
  const [dr, dc] = DIRECTION_VECTORS[placement.direction];
  const cells: [number, number][] = [];
  let [r, c] = placement.start;
  for (let i = 0; i < placement.word.length; i++) {
    cells.push([r, c]);
    r += dr;
    c += dc;
  }
  return cells;
}

function canPlace(grid: (string | null)[][], word: string, startRow: number, startCol: number, direction: Direction): boolean {
  const [dr, dc] = DIRECTION_VECTORS[direction];
  let r = startRow;
  let c = startCol;
  for (let i = 0; i < word.length; i++) {
    if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) return false;
    if (grid[r][c] !== null && grid[r][c] !== word[i]) return false;
    r += dr;
    c += dc;
  }
  return true;
}

function placeWord(grid: (string | null)[][], word: string, startRow: number, startCol: number, direction: Direction): WordPlacement {
  const [dr, dc] = DIRECTION_VECTORS[direction];
  let r = startRow;
  let c = startCol;
  for (let i = 0; i < word.length; i++) {
    grid[r][c] = word[i];
    r += dr;
    c += dc;
  }
  const endRow = startRow + dr * (word.length - 1);
  const endCol = startCol + dc * (word.length - 1);
  return { word, start: [startRow, startCol], end: [endRow, endCol], direction };
}

function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function generateGrid(words: string[]): { grid: string[][]; words: WordPlacement[] } {
  const grid: (string | null)[][] = Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => null)
  );
  const placements: WordPlacement[] = [];

  const sortedWords = [...words].sort((a, b) => b.length - a.length);

  for (const word of sortedWords) {
    let placed = false;
    const directions = shuffle(ALL_DIRECTIONS);

    for (let attempt = 0; attempt < 100 && !placed; attempt++) {
      const dir = directions[attempt % directions.length];
      const row = Math.floor(Math.random() * GRID_SIZE);
      const col = Math.floor(Math.random() * GRID_SIZE);

      if (canPlace(grid, word, row, col, dir)) {
        placements.push(placeWord(grid, word, row, col, dir));
        placed = true;
      }
    }
  }

  // Fill empty cells with random letters
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const filledGrid: string[][] = grid.map((row) =>
    row.map((cell) => cell ?? letters[Math.floor(Math.random() * 26)])
  );

  return { grid: filledGrid, words: placements };
}

export function selectWordsFromPack(packWords: string[], count: number): string[] {
  return shuffle(packWords).slice(0, count);
}

export function createWordSearchBoard(themeId: string, themeWords: string[]): WordSearchBoardState {
  const wordCount = 8 + Math.floor(Math.random() * 5); // 8-12 words
  const selectedWords = selectWordsFromPack(themeWords, Math.min(wordCount, themeWords.length));
  const { grid, words } = generateGrid(selectedWords);

  return {
    grid,
    words,
    theme: themeId,
    timeLimit: TIME_LIMIT,
    player1Result: null,
    player2Result: null,
  };
}

export function checkSelection(board: WordSearchBoardState, start: [number, number], end: [number, number]): string | null {
  for (const placement of board.words) {
    if (
      (placement.start[0] === start[0] && placement.start[1] === start[1] &&
       placement.end[0] === end[0] && placement.end[1] === end[1]) ||
      (placement.start[0] === end[0] && placement.start[1] === end[1] &&
       placement.end[0] === start[0] && placement.end[1] === start[1])
    ) {
      return placement.word;
    }
  }
  return null;
}

export function determineWinner(board: WordSearchBoardState): { winner: 1 | 2 | null; isDraw: boolean } {
  const p1 = board.player1Result;
  const p2 = board.player2Result;
  if (!p1 || !p2) return { winner: null, isDraw: false };

  const p1Count = p1.foundWords.length;
  const p2Count = p2.foundWords.length;

  if (p1Count > p2Count) return { winner: 1, isDraw: false };
  if (p2Count > p1Count) return { winner: 2, isDraw: false };

  // Tied on words — faster time wins
  if (p1.timeUsed < p2.timeUsed) return { winner: 1, isDraw: false };
  if (p2.timeUsed < p1.timeUsed) return { winner: 2, isDraw: false };

  return { winner: null, isDraw: true };
}

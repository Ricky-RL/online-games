export type Difficulty = 'easy' | 'medium' | 'hard';

export interface SudokuCell {
  value: number | null;
  isGiven: boolean;
  pencilMarks: number[];
  placedBy: string | null;
}

export type SudokuGrid = SudokuCell[][];

export interface SudokuBoardState {
  grid: SudokuGrid;
  solution: number[][];
  difficulty: Difficulty;
  moveCount: number;
  startedAt: string;
  completedAt: string | null;
}

const GIVEN_COUNTS: Record<Difficulty, number> = {
  easy: 40,
  medium: 32,
  hard: 26,
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function isValidPlacement(grid: number[][], row: number, col: number, num: number): boolean {
  for (let c = 0; c < 9; c++) {
    if (grid[row][c] === num) return false;
  }
  for (let r = 0; r < 9; r++) {
    if (grid[r][col] === num) return false;
  }
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let r = boxRow; r < boxRow + 3; r++) {
    for (let c = boxCol; c < boxCol + 3; c++) {
      if (grid[r][c] === num) return false;
    }
  }
  return true;
}

function fillGrid(grid: number[][]): boolean {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (grid[row][col] === 0) {
        const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
        for (const num of nums) {
          if (isValidPlacement(grid, row, col, num)) {
            grid[row][col] = num;
            if (fillGrid(grid)) return true;
            grid[row][col] = 0;
          }
        }
        return false;
      }
    }
  }
  return true;
}

function countSolutions(grid: number[][], limit: number): number {
  let count = 0;
  function solve(): boolean {
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (grid[row][col] === 0) {
          for (let num = 1; num <= 9; num++) {
            if (isValidPlacement(grid, row, col, num)) {
              grid[row][col] = num;
              if (solve()) return true;
              grid[row][col] = 0;
            }
          }
          return false;
        }
      }
    }
    count++;
    return count >= limit;
  }
  solve();
  return count;
}

export function generatePuzzle(difficulty: Difficulty): { puzzle: number[][]; solution: number[][] } {
  const grid: number[][] = Array.from({ length: 9 }, () => Array(9).fill(0));
  fillGrid(grid);

  const solution = grid.map((row) => [...row]);
  const puzzle = grid.map((row) => [...row]);

  const positions = shuffle(
    Array.from({ length: 81 }, (_, i) => [Math.floor(i / 9), i % 9] as [number, number])
  );

  const targetGivens = GIVEN_COUNTS[difficulty];
  let currentGivens = 81;

  for (const [row, col] of positions) {
    if (currentGivens <= targetGivens) break;

    const backup = puzzle[row][col];
    puzzle[row][col] = 0;

    const testGrid = puzzle.map((r) => [...r]);
    const solutions = countSolutions(testGrid, 2);

    if (solutions !== 1) {
      puzzle[row][col] = backup;
    } else {
      currentGivens--;
    }
  }

  return { puzzle, solution };
}

export function createInitialBoard(difficulty: Difficulty): SudokuBoardState {
  const { puzzle, solution } = generatePuzzle(difficulty);

  const grid: SudokuGrid = puzzle.map((row) =>
    row.map((value) => ({
      value: value === 0 ? null : value,
      isGiven: value !== 0,
      pencilMarks: [],
      placedBy: null,
    }))
  );

  return {
    grid,
    solution,
    difficulty,
    moveCount: 0,
    startedAt: new Date().toISOString(),
    completedAt: null,
  };
}

export function placeNumber(
  board: SudokuBoardState,
  row: number,
  col: number,
  value: number,
  playerName: string
): SudokuBoardState {
  if (board.grid[row][col].isGiven) return board;

  const newGrid = board.grid.map((r) => r.map((c) => ({ ...c })));
  newGrid[row][col] = {
    value,
    isGiven: false,
    pencilMarks: [],
    placedBy: playerName,
  };

  return {
    ...board,
    grid: newGrid,
    moveCount: board.moveCount + 1,
  };
}

export function clearCell(board: SudokuBoardState, row: number, col: number): SudokuBoardState {
  if (board.grid[row][col].isGiven) return board;

  const newGrid = board.grid.map((r) => r.map((c) => ({ ...c })));
  newGrid[row][col] = {
    value: null,
    isGiven: false,
    pencilMarks: [],
    placedBy: null,
  };

  return {
    ...board,
    grid: newGrid,
  };
}

export function togglePencilMark(
  board: SudokuBoardState,
  row: number,
  col: number,
  value: number
): SudokuBoardState {
  const cell = board.grid[row][col];
  if (cell.isGiven || cell.value !== null) return board;

  const newGrid = board.grid.map((r) => r.map((c) => ({ ...c })));
  const marks = [...cell.pencilMarks];
  const idx = marks.indexOf(value);
  if (idx >= 0) {
    marks.splice(idx, 1);
  } else {
    marks.push(value);
    marks.sort();
  }
  newGrid[row][col] = { ...cell, pencilMarks: marks };

  return { ...board, grid: newGrid };
}

export function getConflicts(grid: SudokuGrid): Set<string> {
  const conflicts = new Set<string>();

  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const val = grid[row][col].value;
      if (val === null) continue;

      for (let c = 0; c < 9; c++) {
        if (c !== col && grid[row][c].value === val) {
          conflicts.add(`${row},${col}`);
          conflicts.add(`${row},${c}`);
        }
      }

      for (let r = 0; r < 9; r++) {
        if (r !== row && grid[r][col].value === val) {
          conflicts.add(`${row},${col}`);
          conflicts.add(`${r},${col}`);
        }
      }

      const boxRow = Math.floor(row / 3) * 3;
      const boxCol = Math.floor(col / 3) * 3;
      for (let r = boxRow; r < boxRow + 3; r++) {
        for (let c = boxCol; c < boxCol + 3; c++) {
          if (r !== row || c !== col) {
            if (grid[r][c].value === val) {
              conflicts.add(`${row},${col}`);
              conflicts.add(`${r},${c}`);
            }
          }
        }
      }
    }
  }

  return conflicts;
}

export function isBoardComplete(board: SudokuBoardState): boolean {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (board.grid[row][col].value === null) return false;
    }
  }
  return true;
}

export function isBoardCorrect(board: SudokuBoardState): boolean {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (board.grid[row][col].value !== board.solution[row][col]) return false;
    }
  }
  return true;
}

export function checkWin(board: SudokuBoardState): boolean {
  return isBoardComplete(board) && isBoardCorrect(board);
}

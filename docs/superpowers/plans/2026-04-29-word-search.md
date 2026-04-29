# Word Search Game Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an async two-player competitive word search game where both players search the same 10x10 grid for hidden themed words within 5 minutes, then compare results.

**Architecture:** Single row in existing `games` table with `game_type: 'word-search'`. Board JSONB stores grid, word placements, and per-player results. Client-side grid generation when Player 1 creates game. Hook hides opponent results until both submit.

**Tech Stack:** Next.js 16 (App Router), React 19, Supabase (PostgreSQL + polling), Tailwind CSS 4, Framer Motion, Vitest

---

## File Structure

**New files:**
- `src/lib/word-search-types.ts` — Type definitions for word search
- `src/lib/word-search-themes.ts` — Theme pack definitions (word lists)
- `src/lib/word-search-logic.ts` — Grid generation, word placement, validation
- `src/lib/word-search-logic.test.ts` — Unit tests for game logic
- `src/hooks/useWordSearchGame.ts` — Game state hook (polling, submission, info hiding)
- `src/app/word-search/page.tsx` — Lobby (theme pack selection + matchmaking)
- `src/app/word-search/[gameId]/page.tsx` — Game page (grid, timer, word list)
- `src/components/word-search/Grid.tsx` — Interactive letter grid with swipe selection
- `src/components/word-search/WordList.tsx` — Word checklist (found/unfound)
- `src/components/word-search/Timer.tsx` — 5-minute countdown display
- `src/components/word-search/Results.tsx` — Comparison view (post-game + match history detail)

**Modified files:**
- `src/lib/types.ts` — Add WordSearch types
- `src/lib/inbox-types.ts` — Add `'word-search'` to InboxGameType
- `src/hooks/useInbox.ts` — Add `'word-search'` to game_type filter
- `src/components/inbox/InboxGameItem.tsx` — Add icon + label
- `src/lib/match-results.ts` — Add `'word-search'` to GameType
- `src/components/MatchHistory.tsx` — Add icon, label, outcomeText
- `src/app/page.tsx` — Add Word Search game card + handler

---

### Task 1: Word Search Types

**Files:**
- Create: `src/lib/word-search-types.ts`

- [ ] **Step 1: Create type definitions**

```typescript
// src/lib/word-search-types.ts
import type { Player } from './types';

export type Direction = 'right' | 'left' | 'down' | 'up' | 'down-right' | 'down-left' | 'up-right' | 'up-left';

export interface WordPlacement {
  word: string;
  start: [number, number]; // [row, col]
  end: [number, number];   // [row, col]
  direction: Direction;
}

export interface PlayerResult {
  foundWords: string[];
  timeUsed: number; // seconds
  startedAt: string; // ISO timestamp
  submittedAt: string; // ISO timestamp
}

export interface WordSearchBoardState {
  grid: string[][]; // 10x10 uppercase letters
  words: WordPlacement[];
  theme: string;
  timeLimit: number; // seconds (300)
  player1Result: PlayerResult | null;
  player2Result: PlayerResult | null;
}

export interface WordSearchGame {
  id: string;
  game_type: 'word-search';
  board: WordSearchBoardState;
  current_turn: Player;
  winner: Player | null;
  player1_id: string | null;
  player2_id: string | null;
  player1_name: string | null;
  player2_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface ThemePack {
  id: string;
  name: string;
  words: string[]; // pool of 15-20 words
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/word-search-types.ts
git commit -m "feat(word-search): add type definitions"
```

---

### Task 2: Theme Packs

**Files:**
- Create: `src/lib/word-search-themes.ts`

- [ ] **Step 1: Create theme pack definitions**

```typescript
// src/lib/word-search-themes.ts
import type { ThemePack } from './word-search-types';

export const THEME_PACKS: ThemePack[] = [
  {
    id: 'animals',
    name: 'Animals',
    words: ['TIGER', 'LION', 'ELEPHANT', 'GIRAFFE', 'PENGUIN', 'DOLPHIN', 'EAGLE', 'PYTHON', 'ZEBRA', 'MONKEY', 'RABBIT', 'FALCON', 'WHALE', 'PANDA', 'KOALA'],
  },
  {
    id: 'food',
    name: 'Food',
    words: ['PIZZA', 'SUSHI', 'BURGER', 'TACO', 'PASTA', 'WAFFLE', 'MANGO', 'STEAK', 'SALMON', 'COOKIE', 'PRETZEL', 'RAMEN', 'CREPE', 'DONUT', 'BAGEL'],
  },
  {
    id: 'countries',
    name: 'Countries',
    words: ['BRAZIL', 'JAPAN', 'FRANCE', 'EGYPT', 'CANADA', 'MEXICO', 'INDIA', 'SPAIN', 'ITALY', 'PERU', 'NORWAY', 'CHILE', 'CUBA', 'GHANA', 'NEPAL'],
  },
  {
    id: 'sports',
    name: 'Sports',
    words: ['TENNIS', 'SOCCER', 'HOCKEY', 'RUGBY', 'BOXING', 'SKIING', 'DIVING', 'SURFING', 'ROWING', 'FENCING', 'GOLF', 'KARATE', 'POLO', 'SQUASH', 'ARCHERY'],
  },
  {
    id: 'colors',
    name: 'Colors',
    words: ['CRIMSON', 'VIOLET', 'INDIGO', 'SCARLET', 'BRONZE', 'SILVER', 'GOLDEN', 'CORAL', 'IVORY', 'MAROON', 'TEAL', 'AMBER', 'JADE', 'RUBY', 'COBALT'],
  },
  {
    id: 'movies',
    name: 'Movies',
    words: ['JAWS', 'FROZEN', 'ALIEN', 'ROCKY', 'SHREK', 'BAMBI', 'MULAN', 'BRAVE', 'COCO', 'DUNE', 'JOKER', 'TENET', 'MOANA', 'PSYCHO', 'GREASE'],
  },
];
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/word-search-themes.ts
git commit -m "feat(word-search): add theme pack definitions"
```

---

### Task 3: Grid Generation Logic (with TDD)

**Files:**
- Create: `src/lib/word-search-logic.ts`
- Create: `src/lib/word-search-logic.test.ts`

- [ ] **Step 1: Write failing tests for grid generation**

```typescript
// src/lib/word-search-logic.test.ts
import { describe, it, expect } from 'vitest';
import { generateGrid, GRID_SIZE, DIRECTION_VECTORS, getWordCells } from './word-search-logic';
import type { WordPlacement } from './word-search-types';

describe('word-search-logic', () => {
  describe('generateGrid', () => {
    it('returns a 10x10 grid of uppercase letters', () => {
      const result = generateGrid(['TIGER', 'LION', 'EAGLE']);
      expect(result.grid).toHaveLength(GRID_SIZE);
      result.grid.forEach((row) => {
        expect(row).toHaveLength(GRID_SIZE);
        row.forEach((cell) => {
          expect(cell).toMatch(/^[A-Z]$/);
        });
      });
    });

    it('places all requested words in the grid', () => {
      const words = ['TIGER', 'LION', 'EAGLE'];
      const result = generateGrid(words);
      expect(result.words).toHaveLength(3);
      result.words.forEach((placement) => {
        expect(words).toContain(placement.word);
      });
    });

    it('placed words match grid content', () => {
      const result = generateGrid(['TIGER', 'LION']);
      result.words.forEach((placement) => {
        const cells = getWordCells(placement);
        const extracted = cells.map(([r, c]) => result.grid[r][c]).join('');
        expect(extracted).toBe(placement.word);
      });
    });

    it('handles maximum word count (12 words)', () => {
      const words = ['TIGER', 'LION', 'EAGLE', 'PANDA', 'WHALE', 'ZEBRA', 'COBRA', 'DOVE', 'FROG', 'BEAR', 'WOLF', 'DEER'];
      const result = generateGrid(words);
      expect(result.words.length).toBeGreaterThanOrEqual(8);
    });
  });

  describe('getWordCells', () => {
    it('returns correct cells for a horizontal word', () => {
      const placement: WordPlacement = { word: 'CAT', start: [0, 0], end: [0, 2], direction: 'right' };
      const cells = getWordCells(placement);
      expect(cells).toEqual([[0, 0], [0, 1], [0, 2]]);
    });

    it('returns correct cells for a diagonal word', () => {
      const placement: WordPlacement = { word: 'HI', start: [1, 1], end: [2, 2], direction: 'down-right' };
      const cells = getWordCells(placement);
      expect(cells).toEqual([[1, 1], [2, 2]]);
    });

    it('returns correct cells for a reversed word', () => {
      const placement: WordPlacement = { word: 'ABC', start: [0, 2], end: [0, 0], direction: 'left' };
      const cells = getWordCells(placement);
      expect(cells).toEqual([[0, 2], [0, 1], [0, 0]]);
    });
  });

  describe('DIRECTION_VECTORS', () => {
    it('has all 8 directions', () => {
      expect(Object.keys(DIRECTION_VECTORS)).toHaveLength(8);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/word-search-logic.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement grid generation**

```typescript
// src/lib/word-search-logic.ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/word-search-logic.test.ts`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/word-search-logic.ts src/lib/word-search-logic.test.ts
git commit -m "feat(word-search): add grid generation and game logic with tests"
```

---

### Task 4: Game State Hook

**Files:**
- Create: `src/hooks/useWordSearchGame.ts`

- [ ] **Step 1: Create the game state hook**

```typescript
// src/hooks/useWordSearchGame.ts
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { WordSearchGame, WordSearchBoardState, PlayerResult } from '@/lib/word-search-types';
import { determineWinner } from '@/lib/word-search-logic';
import { recordMatchResult } from '@/lib/match-results';

const POLL_INTERVAL = 1500;

interface UseWordSearchGameReturn {
  game: WordSearchGame | null;
  loading: boolean;
  error: string | null;
  deleted: boolean;
  submitResult: (result: PlayerResult) => Promise<void>;
  myResult: PlayerResult | null;
  opponentResult: PlayerResult | null;
  bothSubmitted: boolean;
}

export function useWordSearchGame(gameId: string): UseWordSearchGameReturn {
  const [game, setGame] = useState<WordSearchGame | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleted, setDeleted] = useState(false);
  const mountedRef = useRef(true);
  const recordedRef = useRef(false);

  const getPlayerName = () => {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem('player-name') || localStorage.getItem('player-name');
  };

  const getMyPlayerNumber = (): 1 | 2 | null => {
    const name = getPlayerName();
    if (!name || !game) return null;
    if (game.player1_name === name) return 1;
    if (game.player2_name === name) return 2;
    return null;
  };

  // Fetch game state
  const fetchGame = useCallback(async () => {
    const { data, error: fetchError } = await supabase
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single();

    if (!mountedRef.current) return;

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        setDeleted(true);
      } else {
        setError(fetchError.message);
      }
      setLoading(false);
      return;
    }

    if (data.game_type === 'ended') {
      setDeleted(true);
      setLoading(false);
      return;
    }

    setGame(data as WordSearchGame);
    setLoading(false);
  }, [gameId]);

  // Polling
  useEffect(() => {
    mountedRef.current = true;
    fetchGame();
    const interval = setInterval(fetchGame, POLL_INTERVAL);
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [fetchGame]);

  // Record match result when both players have submitted
  useEffect(() => {
    if (!game || recordedRef.current) return;
    const board = game.board as WordSearchBoardState;
    if (!board.player1Result || !board.player2Result) return;
    if (game.winner === null && !recordedRef.current) return; // winner not yet set

    recordedRef.current = true;
  }, [game]);

  const submitResult = useCallback(async (result: PlayerResult) => {
    if (!game) return;
    const playerNumber = getMyPlayerNumber();
    if (!playerNumber) return;

    const board = game.board as WordSearchBoardState;
    const resultKey = playerNumber === 1 ? 'player1Result' : 'player2Result';
    const updatedBoard: WordSearchBoardState = { ...board, [resultKey]: result };

    // Check if both have now submitted
    const otherKey = playerNumber === 1 ? 'player2Result' : 'player1Result';
    const bothDone = updatedBoard[otherKey] !== null;

    let winner: 1 | 2 | null = null;
    let isDraw = false;
    if (bothDone) {
      const outcome = determineWinner(updatedBoard);
      winner = outcome.winner;
      isDraw = outcome.isDraw;
    }

    const updateData: Record<string, unknown> = {
      board: updatedBoard,
      updated_at: new Date().toISOString(),
    };

    // If player 1 just submitted, switch turn to player 2
    if (playerNumber === 1 && !bothDone) {
      updateData.current_turn = 2;
    }

    if (bothDone) {
      updateData.winner = winner ?? (isDraw ? 0 : null);
    }

    const { error: updateError } = await supabase
      .from('games')
      .update(updateData)
      .eq('id', gameId);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    // Record match result if game is over
    if (bothDone && game.player1_name && game.player2_name) {
      const p1Id = game.player1_id || '00000000-0000-0000-0000-000000000001';
      const p2Id = game.player2_id || '00000000-0000-0000-0000-000000000002';

      await recordMatchResult({
        game_type: 'word-search',
        winner_id: winner === 1 ? p1Id : winner === 2 ? p2Id : null,
        winner_name: winner === 1 ? game.player1_name : winner === 2 ? game.player2_name : null,
        loser_id: winner === 1 ? p2Id : winner === 2 ? p1Id : null,
        loser_name: winner === 1 ? game.player2_name : winner === 2 ? game.player1_name : null,
        is_draw: isDraw,
        metadata: {
          theme: updatedBoard.theme,
          p1Words: updatedBoard.player1Result!.foundWords.length,
          p2Words: updatedBoard.player2Result!.foundWords.length,
          p1Time: updatedBoard.player1Result!.timeUsed,
          p2Time: updatedBoard.player2Result!.timeUsed,
        },
        player1_id: p1Id,
        player1_name: game.player1_name,
        player2_id: p2Id,
        player2_name: game.player2_name,
      });
    }

    // Optimistic update
    setGame((prev) => prev ? { ...prev, board: updatedBoard, winner, ...updateData } as WordSearchGame : null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game, gameId]);

  const playerNumber = getMyPlayerNumber();
  const board = game?.board as WordSearchBoardState | undefined;

  const myResult = board && playerNumber
    ? (playerNumber === 1 ? board.player1Result : board.player2Result)
    : null;

  const bothSubmitted = !!(board?.player1Result && board?.player2Result);

  // Only show opponent result after both have submitted
  const opponentResult = bothSubmitted && board && playerNumber
    ? (playerNumber === 1 ? board.player2Result : board.player1Result)
    : null;

  return { game, loading, error, deleted, submitResult, myResult, opponentResult, bothSubmitted };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useWordSearchGame.ts
git commit -m "feat(word-search): add game state hook with polling and result submission"
```

---

### Task 5: Timer Component

**Files:**
- Create: `src/components/word-search/Timer.tsx`

- [ ] **Step 1: Create the timer component**

```typescript
// src/components/word-search/Timer.tsx
'use client';

import { useState, useEffect, useRef } from 'react';

interface TimerProps {
  timeLimit: number; // seconds
  started: boolean;
  onTimeUp: () => void;
}

export function Timer({ timeLimit, started, onTimeUp }: TimerProps) {
  const [remaining, setRemaining] = useState(timeLimit);
  const onTimeUpRef = useRef(onTimeUp);
  onTimeUpRef.current = onTimeUp;
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (!started) return;
    if (startTimeRef.current === null) {
      startTimeRef.current = Date.now();
    }

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current!) / 1000);
      const left = Math.max(0, timeLimit - elapsed);
      setRemaining(left);
      if (left === 0) {
        clearInterval(interval);
        onTimeUpRef.current();
      }
    }, 250);

    return () => clearInterval(interval);
  }, [started, timeLimit]);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const isUrgent = remaining <= 30;

  return (
    <div className={`font-mono text-2xl font-bold tabular-nums ${isUrgent ? 'text-[#E63946] animate-pulse' : 'text-text-primary'}`}>
      {minutes}:{seconds.toString().padStart(2, '0')}
    </div>
  );
}

export function getElapsedSeconds(startTime: number): number {
  return Math.floor((Date.now() - startTime) / 1000);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/word-search/Timer.tsx
git commit -m "feat(word-search): add countdown timer component"
```

---

### Task 6: Word List Component

**Files:**
- Create: `src/components/word-search/WordList.tsx`

- [ ] **Step 1: Create the word list component**

```typescript
// src/components/word-search/WordList.tsx
'use client';

import { motion } from 'framer-motion';

interface WordListProps {
  words: string[];
  foundWords: string[];
}

export function WordList({ words, foundWords }: WordListProps) {
  const sortedWords = [...words].sort((a, b) => a.localeCompare(b));

  return (
    <div className="flex flex-wrap gap-2 justify-center max-w-md">
      {sortedWords.map((word) => {
        const isFound = foundWords.includes(word);
        return (
          <motion.span
            key={word}
            animate={isFound ? { scale: [1, 1.1, 1] } : {}}
            transition={{ duration: 0.3 }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              isFound
                ? 'bg-green-500/20 text-green-400 line-through'
                : 'bg-surface border border-border text-text-primary'
            }`}
          >
            {word}
          </motion.span>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/word-search/WordList.tsx
git commit -m "feat(word-search): add word list component"
```

---

### Task 7: Interactive Grid Component

**Files:**
- Create: `src/components/word-search/Grid.tsx`

- [ ] **Step 1: Create the interactive grid with swipe/drag selection**

```typescript
// src/components/word-search/Grid.tsx
'use client';

import { useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import type { WordPlacement } from '@/lib/word-search-types';
import { getWordCells } from '@/lib/word-search-logic';

interface GridProps {
  grid: string[][];
  words: WordPlacement[];
  foundWords: string[];
  onWordFound: (word: string) => void;
  disabled?: boolean;
}

export function Grid({ grid, words, foundWords, onWordFound, disabled }: GridProps) {
  const [selecting, setSelecting] = useState(false);
  const [startCell, setStartCell] = useState<[number, number] | null>(null);
  const [currentCell, setCurrentCell] = useState<[number, number] | null>(null);
  const [shakeCell, setShakeCell] = useState<[number, number] | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // Get highlighted cells for found words
  const foundCells = new Map<string, string>(); // "r,c" -> word
  for (const placement of words) {
    if (foundWords.includes(placement.word)) {
      const cells = getWordCells(placement);
      cells.forEach(([r, c]) => foundCells.set(`${r},${c}`, placement.word));
    }
  }

  // Get cells in current selection line
  const getSelectionCells = useCallback((): [number, number][] => {
    if (!startCell || !currentCell) return [];
    const [r1, c1] = startCell;
    const [r2, c2] = currentCell;
    const dr = Math.sign(r2 - r1);
    const dc = Math.sign(c2 - c1);

    // Only allow straight lines (horizontal, vertical, diagonal)
    const rowDiff = Math.abs(r2 - r1);
    const colDiff = Math.abs(c2 - c1);
    if (rowDiff !== colDiff && rowDiff !== 0 && colDiff !== 0) return [];

    const length = Math.max(rowDiff, colDiff);
    const cells: [number, number][] = [];
    for (let i = 0; i <= length; i++) {
      cells.push([r1 + dr * i, c1 + dc * i]);
    }
    return cells;
  }, [startCell, currentCell]);

  const selectionCells = getSelectionCells();
  const selectionSet = new Set(selectionCells.map(([r, c]) => `${r},${c}`));

  const handlePointerDown = (row: number, col: number) => {
    if (disabled) return;
    setSelecting(true);
    setStartCell([row, col]);
    setCurrentCell([row, col]);
  };

  const handlePointerEnter = (row: number, col: number) => {
    if (!selecting) return;
    setCurrentCell([row, col]);
  };

  const handlePointerUp = () => {
    if (!selecting || !startCell || !currentCell) {
      setSelecting(false);
      return;
    }

    // Check if selection matches a word
    const [r1, c1] = startCell;
    const [r2, c2] = currentCell;

    let matched = false;
    for (const placement of words) {
      if (foundWords.includes(placement.word)) continue;
      const { start, end } = placement;
      if (
        (start[0] === r1 && start[1] === c1 && end[0] === r2 && end[1] === c2) ||
        (start[0] === r2 && start[1] === c2 && end[0] === r1 && end[1] === c1)
      ) {
        onWordFound(placement.word);
        matched = true;
        break;
      }
    }

    if (!matched && (r1 !== r2 || c1 !== c2)) {
      setShakeCell(startCell);
      setTimeout(() => setShakeCell(null), 400);
    }

    setSelecting(false);
    setStartCell(null);
    setCurrentCell(null);
  };

  return (
    <div
      ref={gridRef}
      className="grid gap-0.5 select-none touch-none"
      style={{ gridTemplateColumns: `repeat(${grid[0].length}, minmax(0, 1fr))` }}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {grid.map((row, rowIdx) =>
        row.map((letter, colIdx) => {
          const key = `${rowIdx},${colIdx}`;
          const isFound = foundCells.has(key);
          const isSelecting = selectionSet.has(key);
          const isShaking = shakeCell && shakeCell[0] === rowIdx && shakeCell[1] === colIdx;

          return (
            <motion.div
              key={key}
              animate={isShaking ? { x: [-2, 2, -2, 2, 0] } : {}}
              transition={{ duration: 0.3 }}
              onPointerDown={() => handlePointerDown(rowIdx, colIdx)}
              onPointerEnter={() => handlePointerEnter(rowIdx, colIdx)}
              className={`w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded text-sm sm:text-base font-bold cursor-pointer transition-colors ${
                isFound
                  ? 'bg-green-500/30 text-green-300'
                  : isSelecting
                  ? 'bg-blue-500/30 text-blue-200'
                  : 'bg-surface/50 text-text-primary hover:bg-surface'
              }`}
            >
              {letter}
            </motion.div>
          );
        })
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/word-search/Grid.tsx
git commit -m "feat(word-search): add interactive grid with drag selection"
```

---

### Task 8: Results Component

**Files:**
- Create: `src/components/word-search/Results.tsx`

- [ ] **Step 1: Create the results comparison component**

```typescript
// src/components/word-search/Results.tsx
'use client';

import { motion } from 'framer-motion';
import type { WordSearchBoardState } from '@/lib/word-search-types';
import { useColors } from '@/hooks/usePlayerColors';

interface ResultsProps {
  board: WordSearchBoardState;
  player1Name: string;
  player2Name: string;
  winner: 1 | 2 | null;
  isDraw: boolean;
}

export function Results({ board, player1Name, player2Name, winner, isDraw }: ResultsProps) {
  const { player1Color, player2Color } = useColors();
  const p1 = board.player1Result;
  const p2 = board.player2Result;

  if (!p1 || !p2) return null;

  const allWords = board.words.map((w) => w.word).sort((a, b) => a.localeCompare(b));

  function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.21, 0.47, 0.32, 0.98] }}
      className="w-full max-w-md mx-auto space-y-6"
    >
      {/* Winner banner */}
      <div className="text-center">
        <div className="text-xs uppercase tracking-widest text-text-secondary mb-1">
          {isDraw ? 'Result' : 'Winner'}
        </div>
        <div className="text-2xl font-bold" style={{ color: isDraw ? undefined : winner === 1 ? player1Color : player2Color }}>
          {isDraw ? 'Draw!' : winner === 1 ? player1Name : player2Name}
        </div>
      </div>

      {/* Score comparison */}
      <div className="flex justify-between items-center p-4 bg-surface rounded-2xl border border-border">
        <div className="text-center flex-1">
          <div className="text-xs text-text-secondary mb-1">{player1Name}</div>
          <div className="text-3xl font-bold" style={{ color: player1Color }}>{p1.foundWords.length}</div>
          <div className="text-xs text-text-secondary">words</div>
          <div className="text-sm text-text-secondary mt-1">{formatTime(p1.timeUsed)}</div>
        </div>
        <div className="text-text-secondary text-sm">vs</div>
        <div className="text-center flex-1">
          <div className="text-xs text-text-secondary mb-1">{player2Name}</div>
          <div className="text-3xl font-bold" style={{ color: player2Color }}>{p2.foundWords.length}</div>
          <div className="text-xs text-text-secondary">words</div>
          <div className="text-sm text-text-secondary mt-1">{formatTime(p2.timeUsed)}</div>
        </div>
      </div>

      {/* Word breakdown */}
      <div className="bg-surface rounded-2xl border border-border p-4">
        <div className="text-xs uppercase tracking-wider text-text-secondary mb-3">
          Words ({allWords.length} total)
        </div>
        <div className="space-y-2">
          {allWords.map((word) => {
            const p1Found = p1.foundWords.includes(word);
            const p2Found = p2.foundWords.includes(word);
            const neitherFound = !p1Found && !p2Found;

            return (
              <div
                key={word}
                className={`flex justify-between items-center px-3 py-2 rounded-lg ${neitherFound ? 'bg-background/50' : 'bg-background'}`}
              >
                <span className={`font-medium text-sm ${neitherFound ? 'text-text-secondary/40' : 'text-text-primary'}`}>
                  {word}
                </span>
                <div className="flex gap-3">
                  <span style={{ color: p1Found ? player1Color : '#555' }}>
                    {p1Found ? '✓' : '✗'}
                  </span>
                  <span style={{ color: p2Found ? player2Color : '#555' }}>
                    {p2Found ? '✓' : '✗'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/word-search/Results.tsx
git commit -m "feat(word-search): add results comparison component"
```

---

### Task 9: Game Page

**Files:**
- Create: `src/app/word-search/[gameId]/page.tsx`

- [ ] **Step 1: Create the game page**

```typescript
// src/app/word-search/[gameId]/page.tsx
'use client';

import { use, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useWordSearchGame } from '@/hooks/useWordSearchGame';
import { Grid } from '@/components/word-search/Grid';
import { WordList } from '@/components/word-search/WordList';
import { Timer, getElapsedSeconds } from '@/components/word-search/Timer';
import { Results } from '@/components/word-search/Results';
import { SettingsButton } from '@/components/SettingsButton';
import type { WordSearchBoardState } from '@/lib/word-search-types';

export default function WordSearchGamePage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = use(params);
  const router = useRouter();
  const { game, loading, deleted, submitResult, myResult, opponentResult, bothSubmitted } = useWordSearchGame(gameId);

  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [timerStarted, setTimerStarted] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const startTimeRef = useRef<number | null>(null);

  const playerName = typeof window !== 'undefined'
    ? (sessionStorage.getItem('player-name') || localStorage.getItem('player-name'))
    : null;

  const handleWordFound = useCallback((word: string) => {
    if (!timerStarted) {
      setTimerStarted(true);
      startTimeRef.current = Date.now();
    }
    setFoundWords((prev) => prev.includes(word) ? prev : [...prev, word]);
  }, [timerStarted]);

  const handleSubmit = useCallback(async () => {
    if (submitted || !startTimeRef.current) return;
    setSubmitted(true);

    const timeUsed = getElapsedSeconds(startTimeRef.current);
    await submitResult({
      foundWords,
      timeUsed,
      startedAt: new Date(startTimeRef.current).toISOString(),
      submittedAt: new Date().toISOString(),
    });
  }, [submitted, foundWords, submitResult]);

  const handleTimeUp = useCallback(() => {
    handleSubmit();
  }, [handleSubmit]);

  if (deleted) {
    router.push('/');
    return null;
  }

  if (loading || !game) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <div className="text-text-secondary">Loading...</div>
      </div>
    );
  }

  const board = game.board as WordSearchBoardState;
  const myPlayerNumber = game.player1_name === playerName ? 1 : 2;
  const isMyTurn = game.current_turn === myPlayerNumber;
  const allWords = board.words.map((w) => w.word);

  // Already submitted — show waiting or results
  if (myResult || submitted) {
    if (bothSubmitted) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center min-h-screen px-4 py-8">
          <SettingsButton />
          <Results
            board={board}
            player1Name={game.player1_name || 'Player 1'}
            player2Name={game.player2_name || 'Player 2'}
            winner={game.winner as 1 | 2 | null}
            isDraw={game.winner === null && bothSubmitted}
          />
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            onClick={() => router.push('/')}
            className="mt-8 px-6 py-3 rounded-xl bg-surface border border-border text-text-primary font-medium hover:bg-background transition-colors cursor-pointer"
          >
            Home
          </motion.button>
        </div>
      );
    }

    // Waiting for opponent
    const opponentName = myPlayerNumber === 1 ? (game.player2_name || 'Opponent') : (game.player1_name || 'Opponent');
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen px-4 gap-4">
        <SettingsButton />
        <div className="text-2xl font-bold text-text-primary">
          You found {myResult?.foundWords.length ?? foundWords.length}/{allWords.length} words
        </div>
        <div className="text-text-secondary">
          {opponentName} hasn&apos;t played yet.
        </div>
        <button
          onClick={() => router.push('/')}
          className="mt-4 px-6 py-3 rounded-xl bg-surface border border-border text-text-primary font-medium hover:bg-background transition-colors cursor-pointer"
        >
          Home
        </button>
      </div>
    );
  }

  // Not my turn (Player 2 viewing before Player 1 submits — shouldn't happen often)
  if (!isMyTurn) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen px-4 gap-4">
        <SettingsButton />
        <div className="text-xl text-text-secondary">Waiting for opponent to play first...</div>
        <button
          onClick={() => router.push('/')}
          className="mt-4 px-6 py-3 rounded-xl bg-surface border border-border text-text-primary font-medium hover:bg-background transition-colors cursor-pointer"
        >
          Home
        </button>
      </div>
    );
  }

  // Active game — playing
  return (
    <div className="flex-1 flex flex-col items-center min-h-screen px-4 py-6 gap-4">
      <SettingsButton />

      {/* Header: theme + timer */}
      <div className="flex items-center justify-between w-full max-w-md">
        <div className="text-sm text-text-secondary capitalize">{board.theme} pack</div>
        <Timer timeLimit={board.timeLimit} started={timerStarted} onTimeUp={handleTimeUp} />
      </div>

      {/* Grid */}
      <Grid
        grid={board.grid}
        words={board.words}
        foundWords={foundWords}
        onWordFound={handleWordFound}
        disabled={submitted}
      />

      {/* Word list */}
      <WordList words={allWords} foundWords={foundWords} />

      {/* Submit button */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: timerStarted ? 1 : 0.5 }}
        onClick={handleSubmit}
        disabled={!timerStarted}
        className="mt-4 px-8 py-3 rounded-xl bg-green-600 text-white font-semibold hover:bg-green-500 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Done ({foundWords.length}/{allWords.length})
      </motion.button>

      {!timerStarted && (
        <p className="text-xs text-text-secondary">Tap a letter to start the timer</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/word-search/[gameId]/page.tsx
git commit -m "feat(word-search): add game page with grid, timer, and submission"
```

---

### Task 10: Lobby Page (Theme Selection + Matchmaking)

**Files:**
- Create: `src/app/word-search/page.tsx`

- [ ] **Step 1: Create the lobby page**

```typescript
// src/app/word-search/page.tsx
'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { THEME_PACKS } from '@/lib/word-search-themes';
import { createWordSearchBoard } from '@/lib/word-search-logic';
import { SettingsButton } from '@/components/SettingsButton';

const PLAYER_IDS: Record<string, string> = {
  Ricky: '00000000-0000-0000-0000-000000000001',
  Lilian: '00000000-0000-0000-0000-000000000002',
};

export default function WordSearchLobby() {
  const router = useRouter();
  const [creating, setCreating] = useState<string | null>(null);

  const playerName = typeof window !== 'undefined'
    ? (sessionStorage.getItem('player-name') || localStorage.getItem('player-name'))
    : null;

  const handleSelectTheme = useCallback(async (themeId: string) => {
    if (!playerName) return;
    setCreating(themeId);

    const { supabase } = await import('@/lib/supabase');
    const isRicky = playerName === 'Ricky';
    const myId = PLAYER_IDS[playerName];

    // Check for existing active word-search game
    const { data: existing } = await supabase
      .from('games')
      .select('*')
      .eq('game_type', 'word-search')
      .is('winner', null)
      .order('created_at', { ascending: false })
      .limit(10);

    if (existing) {
      // Resume my game
      const myGame = existing.find((g) =>
        isRicky ? g.player1_name === 'Ricky' : g.player2_name === 'Lilian'
      );
      if (myGame) {
        router.push(`/word-search/${myGame.id}`);
        return;
      }

      // Join opponent's game
      const joinable = existing.find((g) =>
        isRicky
          ? g.player1_name === null && g.player2_name === 'Lilian'
          : g.player2_name === null && g.player1_name === 'Ricky'
      );
      if (joinable) {
        const updateField = isRicky
          ? { player1_id: myId, player1_name: playerName }
          : { player2_id: myId, player2_name: playerName };

        await supabase
          .from('games')
          .update({ ...updateField, updated_at: new Date().toISOString() })
          .eq('id', joinable.id);

        router.push(`/word-search/${joinable.id}`);
        return;
      }
    }

    // Create new game
    const pack = THEME_PACKS.find((p) => p.id === themeId)!;
    const board = createWordSearchBoard(themeId, pack.words);

    const insertData = isRicky
      ? {
          game_type: 'word-search',
          board,
          current_turn: 1 as const,
          winner: null,
          player1_id: myId,
          player1_name: playerName,
          player2_id: null,
          player2_name: null,
        }
      : {
          game_type: 'word-search',
          board,
          current_turn: 2 as const,
          winner: null,
          player1_id: null,
          player1_name: null,
          player2_id: myId,
          player2_name: playerName,
        };

    const { data, error } = await supabase
      .from('games')
      .insert(insertData)
      .select('id')
      .single();

    if (error || !data) {
      console.error('Error creating word search game:', error);
      setCreating(null);
      return;
    }

    router.push(`/word-search/${data.id}`);
  }, [playerName, router]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-screen px-4 py-8">
      <SettingsButton />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.21, 0.47, 0.32, 0.98] }}
        className="w-full max-w-md space-y-8"
      >
        <div className="text-center">
          <h1 className="text-3xl font-bold text-text-primary mb-2">Word Search</h1>
          <p className="text-text-secondary">Pick a theme pack</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {THEME_PACKS.map((pack, index) => (
            <motion.button
              key={pack.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => handleSelectTheme(pack.id)}
              disabled={creating !== null}
              className="p-4 rounded-2xl border border-border bg-surface hover:bg-background hover:border-border/80 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-wait text-left"
            >
              <div className="text-base font-semibold text-text-primary">{pack.name}</div>
              <div className="text-xs text-text-secondary mt-1">{pack.words.length} words</div>
              {creating === pack.id && (
                <div className="text-xs text-text-secondary mt-2">Creating...</div>
              )}
            </motion.button>
          ))}
        </div>

        <button
          onClick={() => router.push('/')}
          className="w-full py-3 text-sm text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
        >
          Back to games
        </button>
      </motion.div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/word-search/page.tsx
git commit -m "feat(word-search): add lobby with theme pack selection"
```

---

### Task 11: Integration — Inbox, Match Results, Home Page

**Files:**
- Modify: `src/lib/inbox-types.ts`
- Modify: `src/hooks/useInbox.ts`
- Modify: `src/components/inbox/InboxGameItem.tsx`
- Modify: `src/lib/match-results.ts`
- Modify: `src/components/MatchHistory.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Add 'word-search' to InboxGameType**

In `src/lib/inbox-types.ts`, change line 1:
```typescript
export type InboxGameType = 'connect-four' | 'tic-tac-toe' | 'checkers' | 'battleship' | 'word-search';
```

- [ ] **Step 2: Add 'word-search' to inbox filter**

In `src/hooks/useInbox.ts`, change line 39:
```typescript
        .in('game_type', ['connect-four', 'tic-tac-toe', 'checkers', 'battleship', 'word-search'])
```

- [ ] **Step 3: Add Word Search icon and label to InboxGameItem**

In `src/components/inbox/InboxGameItem.tsx`, add after `BattleshipMini` component (after line 58):

```typescript
function WordSearchMini() {
  return (
    <div className="w-8 h-8 rounded-lg bg-[#6B48FF]/10 flex items-center justify-center">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="1" width="14" height="14" rx="2" stroke="#6B48FF" strokeWidth="1.2" opacity="0.6" />
        <text x="3" y="7" fontSize="4" fill="#6B48FF" opacity="0.8" fontFamily="monospace">AB</text>
        <text x="3" y="12" fontSize="4" fill="#6B48FF" opacity="0.8" fontFamily="monospace">CD</text>
        <line x1="3" y1="5" x2="10" y2="5" stroke="#6B48FF" strokeWidth="1.5" opacity="0.9" strokeLinecap="round" />
      </svg>
    </div>
  );
}
```

Update `GameIcon` switch (add case before closing brace):
```typescript
    case 'word-search': return <WordSearchMini />;
```

Update `gameLabel` switch (add case before closing brace):
```typescript
    case 'word-search': return 'Word Search';
```

- [ ] **Step 4: Add 'word-search' to match-results GameType**

In `src/lib/match-results.ts`, change line 3:
```typescript
export type GameType = 'connect-four' | 'tic-tac-toe' | 'wordle' | 'word-search';
```

- [ ] **Step 5: Add word-search to MatchHistory component**

In `src/components/MatchHistory.tsx`:

Update the `MatchResult` interface `game_type` (line 7):
```typescript
  game_type: 'connect-four' | 'tic-tac-toe' | 'wordle' | 'word-search';
```

Update the `metadata` type (line 14):
```typescript
  metadata: { guessCount?: number; won?: boolean; totalMoves?: number; theme?: string; p1Words?: number; p2Words?: number; p1Time?: number; p2Time?: number } | null;
```

Add case to `gameIcon` function:
```typescript
    case 'word-search': return '🔍';
```

Add case to `gameLabel` function:
```typescript
    case 'word-search': return 'Word Search';
```

Update `outcomeText` to handle word-search (add before the `if (result.is_draw)` line):
```typescript
  if (result.game_type === 'word-search') {
    if (result.is_draw) return 'Draw';
    const meta = result.metadata;
    if (meta?.p1Words !== undefined && meta?.p2Words !== undefined) {
      return `${result.winner_name} won (${Math.max(meta.p1Words, meta.p2Words)} words)`;
    }
    return `${result.winner_name} won`;
  }
```

- [ ] **Step 6: Add Word Search card to home page**

In `src/app/page.tsx`, add a `WordSearchIcon` component after `BattleshipIcon` (around line 166):

```typescript
function WordSearchIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <rect x="2" y="2" width="24" height="24" rx="3" stroke="#6B48FF" strokeWidth="2" fill="none" opacity="0.8" />
      <text x="5" y="12" fontSize="6" fill="#6B48FF" opacity="0.9" fontFamily="monospace" fontWeight="bold">WO</text>
      <text x="5" y="22" fontSize="6" fill="#6B48FF" opacity="0.9" fontFamily="monospace" fontWeight="bold">RD</text>
      <line x1="5" y1="9" x2="18" y2="9" stroke="#E63946" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
    </svg>
  );
}
```

Add a `ClickableGameCard` for Word Search in the games grid (after the Battleship card):

```typescript
          <ClickableGameCard
            title="Word Search"
            description="Find hidden words in a grid. Race against each other on the same puzzle."
            color="#6B48FF"
            icon={<WordSearchIcon />}
            delay={0.35}
            onClick={() => router.push('/word-search')}
          />
```

- [ ] **Step 7: Commit**

```bash
git add src/lib/inbox-types.ts src/hooks/useInbox.ts src/components/inbox/InboxGameItem.tsx src/lib/match-results.ts src/components/MatchHistory.tsx src/app/page.tsx
git commit -m "feat(word-search): integrate with inbox, match history, and home page"
```

---

### Task 12: Verification

- [ ] **Step 1: Run all tests**

Run: `npx vitest run`
Expected: All tests pass (existing + new word-search tests)

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Run dev server and verify**

Run: `npm run dev`
Verify:
1. Word Search appears on home page
2. Clicking it navigates to `/word-search` lobby
3. Theme packs display correctly
4. Selecting a theme creates a game and navigates to the game page
5. Grid renders, timer starts on first interaction
6. Word selection works (drag across letters)
7. Found words highlight green and check off the list
8. "Done" button submits results
9. Waiting state shows after submission
10. Word Search appears in inbox when it's your turn

- [ ] **Step 4: Commit any fixes**

If any issues found during manual testing, fix and commit.

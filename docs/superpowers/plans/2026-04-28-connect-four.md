# Connect Four — Delight-First Multiplayer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a polished, real-time two-player Connect Four game with spring physics animations, satisfying sounds, and Supabase-powered multiplayer — playable via a shared link on desktop and mobile.

**Architecture:** Next.js 14 App Router serves a single game route `/connect-four/[gameId]` plus a homepage to create games. Game state lives in a Supabase Postgres table; both players subscribe to Realtime Postgres Changes on their game row. Client-side game logic handles move validation and win detection. Framer Motion provides spring-physics piece drops; canvas-confetti handles win celebrations.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Framer Motion, Supabase (Postgres + Realtime), canvas-confetti, use-sound, Satoshi font

---

## File Structure

```
/
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.js
├── .env.local                          # Supabase keys (gitignored)
├── .env.local.example                  # Template for env vars
├── public/
│   ├── fonts/
│   │   └── Satoshi-Variable.woff2      # Self-hosted font
│   └── sounds/
│       ├── drop.mp3                    # Piece landing sound (~20KB)
│       └── win.mp3                     # Victory fanfare (~40KB)
├── src/
│   ├── app/
│   │   ├── layout.tsx                  # Root layout: font, metadata, global styles
│   │   ├── page.tsx                    # Homepage: "New Game" button
│   │   ├── globals.css                 # Tailwind directives + font-face + custom vars
│   │   └── connect-four/
│   │       └── [gameId]/
│   │           └── page.tsx            # Game page: loads game, renders board
│   ├── components/
│   │   ├── Board.tsx                   # 7x6 grid, click handlers, hover previews
│   │   ├── Cell.tsx                    # Single cell with piece rendering
│   │   ├── Piece.tsx                   # Animated piece (Framer Motion spring drop)
│   │   ├── TurnIndicator.tsx           # Shows whose turn + color transition
│   │   ├── WinCelebration.tsx          # Confetti + winning piece glow
│   │   ├── WaitingForOpponent.tsx      # Shown when player2 hasn't joined
│   │   ├── GameFullMessage.tsx         # Shown to 3rd visitors
│   │   └── NewGameButton.tsx           # Creates game, navigates to URL
│   ├── lib/
│   │   ├── game-logic.ts              # Pure functions: makeMove, checkWin, isDraw
│   │   ├── game-logic.test.ts         # Unit tests for game logic
│   │   ├── supabase.ts                # Supabase client singleton
│   │   ├── types.ts                   # TypeScript types (Game, Board, Player)
│   │   └── player-id.ts              # localStorage UUID management
│   └── hooks/
│       ├── useGame.ts                  # Main hook: subscribe, make moves, state
│       └── useSound.ts                 # Sound effect hook wrapper
├── supabase/
│   └── migrations/
│       └── 001_create_games.sql        # Games table + RLS policy
└── __tests__/
    └── game-logic.test.ts              # Vitest tests for pure game logic
```

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `tsconfig.json`, `tailwind.config.ts`, `next.config.js`, `src/app/layout.tsx`, `src/app/globals.css`, `src/app/page.tsx`, `.env.local.example`, `.gitignore`

- [ ] **Step 1: Initialize Next.js project**

Run from the project root `/Users/I769353/conductor/workspaces/online-games/tianjin`:

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --no-turbopack
```

Accept defaults. This creates the full Next.js scaffold.

- [ ] **Step 2: Install dependencies**

```bash
npm install framer-motion @supabase/supabase-js canvas-confetti use-sound
npm install -D @types/canvas-confetti vitest @testing-library/react @testing-library/jest-dom jsdom
```

- [ ] **Step 3: Configure Vitest**

Create `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

Add to `package.json` scripts:

```json
"test": "vitest",
"test:run": "vitest run"
```

- [ ] **Step 4: Create .env.local.example**

```
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Add `.env.local` to `.gitignore` (should already be there from create-next-app).

- [ ] **Step 5: Set up Tailwind config with custom theme**

Replace `tailwind.config.ts`:

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#FFFBF5',
        surface: '#FFF8F0',
        border: '#F0E6D9',
        text: {
          primary: '#2D2A26',
          secondary: '#6B6560',
        },
        player1: '#E63946',
        player2: '#FFBE0B',
        board: '#1D3557',
      },
      fontFamily: {
        sans: ['Satoshi', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
      },
    },
  },
  plugins: [],
};
export default config;
```

- [ ] **Step 6: Set up global styles with Satoshi font**

Replace `src/app/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@font-face {
  font-family: 'Satoshi';
  src: url('/fonts/Satoshi-Variable.woff2') format('woff2');
  font-weight: 300 900;
  font-display: swap;
  font-style: normal;
}

:root {
  --color-background: #FFFBF5;
  --color-player1: #E63946;
  --color-player2: #FFBE0B;
  --color-board: #1D3557;
}

body {
  background-color: var(--color-background);
  color: #2D2A26;
  font-family: 'Satoshi', system-ui, sans-serif;
}
```

- [ ] **Step 7: Create root layout**

Replace `src/app/layout.tsx`:

```typescript
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Connect Four",
  description: "A delight-first multiplayer Connect Four game",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background antialiased">
        <main className="flex min-h-screen flex-col items-center justify-center p-4">
          {children}
        </main>
      </body>
    </html>
  );
}
```

- [ ] **Step 8: Create placeholder homepage**

Replace `src/app/page.tsx`:

```typescript
export default function Home() {
  return (
    <div className="text-center">
      <h1 className="text-4xl font-bold tracking-tight text-text-primary mb-2">
        Connect Four
      </h1>
      <p className="text-text-secondary mb-8">
        A game for two
      </p>
      <button className="bg-player1 text-white px-8 py-3 rounded-2xl font-semibold text-lg hover:scale-105 transition-transform">
        New Game
      </button>
    </div>
  );
}
```

- [ ] **Step 9: Download Satoshi font**

```bash
mkdir -p public/fonts
curl -L "https://api.fontsource.org/v1/fonts/satoshi/latin-400-normal.woff2" -o public/fonts/Satoshi-Variable.woff2 2>/dev/null || echo "Font download failed - will use system-ui fallback"
```

Note: If the font download fails, the app will gracefully fall back to `system-ui` per the CSS. The font can be manually added later from https://www.fontshare.com/fonts/satoshi.

- [ ] **Step 10: Verify the app runs**

```bash
npm run dev &
sleep 3
curl -s http://localhost:3000 | head -20
kill %1
```

Expected: HTML response containing "Connect Four".

- [ ] **Step 11: Commit scaffolding**

```bash
git add -A
git commit -m "feat: scaffold Next.js project with Tailwind, Framer Motion, Supabase deps"
```

---

### Task 2: TypeScript Types and Game Logic (Pure Functions)

**Files:**
- Create: `src/lib/types.ts`, `src/lib/game-logic.ts`, `src/lib/game-logic.test.ts`

- [ ] **Step 1: Define TypeScript types**

Create `src/lib/types.ts`:

```typescript
export type Player = 1 | 2;

// Column-major: 7 columns, each an array of player numbers (bottom-to-top)
// board[col][row] where row 0 is the bottom
export type Board = Player[][];

export type GameStatus = 'waiting' | 'playing' | 'won' | 'draw';

export interface Game {
  id: string;
  game_type: string;
  board: Board;
  current_turn: Player;
  winner: Player | null;
  player1_id: string | null;
  player2_id: string | null;
  player1_name: string | null;
  player2_name: string | null;
  created_at: string;
  updated_at: string;
}

export const ROWS = 6;
export const COLS = 7;
```

- [ ] **Step 2: Write failing tests for game logic**

Create `src/lib/game-logic.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { createEmptyBoard, makeMove, checkWin, isDraw, getStatus } from './game-logic';
import { Board, Player } from './types';

describe('createEmptyBoard', () => {
  it('creates a 7-column board with empty arrays', () => {
    const board = createEmptyBoard();
    expect(board).toHaveLength(7);
    board.forEach(col => expect(col).toEqual([]));
  });
});

describe('makeMove', () => {
  it('adds a piece to an empty column', () => {
    const board = createEmptyBoard();
    const result = makeMove(board, 3, 1);
    expect(result).not.toBeNull();
    expect(result![3]).toEqual([1]);
  });

  it('stacks pieces in the same column', () => {
    const board = createEmptyBoard();
    const after1 = makeMove(board, 3, 1)!;
    const after2 = makeMove(after1, 3, 2)!;
    expect(after2[3]).toEqual([1, 2]);
  });

  it('returns null for a full column', () => {
    const board = createEmptyBoard();
    let current: Board = board;
    for (let i = 0; i < 6; i++) {
      current = makeMove(current, 0, (i % 2 + 1) as Player)!;
    }
    const result = makeMove(current, 0, 1);
    expect(result).toBeNull();
  });

  it('returns null for out-of-bounds column', () => {
    const board = createEmptyBoard();
    expect(makeMove(board, -1, 1)).toBeNull();
    expect(makeMove(board, 7, 1)).toBeNull();
  });
});

describe('checkWin', () => {
  it('detects horizontal win', () => {
    const board = createEmptyBoard();
    board[0] = [1];
    board[1] = [1];
    board[2] = [1];
    board[3] = [1];
    expect(checkWin(board, 1)).toBe(true);
  });

  it('detects vertical win', () => {
    const board = createEmptyBoard();
    board[2] = [1, 1, 1, 1];
    expect(checkWin(board, 1)).toBe(true);
  });

  it('detects diagonal win (bottom-left to top-right)', () => {
    const board = createEmptyBoard();
    board[0] = [1];
    board[1] = [2, 1];
    board[2] = [2, 2, 1];
    board[3] = [2, 2, 2, 1];
    expect(checkWin(board, 1)).toBe(true);
  });

  it('detects diagonal win (top-left to bottom-right)', () => {
    const board = createEmptyBoard();
    board[0] = [2, 2, 2, 1];
    board[1] = [2, 2, 1];
    board[2] = [2, 1];
    board[3] = [1];
    expect(checkWin(board, 1)).toBe(true);
  });

  it('returns false when no win', () => {
    const board = createEmptyBoard();
    board[0] = [1];
    board[1] = [2];
    board[2] = [1];
    expect(checkWin(board, 1)).toBe(false);
  });
});

describe('isDraw', () => {
  it('returns false for non-full board', () => {
    const board = createEmptyBoard();
    expect(isDraw(board)).toBe(false);
  });

  it('returns true when all columns are full', () => {
    const board: Board = Array.from({ length: 7 }, () => [1, 2, 1, 2, 1, 2]);
    expect(isDraw(board)).toBe(true);
  });
});

describe('getStatus', () => {
  it('returns waiting when player2 not joined', () => {
    expect(getStatus(createEmptyBoard(), null, null)).toBe('waiting');
  });

  it('returns won when there is a winner', () => {
    expect(getStatus(createEmptyBoard(), 1, 'player2-id')).toBe('won');
  });

  it('returns draw when board is full and no winner', () => {
    const fullBoard: Board = Array.from({ length: 7 }, () => [1, 2, 1, 2, 1, 2]);
    expect(getStatus(fullBoard, null, 'player2-id')).toBe('draw');
  });

  it('returns playing during normal gameplay', () => {
    expect(getStatus(createEmptyBoard(), null, 'player2-id')).toBe('playing');
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
npx vitest run src/lib/game-logic.test.ts
```

Expected: FAIL — module `./game-logic` cannot be found.

- [ ] **Step 4: Implement game logic**

Create `src/lib/game-logic.ts`:

```typescript
import { Board, Player, GameStatus, ROWS, COLS } from './types';

export function createEmptyBoard(): Board {
  return Array.from({ length: COLS }, () => []);
}

export function makeMove(board: Board, col: number, player: Player): Board | null {
  if (col < 0 || col >= COLS) return null;
  if (board[col].length >= ROWS) return null;

  const newBoard = board.map((column, i) =>
    i === col ? [...column, player] : [...column]
  );
  return newBoard;
}

export function checkWin(board: Board, player: Player): boolean {
  // Check horizontal
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col <= COLS - 4; col++) {
      if (
        board[col][row] === player &&
        board[col + 1][row] === player &&
        board[col + 2][row] === player &&
        board[col + 3][row] === player
      ) {
        return true;
      }
    }
  }

  // Check vertical
  for (let col = 0; col < COLS; col++) {
    for (let row = 0; row <= ROWS - 4; row++) {
      if (
        board[col][row] === player &&
        board[col][row + 1] === player &&
        board[col][row + 2] === player &&
        board[col][row + 3] === player
      ) {
        return true;
      }
    }
  }

  // Check diagonal (bottom-left to top-right)
  for (let col = 0; col <= COLS - 4; col++) {
    for (let row = 0; row <= ROWS - 4; row++) {
      if (
        board[col][row] === player &&
        board[col + 1][row + 1] === player &&
        board[col + 2][row + 2] === player &&
        board[col + 3][row + 3] === player
      ) {
        return true;
      }
    }
  }

  // Check diagonal (top-left to bottom-right)
  for (let col = 0; col <= COLS - 4; col++) {
    for (let row = 3; row < ROWS; row++) {
      if (
        board[col][row] === player &&
        board[col + 1][row - 1] === player &&
        board[col + 2][row - 2] === player &&
        board[col + 3][row - 3] === player
      ) {
        return true;
      }
    }
  }

  return false;
}

export function isDraw(board: Board): boolean {
  return board.every(col => col.length >= ROWS);
}

export function getStatus(board: Board, winner: Player | null, player2Id: string | null): GameStatus {
  if (!player2Id) return 'waiting';
  if (winner) return 'won';
  if (isDraw(board)) return 'draw';
  return 'playing';
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npx vitest run src/lib/game-logic.test.ts
```

Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/types.ts src/lib/game-logic.ts src/lib/game-logic.test.ts
git commit -m "feat: add game logic with full test coverage (win detection, moves, draw)"
```

---

### Task 3: Player ID Management

**Files:**
- Create: `src/lib/player-id.ts`

- [ ] **Step 1: Implement player ID helper**

Create `src/lib/player-id.ts`:

```typescript
const PLAYER_ID_KEY = 'connect-four-player-id';

export function getPlayerId(): string {
  if (typeof window === 'undefined') return '';

  let id = localStorage.getItem(PLAYER_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(PLAYER_ID_KEY, id);
  }
  return id;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/player-id.ts
git commit -m "feat: add localStorage-based player ID management"
```

---

### Task 4: Supabase Client and Database Migration

**Files:**
- Create: `src/lib/supabase.ts`, `supabase/migrations/001_create_games.sql`

- [ ] **Step 1: Create Supabase client**

Create `src/lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

- [ ] **Step 2: Create database migration**

Create `supabase/migrations/001_create_games.sql`:

```sql
create table if not exists games (
  id uuid primary key default gen_random_uuid(),
  game_type text not null default 'connect-four',
  board jsonb not null default '[[],[],[],[],[],[],[]]',
  current_turn int not null default 1,
  winner int,
  player1_id uuid,
  player2_id uuid,
  player1_name text,
  player2_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Allow anonymous read/write access (no auth in v1)
alter table games enable row level security;

create policy "Allow anonymous access"
  on games
  for all
  using (true)
  with check (true);

-- Enable Realtime
alter publication supabase_realtime add table games;
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/supabase.ts supabase/
git commit -m "feat: add Supabase client and games table migration"
```

---

### Task 5: useGame Hook (Real-time Multiplayer)

**Files:**
- Create: `src/hooks/useGame.ts`

- [ ] **Step 1: Implement the useGame hook**

Create `src/hooks/useGame.ts`:

```typescript
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { makeMove, checkWin, isDraw } from '@/lib/game-logic';
import { getPlayerId } from '@/lib/player-id';
import { Game, Player, Board, GameStatus } from '@/lib/types';

interface UseGameReturn {
  game: Game | null;
  loading: boolean;
  error: string | null;
  myPlayer: Player | null;
  status: GameStatus;
  dropPiece: (col: number) => void;
  lastDropCol: number | null;
  lastDropRow: number | null;
}

export function useGame(gameId: string): UseGameReturn {
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [myPlayer, setMyPlayer] = useState<Player | null>(null);
  const [lastDropCol, setLastDropCol] = useState<number | null>(null);
  const [lastDropRow, setLastDropRow] = useState<number | null>(null);
  const localBoardRef = useRef<Board | null>(null);

  // Fetch initial game state and determine player role
  useEffect(() => {
    async function init() {
      const playerId = getPlayerId();

      const { data, error: fetchError } = await supabase
        .from('games')
        .select('*')
        .eq('id', gameId)
        .single();

      if (fetchError || !data) {
        setError('Game not found');
        setLoading(false);
        return;
      }

      const gameData = data as Game;

      // Determine player role
      if (gameData.player1_id === playerId) {
        setMyPlayer(1);
      } else if (gameData.player2_id === playerId) {
        setMyPlayer(2);
      } else if (!gameData.player2_id) {
        // Join as player 2
        const { error: joinError } = await supabase
          .from('games')
          .update({ player2_id: playerId })
          .eq('id', gameId);

        if (!joinError) {
          gameData.player2_id = playerId;
          setMyPlayer(2);
        }
      } else {
        setError('Game is full');
        setLoading(false);
        return;
      }

      setGame(gameData);
      localBoardRef.current = gameData.board;
      setLoading(false);
    }

    init();
  }, [gameId]);

  // Subscribe to realtime changes
  useEffect(() => {
    const channel = supabase
      .channel(`game-${gameId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${gameId}` },
        (payload) => {
          const updated = payload.new as Game;
          const localBoard = localBoardRef.current;

          // Suppress echo: if incoming board matches our optimistic state, skip animation trigger
          const isEcho = localBoard && JSON.stringify(updated.board) === JSON.stringify(localBoard);

          if (!isEcho) {
            // Find the column that changed (opponent's move)
            if (game) {
              const oldBoard = game.board;
              for (let col = 0; col < 7; col++) {
                if (updated.board[col].length > (oldBoard[col]?.length || 0)) {
                  setLastDropCol(col);
                  setLastDropRow(updated.board[col].length - 1);
                  break;
                }
              }
            }
          }

          setGame(updated);
          localBoardRef.current = updated.board;
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId, game]);

  const dropPiece = useCallback(
    async (col: number) => {
      if (!game || !myPlayer) return;
      if (game.current_turn !== myPlayer) return;
      if (game.winner) return;

      const newBoard = makeMove(game.board, col, myPlayer);
      if (!newBoard) return;

      // Optimistic update
      const nextTurn: Player = myPlayer === 1 ? 2 : 1;
      const won = checkWin(newBoard, myPlayer);
      const draw = !won && isDraw(newBoard);

      const optimisticGame: Game = {
        ...game,
        board: newBoard,
        current_turn: nextTurn,
        winner: won ? myPlayer : null,
      };

      setGame(optimisticGame);
      localBoardRef.current = newBoard;
      setLastDropCol(col);
      setLastDropRow(newBoard[col].length - 1);

      // Persist to Supabase
      await supabase
        .from('games')
        .update({
          board: newBoard,
          current_turn: nextTurn,
          winner: won ? myPlayer : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', gameId);
    },
    [game, myPlayer, gameId]
  );

  const status: GameStatus = (() => {
    if (!game) return 'waiting';
    if (!game.player2_id) return 'waiting';
    if (game.winner) return 'won';
    if (isDraw(game.board)) return 'draw';
    return 'playing';
  })();

  return { game, loading, error, myPlayer, status, dropPiece, lastDropCol, lastDropRow };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useGame.ts
git commit -m "feat: add useGame hook with realtime sync and optimistic updates"
```

---

### Task 6: Sound Hook

**Files:**
- Create: `src/hooks/useSound.ts`, `public/sounds/` (placeholder)

- [ ] **Step 1: Create sound hook wrapper**

Create `src/hooks/useSound.ts`:

```typescript
'use client';

import { useCallback, useRef } from 'react';

export function useGameSounds() {
  const dropAudioRef = useRef<HTMLAudioElement | null>(null);
  const winAudioRef = useRef<HTMLAudioElement | null>(null);

  const playDrop = useCallback(() => {
    if (!dropAudioRef.current) {
      dropAudioRef.current = new Audio('/sounds/drop.mp3');
      dropAudioRef.current.volume = 0.5;
    }
    dropAudioRef.current.currentTime = 0;
    dropAudioRef.current.play().catch(() => {});
  }, []);

  const playWin = useCallback(() => {
    if (!winAudioRef.current) {
      winAudioRef.current = new Audio('/sounds/win.mp3');
      winAudioRef.current.volume = 0.7;
    }
    winAudioRef.current.currentTime = 0;
    winAudioRef.current.play().catch(() => {});
  }, []);

  return { playDrop, playWin };
}
```

- [ ] **Step 2: Create placeholder sound files**

```bash
mkdir -p public/sounds
# Create minimal valid MP3 files as placeholders (will be replaced with real sounds)
# For now, create empty files so the app doesn't 404
touch public/sounds/drop.mp3
touch public/sounds/win.mp3
```

Note: Replace these with real sound effects from freesound.org or similar. The app gracefully handles missing/broken audio files (the `.catch(() => {})` swallows errors).

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useSound.ts public/sounds/
git commit -m "feat: add sound effects hook with lazy-loaded audio"
```

---

### Task 7: UI Components — Piece and Cell

**Files:**
- Create: `src/components/Piece.tsx`, `src/components/Cell.tsx`

- [ ] **Step 1: Create the Piece component with spring animation**

Create `src/components/Piece.tsx`:

```typescript
'use client';

import { motion } from 'framer-motion';
import { Player } from '@/lib/types';

interface PieceProps {
  player: Player;
  animate?: boolean;
  row: number;
}

export function Piece({ player, animate = true, row }: PieceProps) {
  const color = player === 1 ? 'bg-player1' : 'bg-player2';
  const shadow = player === 1
    ? 'shadow-[inset_0_-4px_0_0_rgba(180,30,40,0.4)]'
    : 'shadow-[inset_0_-4px_0_0_rgba(200,150,0,0.4)]';

  // Drop distance: from top of board to the target row
  // Each cell is ~64px, piece drops from row 6 (top) to target row
  const dropDistance = (5 - row) * 72 + 72;

  return (
    <motion.div
      className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full ${color} ${shadow}`}
      initial={animate ? { y: -dropDistance, scale: 0.8 } : false}
      animate={{ y: 0, scale: 1 }}
      transition={
        animate
          ? {
              type: 'spring',
              stiffness: 200,
              damping: 12,
              mass: 1,
            }
          : undefined
      }
    />
  );
}
```

- [ ] **Step 2: Create the Cell component**

Create `src/components/Cell.tsx`:

```typescript
import { Player } from '@/lib/types';
import { Piece } from './Piece';

interface CellProps {
  player: Player | undefined;
  row: number;
  animate: boolean;
}

export function Cell({ player, row, animate }: CellProps) {
  return (
    <div className="w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center">
      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-background/90 flex items-center justify-center">
        {player && <Piece player={player} row={row} animate={animate} />}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/Piece.tsx src/components/Cell.tsx
git commit -m "feat: add Piece and Cell components with spring-physics drop animation"
```

---

### Task 8: UI Components — Board

**Files:**
- Create: `src/components/Board.tsx`

- [ ] **Step 1: Create the Board component**

Create `src/components/Board.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Board as BoardType, Player, ROWS, COLS } from '@/lib/types';
import { Cell } from './Cell';

interface BoardProps {
  board: BoardType;
  currentTurn: Player;
  myPlayer: Player | null;
  isMyTurn: boolean;
  winner: Player | null;
  onDrop: (col: number) => void;
  lastDropCol: number | null;
  lastDropRow: number | null;
}

export function Board({
  board,
  currentTurn,
  myPlayer,
  isMyTurn,
  winner,
  onDrop,
  lastDropCol,
  lastDropRow,
}: BoardProps) {
  const [hoverCol, setHoverCol] = useState<number | null>(null);

  const canDrop = isMyTurn && !winner;

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Hover preview row */}
      <div className="flex gap-1">
        {Array.from({ length: COLS }, (_, col) => (
          <div
            key={col}
            className="w-14 h-8 sm:w-16 sm:h-10 flex items-center justify-center"
          >
            {hoverCol === col && canDrop && myPlayer && (
              <motion.div
                className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full ${
                  myPlayer === 1 ? 'bg-player1' : 'bg-player2'
                }`}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 0.3, scale: 1 }}
                exit={{ opacity: 0 }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Board grid */}
      <div className="bg-board rounded-2xl p-2 sm:p-3 shadow-xl">
        <div className="grid grid-cols-7 gap-1">
          {/* Render top-to-bottom, left-to-right */}
          {Array.from({ length: ROWS }, (_, rowFromTop) => {
            const row = ROWS - 1 - rowFromTop;
            return Array.from({ length: COLS }, (_, col) => {
              const player = board[col][row];
              const isLastDrop = col === lastDropCol && row === lastDropRow;

              return (
                <div
                  key={`${col}-${row}`}
                  className={`cursor-pointer ${canDrop ? 'hover:bg-board/80' : ''} rounded-full transition-colors`}
                  onClick={() => canDrop && onDrop(col)}
                  onMouseEnter={() => setHoverCol(col)}
                  onMouseLeave={() => setHoverCol(null)}
                >
                  <Cell
                    player={player}
                    row={row}
                    animate={isLastDrop}
                  />
                </div>
              );
            });
          })}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Board.tsx
git commit -m "feat: add Board component with hover preview and click-to-drop"
```

---

### Task 9: UI Components — Status Indicators

**Files:**
- Create: `src/components/TurnIndicator.tsx`, `src/components/WaitingForOpponent.tsx`, `src/components/GameFullMessage.tsx`, `src/components/WinCelebration.tsx`

- [ ] **Step 1: Create TurnIndicator**

Create `src/components/TurnIndicator.tsx`:

```typescript
'use client';

import { motion } from 'framer-motion';
import { Player } from '@/lib/types';

interface TurnIndicatorProps {
  currentTurn: Player;
  myPlayer: Player | null;
  winner: Player | null;
}

export function TurnIndicator({ currentTurn, myPlayer, winner }: TurnIndicatorProps) {
  if (winner) return null;

  const isMyTurn = currentTurn === myPlayer;
  const color = currentTurn === 1 ? 'bg-player1' : 'bg-player2';
  const label = isMyTurn ? 'Your turn' : "Opponent's turn";

  return (
    <motion.div
      className="flex items-center gap-3 px-4 py-2 rounded-xl bg-surface"
      layout
    >
      <motion.div
        className={`w-4 h-4 rounded-full ${color}`}
        animate={{ scale: isMyTurn ? [1, 1.2, 1] : 1 }}
        transition={{ repeat: isMyTurn ? Infinity : 0, duration: 1.5 }}
      />
      <span className="text-text-secondary font-medium">{label}</span>
    </motion.div>
  );
}
```

- [ ] **Step 2: Create WaitingForOpponent**

Create `src/components/WaitingForOpponent.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

export function WaitingForOpponent() {
  const [copied, setCopied] = useState(false);

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      className="text-center p-8 rounded-2xl bg-surface"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex justify-center mb-4">
        <motion.div
          className="w-3 h-3 rounded-full bg-player2 mx-1"
          animate={{ y: [0, -8, 0] }}
          transition={{ repeat: Infinity, duration: 0.8, delay: 0 }}
        />
        <motion.div
          className="w-3 h-3 rounded-full bg-player2 mx-1"
          animate={{ y: [0, -8, 0] }}
          transition={{ repeat: Infinity, duration: 0.8, delay: 0.2 }}
        />
        <motion.div
          className="w-3 h-3 rounded-full bg-player2 mx-1"
          animate={{ y: [0, -8, 0] }}
          transition={{ repeat: Infinity, duration: 0.8, delay: 0.4 }}
        />
      </div>
      <h2 className="text-xl font-semibold text-text-primary mb-2">
        Waiting for opponent
      </h2>
      <p className="text-text-secondary mb-4">
        Share this link to start playing
      </p>
      <button
        onClick={copyLink}
        className="bg-board text-white px-6 py-2 rounded-xl font-medium hover:scale-105 transition-transform"
      >
        {copied ? 'Copied!' : 'Copy Link'}
      </button>
    </motion.div>
  );
}
```

- [ ] **Step 3: Create GameFullMessage**

Create `src/components/GameFullMessage.tsx`:

```typescript
'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

export function GameFullMessage() {
  return (
    <motion.div
      className="text-center p-8 rounded-2xl bg-surface"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <h2 className="text-xl font-semibold text-text-primary mb-2">
        Game is full
      </h2>
      <p className="text-text-secondary mb-4">
        This game already has two players.
      </p>
      <Link
        href="/"
        className="text-board font-medium hover:underline"
      >
        Start your own game
      </Link>
    </motion.div>
  );
}
```

- [ ] **Step 4: Create WinCelebration**

Create `src/components/WinCelebration.tsx`:

```typescript
'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Player } from '@/lib/types';

interface WinCelebrationProps {
  winner: Player;
  myPlayer: Player | null;
}

export function WinCelebration({ winner, myPlayer }: WinCelebrationProps) {
  const iWon = winner === myPlayer;

  useEffect(() => {
    if (iWon) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#E63946', '#FFBE0B', '#1D3557', '#F0E6D9'],
      });

      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#E63946', '#FFBE0B'],
        });
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#E63946', '#FFBE0B'],
        });
      }, 300);
    }
  }, [iWon]);

  const message = iWon ? 'You won!' : 'You lost!';
  const color = winner === 1 ? 'text-player1' : 'text-player2';

  return (
    <motion.div
      className="text-center"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 15 }}
    >
      <h2 className={`text-3xl font-bold ${color} mb-2`}>
        {message}
      </h2>
      <p className="text-text-secondary">
        {iWon ? 'Nicely played!' : 'Better luck next time!'}
      </p>
    </motion.div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add src/components/TurnIndicator.tsx src/components/WaitingForOpponent.tsx src/components/GameFullMessage.tsx src/components/WinCelebration.tsx
git commit -m "feat: add status UI components (turn indicator, waiting, game full, win celebration)"
```

---

### Task 10: Game Page (Connect Four Route)

**Files:**
- Create: `src/app/connect-four/[gameId]/page.tsx`

- [ ] **Step 1: Create the game page**

Create `src/app/connect-four/[gameId]/page.tsx`:

```typescript
'use client';

import { use } from 'react';
import { useGame } from '@/hooks/useGame';
import { useGameSounds } from '@/hooks/useSound';
import { Board } from '@/components/Board';
import { TurnIndicator } from '@/components/TurnIndicator';
import { WaitingForOpponent } from '@/components/WaitingForOpponent';
import { GameFullMessage } from '@/components/GameFullMessage';
import { WinCelebration } from '@/components/WinCelebration';
import { useEffect, useRef } from 'react';
import Link from 'next/link';

export default function GamePage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = use(params);
  const { game, loading, error, myPlayer, status, dropPiece, lastDropCol, lastDropRow } = useGame(gameId);
  const { playDrop, playWin } = useGameSounds();
  const prevBoardRef = useRef<string>('');

  // Play sounds on piece drops and wins
  useEffect(() => {
    if (!game) return;
    const boardStr = JSON.stringify(game.board);
    if (prevBoardRef.current && prevBoardRef.current !== boardStr) {
      playDrop();
    }
    prevBoardRef.current = boardStr;
  }, [game?.board, playDrop]);

  useEffect(() => {
    if (game?.winner) {
      playWin();
    }
  }, [game?.winner, playWin]);

  if (loading) {
    return (
      <div className="text-center text-text-secondary">
        Loading game...
      </div>
    );
  }

  if (error === 'Game is full') {
    return <GameFullMessage />;
  }

  if (error) {
    return (
      <div className="text-center text-text-secondary">
        <p>{error}</p>
        <Link href="/" className="text-board hover:underline mt-4 block">
          Back to home
        </Link>
      </div>
    );
  }

  if (!game) return null;

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-lg">
      <Link href="/" className="text-sm text-text-secondary hover:text-text-primary transition-colors">
        Connect Four
      </Link>

      {status === 'waiting' && <WaitingForOpponent />}

      {status === 'won' && game.winner && (
        <WinCelebration winner={game.winner} myPlayer={myPlayer} />
      )}

      {status === 'draw' && (
        <div className="text-center">
          <h2 className="text-2xl font-bold text-text-secondary">It&apos;s a draw!</h2>
          <p className="text-text-secondary mt-1">Well played, both of you.</p>
        </div>
      )}

      {status === 'playing' && (
        <TurnIndicator
          currentTurn={game.current_turn}
          myPlayer={myPlayer}
          winner={game.winner}
        />
      )}

      <Board
        board={game.board}
        currentTurn={game.current_turn}
        myPlayer={myPlayer}
        isMyTurn={game.current_turn === myPlayer}
        winner={game.winner}
        onDrop={dropPiece}
        lastDropCol={lastDropCol}
        lastDropRow={lastDropRow}
      />

      {(status === 'won' || status === 'draw') && (
        <Link
          href="/"
          className="mt-4 bg-board text-white px-6 py-2 rounded-xl font-medium hover:scale-105 transition-transform"
        >
          New Game
        </Link>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/connect-four/
git commit -m "feat: add game page with full multiplayer UI and sound effects"
```

---

### Task 11: Homepage — New Game Button with Supabase

**Files:**
- Modify: `src/app/page.tsx`
- Create: `src/components/NewGameButton.tsx`

- [ ] **Step 1: Create NewGameButton component**

Create `src/components/NewGameButton.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getPlayerId } from '@/lib/player-id';
import { motion } from 'framer-motion';

export function NewGameButton() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  const createGame = async () => {
    setCreating(true);
    const playerId = getPlayerId();

    const { data, error } = await supabase
      .from('games')
      .insert({
        game_type: 'connect-four',
        board: [[], [], [], [], [], [], []],
        current_turn: 1,
        player1_id: playerId,
      })
      .select('id')
      .single();

    if (error || !data) {
      setCreating(false);
      return;
    }

    router.push(`/connect-four/${data.id}`);
  };

  return (
    <motion.button
      onClick={createGame}
      disabled={creating}
      className="bg-player1 text-white px-8 py-3 rounded-2xl font-semibold text-lg disabled:opacity-50"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {creating ? 'Creating...' : 'New Game'}
    </motion.button>
  );
}
```

- [ ] **Step 2: Update homepage to use NewGameButton**

Replace `src/app/page.tsx`:

```typescript
import { NewGameButton } from '@/components/NewGameButton';

export default function Home() {
  return (
    <div className="text-center">
      <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-text-primary mb-2">
        Connect Four
      </h1>
      <p className="text-text-secondary text-lg mb-8">
        A game for two
      </p>
      <NewGameButton />
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/NewGameButton.tsx src/app/page.tsx
git commit -m "feat: add New Game button that creates a Supabase game and navigates to it"
```

---

### Task 12: Responsive Polish and Final Touches

**Files:**
- Modify: `src/app/layout.tsx` (add viewport meta)
- Modify: `src/app/globals.css` (add smooth scrolling, selection color)

- [ ] **Step 1: Update layout with viewport and Open Graph**

Replace `src/app/layout.tsx`:

```typescript
import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "Connect Four",
  description: "A delight-first multiplayer Connect Four game. Drop pieces, connect four, win!",
  openGraph: {
    title: "Connect Four",
    description: "Play Connect Four with a friend — real-time, satisfying, and fun.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background antialiased overflow-hidden">
        <main className="flex min-h-screen flex-col items-center justify-center p-4">
          {children}
        </main>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Polish global styles**

Replace `src/app/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@font-face {
  font-family: 'Satoshi';
  src: url('/fonts/Satoshi-Variable.woff2') format('woff2');
  font-weight: 300 900;
  font-display: swap;
  font-style: normal;
}

:root {
  --color-background: #FFFBF5;
  --color-player1: #E63946;
  --color-player2: #FFBE0B;
  --color-board: #1D3557;
}

body {
  background-color: var(--color-background);
  color: #2D2A26;
  font-family: 'Satoshi', system-ui, sans-serif;
}

::selection {
  background-color: #FFBE0B;
  color: #2D2A26;
}

* {
  -webkit-tap-highlight-color: transparent;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/layout.tsx src/app/globals.css
git commit -m "feat: add responsive viewport, OG meta, and polish global styles"
```

---

### Task 13: Environment Setup and Verification

**Files:**
- Create: `.env.local` (from template, gitignored)

- [ ] **Step 1: Create .env.local from example**

The developer needs to set up a Supabase project first:
1. Go to https://supabase.com and create a new project
2. Run the SQL from `supabase/migrations/001_create_games.sql` in the SQL editor
3. Copy the project URL and anon key from Settings > API

```bash
cp .env.local.example .env.local
echo "# Fill in your Supabase credentials from https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api" >> .env.local
```

- [ ] **Step 2: Verify build succeeds**

```bash
npm run build
```

Expected: Build succeeds (may show warnings about missing env vars if `.env.local` is not filled in, but should not error).

- [ ] **Step 3: Verify dev server starts**

```bash
npm run dev
```

Open `http://localhost:3000` — should see "Connect Four" homepage with "New Game" button.

- [ ] **Step 4: Run tests**

```bash
npm run test:run
```

Expected: All game logic tests pass.

- [ ] **Step 5: Final commit with any build fixes**

```bash
git add -A
git commit -m "chore: finalize project setup and verify build"
```

---

## Post-Implementation Notes

**To get real sound files** (optional but recommended):
- Visit freesound.org and search for "piece drop" / "victory fanfare"
- Download short MP3s (< 50KB each)
- Replace the placeholder files in `public/sounds/`

**To deploy to Vercel:**
1. Push to a GitHub repo
2. Connect to Vercel
3. Set environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
4. Deploy

**To set up Supabase:**
1. Create a free project at supabase.com
2. Run the migration SQL in the SQL Editor
3. Enable Realtime on the `games` table (Database > Replication > enable the `games` table)
4. Copy credentials to `.env.local`

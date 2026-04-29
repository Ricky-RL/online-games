# Snakes and Ladders Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an async two-player Snakes and Ladders game with random board generation, integrated with the existing inbox and leaderboard systems.

**Architecture:** Uses the generic `games` table with `game_type = 'snakes-and-ladders'` and JSONB `board` field. Follows the same polling/optimistic-update pattern as Connect Four, Tic-Tac-Toe, and Battleship. Pure game logic separated from React hooks and UI components.

**Tech Stack:** Next.js App Router, Supabase (PostgreSQL + realtime), Framer Motion, Tailwind CSS, Vitest

---

## File Structure

| File | Responsibility |
|------|---------------|
| `src/lib/snakes-and-ladders-logic.ts` | Pure game logic: board generation, move resolution, win check |
| `src/lib/snakes-and-ladders-logic.test.ts` | Unit tests for all logic functions |
| `src/hooks/useSnakesAndLaddersGame.ts` | State management hook: polling, optimistic updates, Supabase I/O |
| `src/app/snakes-and-ladders/page.tsx` | Lobby page: matchmaking, player selection |
| `src/app/snakes-and-ladders/[gameId]/page.tsx` | Game page: renders board, dice, shared components |
| `src/components/snakes-and-ladders/Board.tsx` | 10x10 board rendering with snakes, ladders, player pieces |
| `src/components/snakes-and-ladders/DiceRoll.tsx` | Dice display + roll button |

**Files to modify:**
| File | Change |
|------|--------|
| `src/lib/types.ts` | Add `SnakesAndLaddersState` interface |
| `src/lib/inbox-types.ts` | Add `'snakes-and-ladders'` to `InboxGameType` union |
| `src/lib/match-results.ts` | Add `'snakes-and-ladders'` to `GameType` union |
| `src/hooks/useInbox.ts` | Add `'snakes-and-ladders'` to `.in()` filter |
| `src/components/inbox/InboxGameItem.tsx` | Add icon + label for snakes-and-ladders |
| `src/app/page.tsx` | Add game card + matchmaking handler |

---

### Task 1: Add types to shared type files

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/lib/match-results.ts`

- [ ] **Step 1: Add SnakesAndLaddersState to types.ts**

Add at the end of `src/lib/types.ts`:

```typescript
// Snakes and Ladders types
export interface SnakesAndLaddersState {
  players: { 1: number; 2: number }
  snakes: Record<number, number>
  ladders: Record<number, number>
  lastRoll: { player: 1 | 2; value: number } | null
}
```

- [ ] **Step 2: Add snakes-and-ladders to GameType in match-results.ts**

Change line 3 of `src/lib/match-results.ts` from:

```typescript
export type GameType = 'connect-four' | 'tic-tac-toe' | 'wordle';
```

to:

```typescript
export type GameType = 'connect-four' | 'tic-tac-toe' | 'wordle' | 'snakes-and-ladders';
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/types.ts src/lib/match-results.ts
git commit -m "feat(snakes-and-ladders): add type definitions"
```

---

### Task 2: Game logic — board generation

**Files:**
- Create: `src/lib/snakes-and-ladders-logic.ts`
- Create: `src/lib/snakes-and-ladders-logic.test.ts`

- [ ] **Step 1: Write failing tests for generateBoard**

Create `src/lib/snakes-and-ladders-logic.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { generateBoard } from './snakes-and-ladders-logic';

describe('generateBoard', () => {
  it('creates initial state with players at position 1', () => {
    const state = generateBoard();
    expect(state.players[1]).toBe(1);
    expect(state.players[2]).toBe(1);
  });

  it('generates 8 snakes', () => {
    const state = generateBoard();
    expect(Object.keys(state.snakes)).toHaveLength(8);
  });

  it('generates 8 ladders', () => {
    const state = generateBoard();
    expect(Object.keys(state.ladders)).toHaveLength(8);
  });

  it('snakes always go downward (head > tail)', () => {
    const state = generateBoard();
    for (const [head, tail] of Object.entries(state.snakes)) {
      expect(Number(head)).toBeGreaterThan(tail);
    }
  });

  it('ladders always go upward (top > bottom)', () => {
    const state = generateBoard();
    for (const [bottom, top] of Object.entries(state.ladders)) {
      expect(top).toBeGreaterThan(Number(bottom));
    }
  });

  it('no endpoints overlap with each other or squares 1/100', () => {
    const state = generateBoard();
    const allEndpoints: number[] = [];
    for (const [head, tail] of Object.entries(state.snakes)) {
      allEndpoints.push(Number(head), tail);
    }
    for (const [bottom, top] of Object.entries(state.ladders)) {
      allEndpoints.push(Number(bottom), top);
    }
    const unique = new Set(allEndpoints);
    expect(unique.size).toBe(allEndpoints.length);
    expect(unique.has(1)).toBe(false);
    expect(unique.has(100)).toBe(false);
  });

  it('has at least 2 snakes in range 80-99', () => {
    const state = generateBoard();
    const highSnakes = Object.keys(state.snakes)
      .map(Number)
      .filter((h) => h >= 80 && h <= 99);
    expect(highSnakes.length).toBeGreaterThanOrEqual(2);
  });

  it('has at least 2 ladders in range 2-20', () => {
    const state = generateBoard();
    const earlyLadders = Object.keys(state.ladders)
      .map(Number)
      .filter((b) => b >= 2 && b <= 20);
    expect(earlyLadders.length).toBeGreaterThanOrEqual(2);
  });

  it('lastRoll starts as null', () => {
    const state = generateBoard();
    expect(state.lastRoll).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/snakes-and-ladders-logic.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement generateBoard**

Create `src/lib/snakes-and-ladders-logic.ts`:

```typescript
import type { Player, SnakesAndLaddersState } from './types';

const MAX_ATTEMPTS = 100;

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generateBoard(): SnakesAndLaddersState {
  const occupied = new Set<number>([1, 100]);
  const snakes: Record<number, number> = {};
  const ladders: Record<number, number> = {};

  function placeEntity(
    minStart: number,
    maxStart: number,
    goesDown: boolean
  ): [number, number] | null {
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const start = randomInt(minStart, maxStart);
      if (occupied.has(start)) continue;

      const endMin = goesDown ? 2 : start + 1;
      const endMax = goesDown ? start - 1 : 99;
      if (endMin > endMax) continue;

      const end = randomInt(endMin, endMax);
      if (occupied.has(end)) continue;

      occupied.add(start);
      occupied.add(end);
      return [start, end];
    }
    return null;
  }

  // Place 2 snakes in high range (80-99)
  for (let i = 0; i < 2; i++) {
    const result = placeEntity(80, 99, true);
    if (result) snakes[result[0]] = result[1];
  }

  // Place remaining 6 snakes anywhere (20-99 for heads)
  for (let i = 0; i < 6; i++) {
    const result = placeEntity(20, 99, true);
    if (result) snakes[result[0]] = result[1];
  }

  // Place 2 ladders in early range (2-20)
  for (let i = 0; i < 2; i++) {
    const result = placeEntity(2, 20, false);
    if (result) ladders[result[0]] = result[1];
  }

  // Place remaining 6 ladders anywhere (2-80 for bottoms)
  for (let i = 0; i < 6; i++) {
    const result = placeEntity(2, 80, false);
    if (result) ladders[result[0]] = result[1];
  }

  return {
    players: { 1: 1, 2: 1 },
    snakes,
    ladders,
    lastRoll: null,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/snakes-and-ladders-logic.test.ts`
Expected: All generateBoard tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/snakes-and-ladders-logic.ts src/lib/snakes-and-ladders-logic.test.ts
git commit -m "feat(snakes-and-ladders): implement board generation with tests"
```

---

### Task 3: Game logic — makeMove, checkWin, rollDice, getSquareEntity

**Files:**
- Modify: `src/lib/snakes-and-ladders-logic.ts`
- Modify: `src/lib/snakes-and-ladders-logic.test.ts`

- [ ] **Step 1: Write failing tests for makeMove and friends**

Append to `src/lib/snakes-and-ladders-logic.test.ts`:

```typescript
import { generateBoard, makeMove, checkWin, rollDice, getSquareEntity } from './snakes-and-ladders-logic';
import type { SnakesAndLaddersState } from './types';

describe('rollDice', () => {
  it('returns a number between 1 and 6', () => {
    for (let i = 0; i < 100; i++) {
      const roll = rollDice();
      expect(roll).toBeGreaterThanOrEqual(1);
      expect(roll).toBeLessThanOrEqual(6);
    }
  });
});

describe('makeMove', () => {
  const baseState: SnakesAndLaddersState = {
    players: { 1: 1, 2: 1 },
    snakes: { 50: 10 },
    ladders: { 5: 30 },
    lastRoll: null,
  };

  it('advances player by roll value', () => {
    const result = makeMove(baseState, 1, 3);
    expect(result.players[1]).toBe(4);
  });

  it('records the last roll', () => {
    const result = makeMove(baseState, 1, 3);
    expect(result.lastRoll).toEqual({ player: 1, value: 3 });
  });

  it('does not move the other player', () => {
    const result = makeMove(baseState, 1, 3);
    expect(result.players[2]).toBe(1);
  });

  it('applies ladder when landing on ladder bottom', () => {
    const state: SnakesAndLaddersState = {
      players: { 1: 2, 2: 1 },
      snakes: {},
      ladders: { 5: 30 },
      lastRoll: null,
    };
    const result = makeMove(state, 1, 3); // 2 + 3 = 5 (ladder bottom)
    expect(result.players[1]).toBe(30);
  });

  it('applies snake when landing on snake head', () => {
    const state: SnakesAndLaddersState = {
      players: { 1: 47, 2: 1 },
      snakes: { 50: 10 },
      ladders: {},
      lastRoll: null,
    };
    const result = makeMove(state, 1, 3); // 47 + 3 = 50 (snake head)
    expect(result.players[1]).toBe(10);
  });

  it('bounces back when exceeding 100', () => {
    const state: SnakesAndLaddersState = {
      players: { 1: 98, 2: 1 },
      snakes: {},
      ladders: {},
      lastRoll: null,
    };
    const result = makeMove(state, 1, 5); // 98 + 5 = 103, bounce = 200 - 103 = 97
    expect(result.players[1]).toBe(97);
  });

  it('applies snake after bounce-back', () => {
    const state: SnakesAndLaddersState = {
      players: { 1: 98, 2: 1 },
      snakes: { 97: 20 },
      ladders: {},
      lastRoll: null,
    };
    const result = makeMove(state, 1, 5); // 98 + 5 = 103, bounce = 97, snake to 20
    expect(result.players[1]).toBe(20);
  });

  it('lands exactly on 100 to win', () => {
    const state: SnakesAndLaddersState = {
      players: { 1: 96, 2: 1 },
      snakes: {},
      ladders: {},
      lastRoll: null,
    };
    const result = makeMove(state, 1, 4); // 96 + 4 = 100
    expect(result.players[1]).toBe(100);
  });

  it('wins via ladder landing on 100', () => {
    const state: SnakesAndLaddersState = {
      players: { 1: 92, 2: 1 },
      snakes: {},
      ladders: { 95: 100 },
      lastRoll: null,
    };
    const result = makeMove(state, 1, 3); // 92 + 3 = 95, ladder to 100
    expect(result.players[1]).toBe(100);
  });
});

describe('checkWin', () => {
  it('returns null when no player is on 100', () => {
    const state: SnakesAndLaddersState = {
      players: { 1: 50, 2: 60 },
      snakes: {},
      ladders: {},
      lastRoll: null,
    };
    expect(checkWin(state)).toBeNull();
  });

  it('returns 1 when player 1 is on 100', () => {
    const state: SnakesAndLaddersState = {
      players: { 1: 100, 2: 60 },
      snakes: {},
      ladders: {},
      lastRoll: null,
    };
    expect(checkWin(state)).toBe(1);
  });

  it('returns 2 when player 2 is on 100', () => {
    const state: SnakesAndLaddersState = {
      players: { 1: 50, 2: 100 },
      snakes: {},
      ladders: {},
      lastRoll: null,
    };
    expect(checkWin(state)).toBe(2);
  });
});

describe('getSquareEntity', () => {
  const state: SnakesAndLaddersState = {
    players: { 1: 1, 2: 1 },
    snakes: { 50: 10 },
    ladders: { 5: 30 },
    lastRoll: null,
  };

  it('returns snake info for a snake head', () => {
    expect(getSquareEntity(state, 50)).toEqual({ type: 'snake', destination: 10 });
  });

  it('returns ladder info for a ladder bottom', () => {
    expect(getSquareEntity(state, 5)).toEqual({ type: 'ladder', destination: 30 });
  });

  it('returns null for empty square', () => {
    expect(getSquareEntity(state, 25)).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/snakes-and-ladders-logic.test.ts`
Expected: FAIL — rollDice, makeMove, checkWin, getSquareEntity not exported

- [ ] **Step 3: Implement makeMove, checkWin, rollDice, getSquareEntity**

Add to the bottom of `src/lib/snakes-and-ladders-logic.ts`:

```typescript
export function rollDice(): number {
  return Math.floor(Math.random() * 6) + 1;
}

export function makeMove(
  state: SnakesAndLaddersState,
  player: Player,
  roll: number
): SnakesAndLaddersState {
  let newPosition = state.players[player] + roll;

  // Bounce back if overshooting 100
  if (newPosition > 100) {
    newPosition = 200 - newPosition;
  }

  // Apply snake or ladder
  if (state.snakes[newPosition] !== undefined) {
    newPosition = state.snakes[newPosition];
  } else if (state.ladders[newPosition] !== undefined) {
    newPosition = state.ladders[newPosition];
  }

  return {
    ...state,
    players: {
      ...state.players,
      [player]: newPosition,
    },
    lastRoll: { player, value: roll },
  };
}

export function checkWin(state: SnakesAndLaddersState): Player | null {
  if (state.players[1] === 100) return 1;
  if (state.players[2] === 100) return 2;
  return null;
}

export function getSquareEntity(
  state: SnakesAndLaddersState,
  square: number
): { type: 'snake' | 'ladder'; destination: number } | null {
  if (state.snakes[square] !== undefined) {
    return { type: 'snake', destination: state.snakes[square] };
  }
  if (state.ladders[square] !== undefined) {
    return { type: 'ladder', destination: state.ladders[square] };
  }
  return null;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/snakes-and-ladders-logic.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/snakes-and-ladders-logic.ts src/lib/snakes-and-ladders-logic.test.ts
git commit -m "feat(snakes-and-ladders): implement move logic, win check, and dice"
```

---

### Task 4: State management hook

**Files:**
- Create: `src/hooks/useSnakesAndLaddersGame.ts`

- [ ] **Step 1: Create the state hook**

Create `src/hooks/useSnakesAndLaddersGame.ts`:

```typescript
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { makeMove as computeMove, checkWin, rollDice as generateRoll } from '@/lib/snakes-and-ladders-logic';
import { recordMatchResult } from '@/lib/match-results';
import type { Player, SnakesAndLaddersState } from '@/lib/types';

const POLL_INTERVAL_MS = 1500;

export interface SnakesAndLaddersGame {
  id: string;
  game_type: string;
  board: SnakesAndLaddersState;
  current_turn: Player;
  winner: Player | null;
  player1_id: string | null;
  player2_id: string | null;
  player1_name: string | null;
  player2_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface LastMoveInfo {
  player: 1 | 2;
  from: number;
  to: number;
  roll: number;
}

interface UseSnakesAndLaddersGameReturn {
  game: SnakesAndLaddersGame | null;
  loading: boolean;
  error: string | null;
  lastMove: LastMoveInfo | null;
  deleted: boolean;
  rollDice: () => Promise<void>;
  resetGame: () => Promise<void>;
}

function getMyName(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('player-name') || localStorage.getItem('player-name');
}

export function useSnakesAndLaddersGame(gameId: string): UseSnakesAndLaddersGameReturn {
  const [game, setGame] = useState<SnakesAndLaddersGame | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastMove, setLastMove] = useState<LastMoveInfo | null>(null);
  const [deleted, setDeleted] = useState(false);
  const optimisticBoard = useRef<SnakesAndLaddersState | null>(null);
  const gameRef = useRef<SnakesAndLaddersGame | null>(null);
  const matchRecorded = useRef(false);
  const lastUpdatedAt = useRef<string | null>(null);

  const updateGame = useCallback(
    (updater: SnakesAndLaddersGame | null | ((prev: SnakesAndLaddersGame | null) => SnakesAndLaddersGame | null)) => {
      setGame((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        gameRef.current = next;
        if (next) lastUpdatedAt.current = next.updated_at;
        return next;
      });
    },
    []
  );

  const fetchGame = useCallback(async () => {
    const { data, error: fetchError } = await supabase
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        updateGame(null);
        setDeleted(true);
        return null;
      }
      setError(fetchError.message);
      return null;
    }

    if (data.game_type === 'ended') {
      updateGame(null);
      setDeleted(true);
      return null;
    }

    return data as SnakesAndLaddersGame;
  }, [gameId, updateGame]);

  // Initial fetch
  useEffect(() => {
    let cancelled = false;
    async function init() {
      setLoading(true);
      const gameData = await fetchGame();
      if (cancelled) return;
      if (gameData) {
        updateGame(gameData);
      }
      setLoading(false);
    }
    init();
    return () => { cancelled = true; };
  }, [fetchGame, updateGame]);

  // Poll for changes
  useEffect(() => {
    if (deleted) return;

    const interval = setInterval(async () => {
      const fresh = await fetchGame();
      if (!fresh) return;

      updateGame((prev) => {
        if (!prev) return fresh;

        // If we have an optimistic state, check if server caught up
        if (optimisticBoard.current) {
          if (JSON.stringify(fresh.board) === JSON.stringify(optimisticBoard.current)) {
            optimisticBoard.current = null;
            return fresh;
          }
          // Guard: don't regress if server is behind our optimistic state
          if (lastUpdatedAt.current && fresh.updated_at < lastUpdatedAt.current) {
            return prev;
          }
          optimisticBoard.current = null;
        }

        if (JSON.stringify(fresh) === JSON.stringify(prev)) return prev;

        // Guard against out-of-order responses
        if (fresh.updated_at < prev.updated_at) return prev;

        // Detect opponent's move
        const freshBoard = fresh.board as SnakesAndLaddersState;
        const prevBoard = prev.board as SnakesAndLaddersState;
        if (freshBoard.lastRoll && freshBoard.lastRoll !== prevBoard.lastRoll) {
          const movedPlayer = freshBoard.lastRoll.player;
          setLastMove({
            player: movedPlayer,
            from: prevBoard.players[movedPlayer],
            to: freshBoard.players[movedPlayer],
            roll: freshBoard.lastRoll.value,
          });
        }

        return fresh;
      });
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [gameId, fetchGame, updateGame, deleted]);

  const rollDice = useCallback(async () => {
    const currentGame = gameRef.current;
    if (!currentGame) return;

    const myName = getMyName();
    if (!myName) {
      setError('No player name set');
      return;
    }

    const isPlayer1 = currentGame.player1_name === myName;
    const isPlayer2 = currentGame.player2_name === myName;

    if (!isPlayer1 && !isPlayer2) {
      setError('You are not a player in this game');
      return;
    }

    const myPlayerNumber: Player = isPlayer1 ? 1 : 2;

    if (currentGame.current_turn !== myPlayerNumber) {
      setError('Not your turn');
      return;
    }

    if (currentGame.winner !== null) {
      setError('Game is already over');
      return;
    }

    const roll = generateRoll();
    const currentBoard = currentGame.board as SnakesAndLaddersState;
    const fromPosition = currentBoard.players[myPlayerNumber];
    const newBoard = computeMove(currentBoard, myPlayerNumber, roll);
    const winner = checkWin(newBoard);

    // Extra turn if rolled 6 and didn't win
    const nextTurn: Player = (roll === 6 && !winner)
      ? myPlayerNumber
      : (myPlayerNumber === 1 ? 2 : 1);

    // Optimistic update
    optimisticBoard.current = newBoard;
    setLastMove({
      player: myPlayerNumber,
      from: fromPosition,
      to: newBoard.players[myPlayerNumber],
      roll,
    });
    updateGame((prev) =>
      prev
        ? {
            ...prev,
            board: newBoard,
            current_turn: winner ? prev.current_turn : nextTurn,
            winner,
          }
        : null
    );
    setError(null);

    const { error: updateError } = await supabase
      .from('games')
      .update({
        board: newBoard,
        current_turn: winner ? currentGame.current_turn : nextTurn,
        winner,
        updated_at: new Date().toISOString(),
      })
      .eq('id', gameId);

    if (updateError) {
      optimisticBoard.current = null;
      const { data: freshGame } = await supabase
        .from('games')
        .select('*')
        .eq('id', gameId)
        .single();
      if (freshGame) updateGame(freshGame as SnakesAndLaddersGame);
      setError(updateError.message);
      return;
    }

    // Record match result on win
    if (winner && !matchRecorded.current) {
      matchRecorded.current = true;
      const winnerName = winner === 1 ? currentGame.player1_name : currentGame.player2_name;
      const loserName = winner === 1 ? currentGame.player2_name : currentGame.player1_name;
      const winnerId = winner === 1 ? currentGame.player1_id : currentGame.player2_id;
      const loserId = winner === 1 ? currentGame.player2_id : currentGame.player1_id;
      recordMatchResult({
        game_type: 'snakes-and-ladders',
        winner_id: winnerId,
        winner_name: winnerName,
        loser_id: loserId,
        loser_name: loserName,
        is_draw: false,
        metadata: null,
        player1_id: currentGame.player1_id!,
        player1_name: currentGame.player1_name!,
        player2_id: currentGame.player2_id!,
        player2_name: currentGame.player2_name!,
      });
    }
  }, [gameId, updateGame]);

  const resetGame = useCallback(async () => {
    const { error: resetError } = await supabase
      .from('games')
      .update({
        game_type: 'ended',
        board: { players: { 1: 1, 2: 1 }, snakes: {}, ladders: {}, lastRoll: null },
        current_turn: 1,
        winner: null,
        player1_name: null,
        player2_name: null,
        player1_id: null,
        player2_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', gameId);

    if (resetError) {
      console.error('Error resetting game:', resetError);
      setError(resetError.message);
      return;
    }

    const { error: deleteError } = await supabase
      .from('games')
      .delete()
      .eq('id', gameId);

    if (deleteError) {
      console.error('Error deleting game:', deleteError);
    }

    setDeleted(true);
  }, [gameId]);

  return { game, loading, error, lastMove, deleted, rollDice, resetGame };
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit --strict src/hooks/useSnakesAndLaddersGame.ts 2>&1 | head -20`

If there are type errors, fix them. The file should compile cleanly.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useSnakesAndLaddersGame.ts
git commit -m "feat(snakes-and-ladders): add state management hook"
```

---

### Task 5: Board UI component

**Files:**
- Create: `src/components/snakes-and-ladders/Board.tsx`

- [ ] **Step 1: Create Board component**

Create `src/components/snakes-and-ladders/Board.tsx`:

```typescript
'use client';

import { motion } from 'framer-motion';
import { useColors } from '@/hooks/usePlayerColors';
import type { SnakesAndLaddersState } from '@/lib/types';
import type { LastMoveInfo } from '@/hooks/useSnakesAndLaddersGame';

interface BoardProps {
  board: SnakesAndLaddersState;
  lastMove: LastMoveInfo | null;
}

function getSquarePosition(square: number): { row: number; col: number } {
  const row = Math.floor((square - 1) / 10);
  const col = row % 2 === 0 ? (square - 1) % 10 : 9 - ((square - 1) % 10);
  return { row: 9 - row, col };
}

const SNAKE_COLORS = ['#E63946', '#D62828', '#C1121F', '#A4133C', '#800F2F', '#590D22', '#FF6B6B', '#EE6C4D'];
const LADDER_COLORS = ['#2D6A4F', '#40916C', '#52B788', '#74C69D', '#1B4332', '#38A3A5', '#57CC99', '#80ED99'];

export function Board({ board, lastMove }: BoardProps) {
  const { player1Color, player2Color } = useColors();

  const squares: number[] = [];
  for (let i = 1; i <= 100; i++) squares.push(i);

  const snakeEntries = Object.entries(board.snakes).map(([head, tail], i) => ({
    from: Number(head),
    to: tail,
    color: SNAKE_COLORS[i % SNAKE_COLORS.length],
  }));

  const ladderEntries = Object.entries(board.ladders).map(([bottom, top], i) => ({
    from: Number(bottom),
    to: top,
    color: LADDER_COLORS[i % LADDER_COLORS.length],
  }));

  return (
    <div className="relative w-full max-w-[500px] aspect-square">
      {/* Grid */}
      <div className="grid grid-cols-10 grid-rows-10 w-full h-full gap-0.5 rounded-2xl overflow-hidden border border-border bg-border/50">
        {squares.map((num) => {
          const { row, col } = getSquarePosition(num);
          const gridRow = row + 1;
          const gridCol = col + 1;
          const isSnakeHead = board.snakes[num] !== undefined;
          const isLadderBottom = board.ladders[num] !== undefined;
          const hasPlayer1 = board.players[1] === num;
          const hasPlayer2 = board.players[2] === num;

          return (
            <div
              key={num}
              className="relative flex items-center justify-center bg-surface text-[10px] font-medium text-text-secondary/50"
              style={{ gridRow, gridColumn: gridCol }}
            >
              <span className="absolute top-0.5 left-1 text-[8px]">{num}</span>

              {isSnakeHead && (
                <div className="absolute inset-0 bg-red-500/5 border border-red-400/20 rounded-sm" />
              )}
              {isLadderBottom && (
                <div className="absolute inset-0 bg-green-500/5 border border-green-400/20 rounded-sm" />
              )}

              {/* Player pieces */}
              <div className="flex gap-0.5">
                {hasPlayer1 && (
                  <motion.div
                    className="w-4 h-4 rounded-full border-2 border-white shadow-md z-10"
                    style={{ backgroundColor: player1Color }}
                    layoutId="player1-piece"
                    transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                  />
                )}
                {hasPlayer2 && (
                  <motion.div
                    className="w-4 h-4 rounded-full border-2 border-white shadow-md z-10"
                    style={{ backgroundColor: player2Color }}
                    layoutId="player2-piece"
                    transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Snake/Ladder indicators overlay */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 500 500">
        {snakeEntries.map(({ from, to, color }) => {
          const fromPos = getSquarePosition(from);
          const toPos = getSquarePosition(to);
          const x1 = fromPos.col * 50 + 25;
          const y1 = fromPos.row * 50 + 25;
          const x2 = toPos.col * 50 + 25;
          const y2 = toPos.row * 50 + 25;
          return (
            <line
              key={`snake-${from}`}
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={color}
              strokeWidth="3"
              opacity="0.6"
              strokeLinecap="round"
              strokeDasharray="8 4"
            />
          );
        })}
        {ladderEntries.map(({ from, to, color }) => {
          const fromPos = getSquarePosition(from);
          const toPos = getSquarePosition(to);
          const x1 = fromPos.col * 50 + 25;
          const y1 = fromPos.row * 50 + 25;
          const x2 = toPos.col * 50 + 25;
          const y2 = toPos.row * 50 + 25;
          return (
            <g key={`ladder-${from}`}>
              <line x1={x1 - 5} y1={y1} x2={x2 - 5} y2={y2} stroke={color} strokeWidth="2.5" opacity="0.7" strokeLinecap="round" />
              <line x1={x1 + 5} y1={y1} x2={x2 + 5} y2={y2} stroke={color} strokeWidth="2.5" opacity="0.7" strokeLinecap="round" />
            </g>
          );
        })}
      </svg>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/snakes-and-ladders/Board.tsx
git commit -m "feat(snakes-and-ladders): add board UI component"
```

---

### Task 6: Dice UI component

**Files:**
- Create: `src/components/snakes-and-ladders/DiceRoll.tsx`

- [ ] **Step 1: Create DiceRoll component**

Create `src/components/snakes-and-ladders/DiceRoll.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface DiceRollProps {
  lastRoll: { player: 1 | 2; value: number } | null;
  isMyTurn: boolean;
  onRoll: () => Promise<void>;
  disabled: boolean;
}

function DiceFace({ value }: { value: number }) {
  const dotPositions: Record<number, [number, number][]> = {
    1: [[50, 50]],
    2: [[25, 25], [75, 75]],
    3: [[25, 25], [50, 50], [75, 75]],
    4: [[25, 25], [75, 25], [25, 75], [75, 75]],
    5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
    6: [[25, 25], [75, 25], [25, 50], [75, 50], [25, 75], [75, 75]],
  };

  const dots = dotPositions[value] || [];

  return (
    <div className="w-16 h-16 bg-white rounded-xl border-2 border-border shadow-lg flex items-center justify-center">
      <svg width="48" height="48" viewBox="0 0 100 100">
        {dots.map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r="8" fill="#1a1a1a" />
        ))}
      </svg>
    </div>
  );
}

export function DiceRoll({ lastRoll, isMyTurn, onRoll, disabled }: DiceRollProps) {
  const [rolling, setRolling] = useState(false);

  const handleRoll = async () => {
    setRolling(true);
    await onRoll();
    setTimeout(() => setRolling(false), 300);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Dice display */}
      <AnimatePresence mode="wait">
        {lastRoll ? (
          <motion.div
            key={`${lastRoll.player}-${lastRoll.value}-${Date.now()}`}
            initial={{ rotateZ: -20, scale: 0.8 }}
            animate={{ rotateZ: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 15 }}
          >
            <DiceFace value={lastRoll.value} />
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="w-16 h-16 bg-surface rounded-xl border-2 border-dashed border-border flex items-center justify-center">
              <span className="text-text-secondary/40 text-xl">?</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Extra turn indicator */}
      {lastRoll?.value === 6 && isMyTurn && (
        <motion.span
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm font-semibold text-[#538D4E]"
        >
          Extra turn!
        </motion.span>
      )}

      {/* Roll button */}
      <button
        onClick={handleRoll}
        disabled={!isMyTurn || disabled || rolling}
        className="px-6 py-3 text-sm font-semibold rounded-xl bg-text-primary text-background hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
      >
        {rolling ? 'Rolling...' : isMyTurn ? 'Roll Dice' : 'Waiting...'}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/snakes-and-ladders/DiceRoll.tsx
git commit -m "feat(snakes-and-ladders): add dice roll UI component"
```

---

### Task 7: Game page

**Files:**
- Create: `src/app/snakes-and-ladders/[gameId]/page.tsx`

- [ ] **Step 1: Create game page**

Create `src/app/snakes-and-ladders/[gameId]/page.tsx`:

```typescript
'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useSnakesAndLaddersGame } from '@/hooks/useSnakesAndLaddersGame';
import { Board } from '@/components/snakes-and-ladders/Board';
import { DiceRoll } from '@/components/snakes-and-ladders/DiceRoll';
import { TurnIndicator } from '@/components/TurnIndicator';
import { WinCelebration } from '@/components/WinCelebration';
import { EndGameDialog } from '@/components/EndGameDialog';
import { SettingsButton } from '@/components/SettingsButton';
import { useNotifications } from '@/hooks/useNotifications';
import type { SnakesAndLaddersState } from '@/lib/types';
import { useState, useEffect } from 'react';

export default function SnakesAndLaddersGamePage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = use(params);
  const router = useRouter();
  const { game, loading, error, lastMove, deleted, rollDice, resetGame } = useSnakesAndLaddersGame(gameId);
  const [showEndDialog, setShowEndDialog] = useState(false);

  const playerName = typeof window !== 'undefined'
    ? (sessionStorage.getItem('player-name') || localStorage.getItem('player-name'))
    : null;

  const isPlayer1 = game?.player1_name === playerName;
  const myPlayerNumber = isPlayer1 ? 1 : 2;
  const isMyTurn = game?.current_turn === myPlayerNumber && !game?.winner;

  // Notifications
  useNotifications(game ? {
    isMyTurn: isMyTurn ?? false,
    gameType: 'Snakes & Ladders',
    opponentName: isPlayer1 ? game.player2_name : game.player1_name,
  } : null);

  useEffect(() => {
    if (deleted) {
      router.push('/');
    }
  }, [deleted, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-text-secondary"
        >
          Loading...
        </motion.div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-text-secondary">Game not found</p>
      </div>
    );
  }

  const board = game.board as SnakesAndLaddersState;

  return (
    <div className="flex flex-col items-center min-h-screen px-4 py-8 gap-6">
      <SettingsButton />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4"
      >
        <button
          onClick={() => setShowEndDialog(true)}
          className="text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-text-primary">Snakes & Ladders</h1>
      </motion.div>

      {/* Turn indicator */}
      {!game.winner && (
        <TurnIndicator
          currentTurn={game.current_turn}
          player1Name={game.player1_name || 'Player 1'}
          player2Name={game.player2_name || 'Player 2'}
          isMyTurn={isMyTurn}
        />
      )}

      {/* Board */}
      <Board board={board} lastMove={lastMove} />

      {/* Dice */}
      {!game.winner && (
        <DiceRoll
          lastRoll={board.lastRoll}
          isMyTurn={isMyTurn}
          onRoll={rollDice}
          disabled={!!game.winner}
        />
      )}

      {/* Player positions */}
      <div className="flex gap-6 text-sm text-text-secondary">
        <span>{game.player1_name || 'Player 1'}: square {board.players[1]}</span>
        <span>{game.player2_name || 'Player 2'}: square {board.players[2]}</span>
      </div>

      {/* Error */}
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}

      {/* Win celebration */}
      {game.winner && (
        <WinCelebration
          winner={game.winner}
          winnerName={game.winner === 1 ? game.player1_name : game.player2_name}
          onPlayAgain={resetGame}
          onGoHome={() => router.push('/')}
        />
      )}

      {/* End game dialog */}
      <EndGameDialog
        open={showEndDialog}
        onConfirm={async () => {
          await resetGame();
          router.push('/');
        }}
        onCancel={() => setShowEndDialog(false)}
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/snakes-and-ladders/[gameId]/page.tsx
git commit -m "feat(snakes-and-ladders): add game page"
```

---

### Task 8: Lobby page with matchmaking

**Files:**
- Create: `src/app/snakes-and-ladders/page.tsx`

- [ ] **Step 1: Create lobby page**

Create `src/app/snakes-and-ladders/page.tsx`:

```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { generateBoard } from '@/lib/snakes-and-ladders-logic';

type PlayerName = 'Ricky' | 'Lilian';

const PLAYER_IDS: Record<PlayerName, string> = {
  Ricky: '00000000-0000-0000-0000-000000000001',
  Lilian: '00000000-0000-0000-0000-000000000002',
};

export default function SnakesAndLaddersLobby() {
  const router = useRouter();
  const [connecting, setConnecting] = useState(false);
  const [playerName, setPlayerName] = useState<PlayerName | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('player-name');
    if (stored === 'Ricky' || stored === 'Lilian') {
      setPlayerName(stored);
    }
  }, []);

  const handleSelectPlayer = (name: PlayerName) => {
    setPlayerName(name);
    sessionStorage.setItem('player-name', name);
    localStorage.setItem('player-name', name);
  };

  const handlePlay = useCallback(async () => {
    if (!playerName) return;
    setConnecting(true);

    const isRicky = playerName === 'Ricky';
    const myId = PLAYER_IDS[playerName];

    async function findGames() {
      const { data } = await supabase
        .from('games')
        .select('*')
        .eq('game_type', 'snakes-and-ladders')
        .is('winner', null)
        .order('created_at', { ascending: false })
        .limit(10);
      return data;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function findMyGame(games: any[] | null) {
      if (!games) return { activeGame: null, joinableGame: null };

      const activeGame = games.find((g) => {
        if (isRicky) return g.player1_name === 'Ricky';
        return g.player2_name === 'Lilian';
      }) || null;

      const joinableGame = games.find((g) => {
        if (isRicky) {
          return g.player1_name === null && g.player2_name === 'Lilian';
        } else {
          return g.player2_name === null && g.player1_name === 'Ricky';
        }
      }) || null;

      return { activeGame, joinableGame };
    }

    async function joinGame(gameId: string) {
      const updateField = isRicky
        ? { player1_id: myId, player1_name: playerName }
        : { player2_id: myId, player2_name: playerName };

      const { error: joinError } = await supabase
        .from('games')
        .update({
          ...updateField,
          updated_at: new Date().toISOString(),
        })
        .eq('id', gameId)
        .select()
        .single();

      if (joinError) {
        console.error('Error joining game:', joinError);
        setConnecting(false);
        return false;
      }
      return true;
    }

    // First attempt
    const existingGames = await findGames();
    let { activeGame, joinableGame } = findMyGame(existingGames);

    if (activeGame) {
      router.push(`/snakes-and-ladders/${activeGame.id}`);
      return;
    }

    if (joinableGame) {
      if (await joinGame(joinableGame.id)) {
        router.push(`/snakes-and-ladders/${joinableGame.id}`);
      }
      return;
    }

    // Wait and retry
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const retryGames = await findGames();
    ({ activeGame, joinableGame } = findMyGame(retryGames));

    if (activeGame) {
      router.push(`/snakes-and-ladders/${activeGame.id}`);
      return;
    }

    if (joinableGame) {
      if (await joinGame(joinableGame.id)) {
        router.push(`/snakes-and-ladders/${joinableGame.id}`);
      }
      return;
    }

    // Create new game
    const board = generateBoard();
    const insertData = isRicky
      ? {
          game_type: 'snakes-and-ladders',
          board,
          current_turn: 1 as const,
          winner: null,
          player1_id: myId,
          player1_name: playerName,
          player2_id: null,
          player2_name: null,
        }
      : {
          game_type: 'snakes-and-ladders',
          board,
          current_turn: 1 as const,
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
      console.error('Error creating game:', error);
      setConnecting(false);
      return;
    }

    router.push(`/snakes-and-ladders/${data.id}`);
  }, [playerName, router]);

  // Auto-play if player already selected
  useEffect(() => {
    if (playerName && !connecting) {
      handlePlay();
    }
  }, [playerName, handlePlay, connecting]);

  if (!playerName) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 gap-8">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-bold text-text-primary"
        >
          Snakes & Ladders
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-text-secondary"
        >
          Who are you?
        </motion.p>
        <div className="flex gap-4">
          <button
            onClick={() => handleSelectPlayer('Ricky')}
            className="px-8 py-4 text-lg font-semibold rounded-2xl bg-player1 text-white hover:opacity-90 transition-all cursor-pointer"
          >
            Ricky
          </button>
          <button
            onClick={() => handleSelectPlayer('Lilian')}
            className="px-8 py-4 text-lg font-semibold rounded-2xl bg-player2 text-text-primary hover:opacity-90 transition-all cursor-pointer"
          >
            Lilian
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6">
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-text-secondary"
      >
        {connecting ? 'Connecting...' : 'Loading...'}
      </motion.p>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/snakes-and-ladders/page.tsx
git commit -m "feat(snakes-and-ladders): add lobby page with matchmaking"
```

---

### Task 9: Inbox integration

**Files:**
- Modify: `src/lib/inbox-types.ts`
- Modify: `src/hooks/useInbox.ts`
- Modify: `src/components/inbox/InboxGameItem.tsx`

- [ ] **Step 1: Add to InboxGameType union**

In `src/lib/inbox-types.ts`, change line 1 from:

```typescript
export type InboxGameType = 'connect-four' | 'tic-tac-toe' | 'checkers' | 'battleship';
```

to:

```typescript
export type InboxGameType = 'connect-four' | 'tic-tac-toe' | 'checkers' | 'battleship' | 'snakes-and-ladders';
```

- [ ] **Step 2: Add to inbox filter**

In `src/hooks/useInbox.ts`, change the `.in('game_type', ...)` call (line 39) from:

```typescript
.in('game_type', ['connect-four', 'tic-tac-toe', 'checkers', 'battleship'])
```

to:

```typescript
.in('game_type', ['connect-four', 'tic-tac-toe', 'checkers', 'battleship', 'snakes-and-ladders'])
```

- [ ] **Step 3: Add icon and label to InboxGameItem**

In `src/components/inbox/InboxGameItem.tsx`, add a new mini icon component after `BattleshipMini`:

```typescript
function SnakesAndLaddersMini() {
  return (
    <div className="w-8 h-8 rounded-lg bg-[#538D4E]/10 flex items-center justify-center">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M3 13L7 3" stroke="#538D4E" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M5 13L9 3" stroke="#538D4E" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="3.5" y1="11" x2="5.5" y2="11" stroke="#538D4E" strokeWidth="1" />
        <line x1="4.5" y1="8" x2="6.5" y2="8" stroke="#538D4E" strokeWidth="1" />
        <line x1="5.5" y1="5" x2="7.5" y2="5" stroke="#538D4E" strokeWidth="1" />
        <path d="M10 4C11 3 13 3 13 5C13 7 10 7 11 9C11.5 10 12 10.5 13 10" stroke="#E63946" strokeWidth="1.2" strokeLinecap="round" fill="none" />
      </svg>
    </div>
  );
}
```

In the `GameIcon` component switch, add:

```typescript
case 'snakes-and-ladders': return <SnakesAndLaddersMini />;
```

In the `gameLabel` function switch, add:

```typescript
case 'snakes-and-ladders': return 'Snakes & Ladders';
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/inbox-types.ts src/hooks/useInbox.ts src/components/inbox/InboxGameItem.tsx
git commit -m "feat(snakes-and-ladders): integrate with inbox system"
```

---

### Task 10: Landing page integration

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Add icon component**

Add after the `BattleshipIcon` function in `src/app/page.tsx`:

```typescript
function SnakesAndLaddersIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      {/* Ladder */}
      <line x1="6" y1="24" x2="12" y2="4" stroke="#538D4E" strokeWidth="2" strokeLinecap="round" />
      <line x1="10" y1="24" x2="16" y2="4" stroke="#538D4E" strokeWidth="2" strokeLinecap="round" />
      <line x1="7" y1="20" x2="11" y2="20" stroke="#538D4E" strokeWidth="1.5" />
      <line x1="8" y1="15" x2="12" y2="15" stroke="#538D4E" strokeWidth="1.5" />
      <line x1="9.5" y1="10" x2="13.5" y2="10" stroke="#538D4E" strokeWidth="1.5" />
      {/* Snake */}
      <path d="M18 6C20 5 23 6 22 9C21 12 17 11 18 14C19 17 22 16 23 18C24 20 22 23 20 22" stroke="#E63946" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  );
}
```

- [ ] **Step 2: Add matchmaking handler**

Add after the `handlePlayBattleship` handler in the `GameSelection` component:

```typescript
const handlePlaySnakesAndLadders = useCallback(async () => {
  setConnecting('snakes-and-ladders');

  const [{ supabase }, { generateBoard }] = await Promise.all([
    import('@/lib/supabase'),
    import('@/lib/snakes-and-ladders-logic'),
  ]);

  const isRicky = playerName === 'Ricky';
  const myId = PLAYER_IDS[playerName];

  async function findGames() {
    const { data } = await supabase
      .from('games')
      .select('*')
      .eq('game_type', 'snakes-and-ladders')
      .is('winner', null)
      .order('created_at', { ascending: false })
      .limit(10);
    return data;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function findMyGame(games: any[] | null) {
    if (!games) return { activeGame: null, joinableGame: null };

    const activeGame = games.find((g) => {
      if (isRicky) return g.player1_name === 'Ricky';
      return g.player2_name === 'Lilian';
    }) || null;

    const joinableGame = games.find((g) => {
      if (isRicky) {
        return g.player1_name === null && g.player2_name === 'Lilian';
      } else {
        return g.player2_name === null && g.player1_name === 'Ricky';
      }
    }) || null;

    return { activeGame, joinableGame };
  }

  async function joinGame(gameId: string) {
    const updateField = isRicky
      ? { player1_id: myId, player1_name: playerName }
      : { player2_id: myId, player2_name: playerName };

    const { error: joinError } = await supabase
      .from('games')
      .update({
        ...updateField,
        updated_at: new Date().toISOString(),
      })
      .eq('id', gameId)
      .select()
      .single();

    if (joinError) {
      console.error('Error joining game:', joinError);
      setConnecting(null);
      return false;
    }
    return true;
  }

  const existingGames = await findGames();
  let { activeGame, joinableGame } = findMyGame(existingGames);

  if (activeGame) {
    router.push(`/snakes-and-ladders/${activeGame.id}`);
    return;
  }

  if (joinableGame) {
    if (await joinGame(joinableGame.id)) {
      router.push(`/snakes-and-ladders/${joinableGame.id}`);
    }
    return;
  }

  await new Promise((resolve) => setTimeout(resolve, 1000));

  const retryGames = await findGames();
  ({ activeGame, joinableGame } = findMyGame(retryGames));

  if (activeGame) {
    router.push(`/snakes-and-ladders/${activeGame.id}`);
    return;
  }

  if (joinableGame) {
    if (await joinGame(joinableGame.id)) {
      router.push(`/snakes-and-ladders/${joinableGame.id}`);
    }
    return;
  }

  const board = generateBoard();
  const insertData = isRicky
    ? {
        game_type: 'snakes-and-ladders',
        board,
        current_turn: 1 as const,
        winner: null,
        player1_id: myId,
        player1_name: playerName,
        player2_id: null,
        player2_name: null,
      }
    : {
        game_type: 'snakes-and-ladders',
        board,
        current_turn: 1 as const,
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
    console.error('Error creating game:', error);
    setConnecting(null);
    return;
  }

  router.push(`/snakes-and-ladders/${data.id}`);
}, [playerName, router]);
```

- [ ] **Step 3: Add game card to the grid**

Add a new `ClickableGameCard` in the games grid (after the Battleship card):

```typescript
<ClickableGameCard
  title="Snakes & Ladders"
  description="Roll the dice, climb ladders, dodge snakes. Race to square 100."
  color="#538D4E"
  icon={<SnakesAndLaddersIcon />}
  delay={0.35}
  onClick={handlePlaySnakesAndLadders}
  loading={connecting === 'snakes-and-ladders'}
/>
```

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat(snakes-and-ladders): add to landing page with matchmaking"
```

---

### Task 11: Verify everything compiles and tests pass

**Files:** None (verification only)

- [ ] **Step 1: Run type check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 2: Run tests**

Run: `npx vitest run`
Expected: All tests pass including new snakes-and-ladders tests

- [ ] **Step 3: Run dev server and verify**

Run: `npm run dev`

Verify:
- Landing page shows Snakes & Ladders card
- Clicking it starts matchmaking
- Board renders with numbered squares, snakes (dashed red lines), and ladders (green parallel lines)
- Rolling dice moves your piece
- Extra turn on 6
- Bounce-back works near 100
- Snakes slide you down, ladders climb you up
- Win celebration on reaching 100
- Inbox shows the game with correct icon
- Leaderboard records the win

- [ ] **Step 4: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix(snakes-and-ladders): address compilation/runtime issues"
```

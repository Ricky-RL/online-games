# Snakes and Ladders — Design Spec

## Overview

Async two-player Snakes and Ladders using the existing `games` table with `game_type = 'snakes-and-ladders'`. Classic 10x10 board (100 squares) with randomly generated snakes and ladders per game. Integrated with inbox and leaderboard.

## Game Rules

- 10x10 board, squares numbered 1-100
- Both players start at square 1, Player 1 goes first
- Single d6 dice roll per turn
- Rolling a 6 grants an extra turn (current_turn stays the same)
- Cannot overshoot square 100 — if roll would exceed 100, bounce back (position = 200 - newPosition)
- Landing on a snake head slides player down to snake tail
- Landing on a ladder bottom moves player up to ladder top
- Snake/ladder resolution applies after bounce-back too
- First player to land exactly on 100 wins (including via ladder)

## Board State (JSONB in `games.board`)

```typescript
interface SnakesAndLaddersState {
  players: { 1: number; 2: number }
  snakes: Record<number, number>   // head → tail
  ladders: Record<number, number>  // bottom → top
  lastRoll: { player: 1 | 2; value: number } | null
}
```

No `hasExtraTurn` field needed — on a roll of 6, `current_turn` in the `games` table simply doesn't advance. The client detects extra turn by checking `lastRoll.value === 6`.

## Game Logic (`src/lib/snakes-and-ladders-logic.ts`)

### Exports

- `generateBoard(): SnakesAndLaddersState` — creates initial state with random snakes/ladders
- `rollDice(): number` — returns 1-6
- `makeMove(state: SnakesAndLaddersState, player: 1 | 2, roll: number): SnakesAndLaddersState` — applies move
- `checkWin(state: SnakesAndLaddersState): 1 | 2 | null` — returns winner if any player is on 100
- `getSquareEntity(state: SnakesAndLaddersState, square: number): { type: 'snake' | 'ladder'; destination: number } | null` — helper for rendering

### Move Resolution Order

1. Advance position by roll value
2. If position > 100, bounce back: `position = 200 - position`
3. Check if new position is a snake head or ladder bottom — apply transport
4. Check if position === 100 (win)

### Board Generation Constraints

- 8 snakes + 8 ladders (16 entities total)
- Occupied set tracks all endpoints (32 squares) plus squares 1 and 100
- No square can appear as more than one endpoint
- Snakes: head must be higher-numbered than tail
- Ladders: top must be higher-numbered than bottom
- At least 2 snakes in range 80-99 (to keep endgame interesting)
- At least 2 ladders in range 2-20 (to give early boosts)
- Max 100 attempts per entity placement (defensive guard)

### Tests (`src/lib/snakes-and-ladders-logic.test.ts`)

- `generateBoard()` produces valid state with correct counts and no overlaps
- `makeMove()` handles normal advance, bounce-back, snake slide, ladder climb
- `makeMove()` handles landing on 100 via normal move and via ladder
- `checkWin()` correctly identifies winner
- Edge: bounce-back lands on snake head
- Edge: ladder lands on exactly 100

## State Hook (`src/hooks/useSnakesAndLaddersGame.ts`)

Follows the pattern of `useGame.ts` / `useTicTacToeGame.ts`:

- Fetch game on mount, poll every 1500ms
- Optimistic update on roll: update local state immediately, then write to Supabase
- On roll of 6: write same `current_turn` value (don't swap)
- On roll of 1-5: swap `current_turn` (1→2 or 2→1)
- If position === 100 after move: set `winner` on the games row
- `matchRecorded` ref prevents double-recording
- Detect opponent's move by comparing player positions between polls
- Out-of-order poll guard: only accept poll responses with `updated_at` >= current known `updated_at` (same pattern as other game hooks)

### Return Interface

```typescript
interface UseSnakesAndLaddersGameReturn {
  game: Game | null
  board: SnakesAndLaddersState | null
  loading: boolean
  error: string | null
  lastMove: { player: 1 | 2; from: number; to: number; roll: number } | null
  deleted: boolean
  rollDice: () => Promise<void>
  resetGame: () => Promise<void>
}
```

## UI Components

### `src/components/snakes-and-ladders/Board.tsx`

- 10x10 grid rendered with numbered squares
- Numbering follows snaking pattern: row 1 (bottom) is 1-10 left-to-right, row 2 is 11-20 right-to-left, etc.
- Snakes rendered as colored curved lines from head to tail
- Ladders rendered as colored parallel lines from bottom to top
- Player pieces as colored circles (`bg-player1` / `bg-player2`)
- Framer Motion animation for piece movement along the path
- Highlight current square and last-moved piece

### `src/components/snakes-and-ladders/DiceRoll.tsx`

- Dice face showing current/last roll value (dot pattern)
- "Roll Dice" button — only enabled when it's your turn
- Spring animation on roll
- Shows "Extra turn!" indicator when last roll was 6

### Game Page (`src/app/snakes-and-ladders/[gameId]/page.tsx`)

- Board component (main area)
- Dice component (below or beside board)
- `TurnIndicator` — whose turn with player colors
- `WinCelebration` — confetti + play again on win
- `EndGameDialog` — confirmation to quit
- `SettingsButton` — color picker
- `useNotifications()` — browser notifications on opponent's move

### Lobby Page (`src/app/snakes-and-ladders/page.tsx`)

- Same matchmaking pattern as tic-tac-toe lobby
- Player selection (Ricky / Lilian)
- Auto-join if game waiting, else create new game
- Board generated on game creation (snakes/ladders fixed for the game's lifetime)

## Inbox Integration

1. Add `'snakes-and-ladders'` to `InboxGameType` union in `src/lib/inbox-types.ts`
2. Add `'snakes-and-ladders'` to `.in('game_type', [...])` filter in `src/hooks/useInbox.ts`
3. Add dice/snake icon and "Snakes & Ladders" label in `src/components/inbox/InboxGameItem.tsx`

## Leaderboard Integration

- Call `recordMatchResult()` on win with `game_type: 'snakes-and-ladders'`
- Stats appear in existing leaderboard component alongside other games
- No additional metadata tracked (wins/losses only)

## Landing Page

- Add `ClickableGameCard` for Snakes & Ladders with a snake/dice icon
- Add `handlePlaySnakesAndLadders()` matchmaking handler
- Position in grid alongside existing games

## Files to Create

- `src/lib/snakes-and-ladders-logic.ts`
- `src/lib/snakes-and-ladders-logic.test.ts`
- `src/hooks/useSnakesAndLaddersGame.ts`
- `src/app/snakes-and-ladders/page.tsx`
- `src/app/snakes-and-ladders/[gameId]/page.tsx`
- `src/components/snakes-and-ladders/Board.tsx`
- `src/components/snakes-and-ladders/DiceRoll.tsx`

## Files to Modify

- `src/lib/inbox-types.ts` — add to union type
- `src/hooks/useInbox.ts` — add to game_type filter
- `src/components/inbox/InboxGameItem.tsx` — add icon/label
- `src/app/page.tsx` — add game card + matchmaking handler

## No Database Migration Needed

The existing `games` table already supports arbitrary `game_type` text values and JSONB `board` field. No schema change required.

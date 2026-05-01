# Game Standards

This document defines how every game, activity, or shared experience on this site should be built. Follow these patterns exactly so the site stays consistent.

## What this site is

A tiny collection of two-player experiences for Ricky and Lilian. Some are competitive games (Connect Four, Tic-Tac-Toe), some could be cooperative, and some aren't games at all (like a shared whiteboard). Every experience uses the same player system, the same database, the same matchmaking, and the same visual language.

## Players

There are exactly two players: **Ricky** (Player 1) and **Lilian** (Player 2).

- Ricky's UUID: `00000000-0000-0000-0000-000000000001`
- Lilian's UUID: `00000000-0000-0000-0000-000000000002`
- Player identity is stored in `sessionStorage` and `localStorage` under key `'player-name'`
- Player 1 is always Ricky. Player 2 is always Lilian. Never swap this.

```tsx
const playerName = sessionStorage.getItem('player-name') || localStorage.getItem('player-name');
const isPlayer1 = playerName === 'Ricky';
```

## Tech stack

- Next.js 16 (App Router, all pages are client components)
- React 19
- Tailwind CSS 4 (with `@utility` directives for player colors)
- Supabase (PostgreSQL + anonymous RLS)
- Framer Motion (all animations)
- canvas-confetti (win celebrations)
- @dnd-kit (drag-and-drop for game card reordering)
- Vitest (unit testing)

## File structure for a new game

```
src/
├── app/[game-name]/
│   ├── page.tsx                    Lobby (matchmaking, player check)
│   └── [gameId]/page.tsx           Game page (renders board + UI)
├── components/[game-name]/
│   ├── Board.tsx                   Game board rendering
│   └── [other game-specific].tsx   Pieces, marks, overlays
├── hooks/
│   └── use[GameName]Game.ts        Game state hook (Supabase sync)
├── lib/
│   └── [game-name]-logic.ts        Pure game logic (no side effects)
│   └── [game-name]-logic.test.ts   Tests for game logic
```

## Database

All games use the single `games` table. Differentiate by `game_type`:

```sql
-- Existing columns
id            uuid (primary key, auto-generated)
game_type     text ('connect-four', 'tic-tac-toe', '[your-game-name]')
board         jsonb (game-specific board state)
current_turn  int (1 or 2, whose turn)
winner        int (1, 2, or null)
player1_id    uuid (Ricky's UUID or null)
player2_id    uuid (Lilian's UUID or null)
player1_name  text ('Ricky' or null)
player2_name  text ('Lilian' or null)
created_at    timestamptz
updated_at    timestamptz
```

For cooperative or non-turn-based experiences (like a whiteboard), use `current_turn` and `winner` as needed or leave them null. The `board` column stores any JSON state your game needs.

## Matchmaking flow

Every game follows the same matchmaking pattern. The logic lives in `src/app/page.tsx` (landing page) and/or a lobby page.

1. Query `games` for `game_type = '[your-game]'` and `winner IS NULL`
2. Look for a game the current player is already in (resume)
3. Look for a game the other player created that has an empty slot (join)
4. Wait 1 second, retry steps 2-3 (prevents race conditions)
5. If nothing found, create a new game
6. Navigate to `/[game-name]/[gameId]`

Reference implementation: see `handlePlayConnectFour` in `src/app/page.tsx`.

### Adding your game to the landing page

Add a `ClickableGameCard` in the `GameSelection` component of `src/app/page.tsx`:

```tsx
<ClickableGameCard
  title="Your Game"
  description="Short description."
  color="#E63946"
  icon={<YourGameIcon />}
  delay={0.35}
  onClick={handlePlayYourGame}
  loading={connectingYourGame}
/>
```

## Game state hook pattern

Every game needs a hook that manages Supabase sync. Follow this pattern (see `src/hooks/useGame.ts` or `src/hooks/useTicTacToeGame.ts`):

```tsx
export function useYourGame(gameId: string) {
  // State: game object, loading, error, deleted
  // On mount: fetch game from Supabase
  // Poll every 1500ms for opponent's moves
  // Expose makeMove() with optimistic updates
  // Expose resetGame() for play-again flow
  // Handle game deletion detection
}
```

Key behaviors:
- **Optimistic updates**: Update local state immediately on move, then sync to Supabase
- **Polling**: Fetch fresh state every 1500ms to detect opponent moves
- **Out-of-order handling**: Compare move counts to avoid reverting newer state
- **Error recovery**: On failed update, refetch and apply server state

## Game logic pattern

Pure functions in `src/lib/[game-name]-logic.ts`. No imports from React or Supabase.

Required exports:

```tsx
// Create initial board state
export function createEmptyBoard(): YourBoard { ... }

// Apply a move, return new board (or throw/return null on invalid)
export function makeMove(board: YourBoard, ...moveParams, player: Player): YourBoard { ... }

// Check if someone won (return winner player number or null)
export function checkWin(board: YourBoard): Player | null { ... }

// Check for draw
export function isDraw(board: YourBoard): boolean { ... }
```

Write tests in a `.test.ts` file alongside the logic file.

## Player colors

Every game must use the player color system. Players choose their colors in a global settings modal.

### Use Tailwind classes for backgrounds and text

```tsx
<div className="bg-player1" />  // Ricky's color
<div className="bg-player2" />  // Lilian's color
<span className="text-player1">Ricky</span>
<span className="text-player2">Lilian</span>
```

### Use the context hook for dynamic values

```tsx
import { useColors } from '@/contexts/PlayerColorsContext';
import { hexToRgba, confettiColors } from '@/lib/colors';

const { player1Color, player2Color } = useColors();
const shadow = hexToRgba(player1Color, 0.4);
const confetti = confettiColors(player2Color);
```

### Rules
- Never hardcode `#E63946` or `#FFBE0B` as player colors
- Never build your own color picker — the global SettingsModal handles it
- Always use `bg-player1`/`bg-player2` or `useColors()` for anything player-colored

## Shared components to reuse

| Component | Path | Purpose |
|-----------|------|---------|
| `TurnIndicator` | `src/components/TurnIndicator.tsx` | Shows whose turn it is with colored dot |
| `WinCelebration` | `src/components/WinCelebration.tsx` | Win message + confetti + Play Again/Home buttons |
| `EndGameDialog` | `src/components/EndGameDialog.tsx` | "Are you sure?" modal for ending a game |
| `SettingsButton` | `src/components/SettingsButton.tsx` | Gear icon for color settings (add to your game page) |

### Using WinCelebration

```tsx
import { WinCelebration } from '@/components/WinCelebration';

<WinCelebration
  winner={game.winner}      // 1 or 2
  winnerName={winnerName}   // 'Ricky' or 'Lilian'
  isMe={isMyWin}            // boolean
  onPlayAgain={handleReset}
  onHome={() => router.push('/')}
/>
```

### Using TurnIndicator

```tsx
import { TurnIndicator } from '@/components/TurnIndicator';

<TurnIndicator
  currentTurn={game.current_turn}
  myPlayerNumber={isPlayer1 ? 1 : 2}
  opponentName={isPlayer1 ? 'Lilian' : 'Ricky'}
/>
```

## Animation standards

- Use Framer Motion for all animations
- Game piece placement: spring physics (`type: 'spring', stiffness: 200, damping: 12`)
- UI entrance: ease curve `[0.21, 0.47, 0.32, 0.98]`
- Win effects: infinite pulse (`scale: [1, 1.05, 1]`)
- Page transitions: fade + slight y-offset

## Game page template

Every game page should include:

```tsx
'use client';

import { useParams, useRouter } from 'next/navigation';
import { SettingsButton } from '@/components/SettingsButton';
import { TurnIndicator } from '@/components/TurnIndicator';
import { WinCelebration } from '@/components/WinCelebration';
import { EndGameDialog } from '@/components/EndGameDialog';
import { useYourGame } from '@/hooks/useYourGame';

export default function YourGamePage() {
  const { gameId } = useParams();
  const router = useRouter();
  const { game, makeMove, resetGame, loading, deleted } = useYourGame(gameId as string);

  // Determine player identity
  const playerName = sessionStorage.getItem('player-name') || localStorage.getItem('player-name');
  const myPlayerNumber = playerName === 'Ricky' ? 1 : 2;

  // Handle deleted/loading states
  if (deleted) { router.push('/'); return null; }
  if (loading || !game) return <LoadingState />;

  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-screen p-4 gap-6">
      <SettingsButton />
      <TurnIndicator ... />
      <YourBoard ... />
      {game.winner && <WinCelebration ... />}
      <nav>
        <button onClick={() => router.push('/')}>Home</button>
        <EndGameButton />
      </nav>
    </div>
  );
}
```

## Non-game experiences (whiteboards, etc.)

For collaborative non-game experiences:
- Still use the `games` table (the `board` column holds any JSON state)
- Still use player colors for cursors, markers, or identity indicators
- Set `game_type` to your experience name
- `current_turn` and `winner` can be null or unused
- Polling frequency can be adjusted (faster for real-time drawing, slower for async)
- Skip `TurnIndicator` and `WinCelebration` if they don't apply

## Existing games as reference

### Connect Four
- **Logic**: `src/lib/game-logic.ts`
- **Hook**: `src/hooks/useGame.ts`
- **Page**: `src/app/connect-four/[gameId]/page.tsx`
- **Components**: `src/components/Board.tsx`, `Cell.tsx`, `Piece.tsx`
- **Board type**: 7 columns (arrays that grow from bottom), max 6 pieces each

### Tic-Tac-Toe
- **Logic**: `src/lib/tic-tac-toe-logic.ts`
- **Hook**: `src/hooks/useTicTacToeGame.ts`
- **Lobby**: `src/app/tic-tac-toe/page.tsx`
- **Page**: `src/app/tic-tac-toe/[gameId]/page.tsx`
- **Components**: `src/components/tic-tac-toe/Board.tsx`, `Mark.tsx`, `WinLine.tsx`
- **Board type**: 3x3 grid (`[row][col]`, each cell is `1 | 2 | null`)

### Battleship
- **Logic**: `src/lib/battleship-logic.ts`
- **Hook**: `src/hooks/useBattleshipGame.ts`
- **Page**: `src/app/battleship/[gameId]/page.tsx`
- **Board type**: Ship placements + attack arrays in `BattleshipBoardState`

### Checkers
- **Logic**: `src/lib/checkers-logic.ts`
- **Hook**: `src/hooks/useCheckersGame.ts`
- **Page**: `src/app/checkers/[gameId]/page.tsx`
- **Board type**: 8x8 grid with `CheckersPiece | null` cells, supports kings and multi-jump

### Mini Golf
- **Logic**: `src/lib/mini-golf/logic.ts`, `physics.ts`, `collision.ts`, `levels.ts`
- **Hook**: `src/hooks/useMiniGolfGame.ts`
- **Page**: `src/app/mini-golf/[gameId]/page.tsx`
- **Board type**: `MiniGolfBoard` with scores, shots, hole progression, and canvas-based rendering

### Jenga
- **Logic**: `src/lib/jenga-logic.ts`
- **Hook**: `src/hooks/useJengaGame.ts`
- **Page**: `src/app/jenga/[gameId]/page.tsx`
- **Board type**: `JengaGameState` with tower grid, wobble score, move history, and cascade risks

### Snakes & Ladders
- **Logic**: `src/lib/snakes-and-ladders-logic.ts`
- **Hook**: `src/hooks/useSnakesAndLaddersGame.ts`
- **Page**: `src/app/snakes-and-ladders/[gameId]/page.tsx`
- **Board type**: `SnakesAndLaddersState` with player positions, snakes/ladders maps, powerups, and replay events

### Word Search
- **Logic**: `src/lib/word-search-logic.ts`, `word-search-themes.ts`
- **Hook**: `src/hooks/useWordSearchGame.ts`
- **Page**: `src/app/word-search/[gameId]/page.tsx`
- **Board type**: `WordSearchBoardState` with grid, word placements, and per-player results

### Monopoly
- **Logic**: `src/lib/monopoly/logic.ts`, `board-data.ts`
- **Hook**: `src/hooks/useMonopolyGame.ts`
- **Page**: `src/app/monopoly/[gameId]/page.tsx`
- **Board type**: `MonopolyBoard` with 40 Vancouver-themed spaces, player states, and property ownership

### Memory
- **Logic**: `src/lib/memory-logic.ts`
- **Hook**: `src/hooks/useMemoryGame.ts`
- **Page**: `src/app/memory/[gameId]/page.tsx`
- **Board type**: `MemoryBoardState` with 20 emoji cards (10 pairs), per-player scores, and flip tracking

## Checklist for shipping a new game

### Core
- [ ] Game logic file with `createEmptyBoard`, `makeMove`, `checkWin`, `isDraw`
- [ ] Tests for game logic
- [ ] Game state hook with Supabase sync and polling
- [ ] Lobby page with matchmaking (async -- Player 1 can take turn without Player 2)
- [ ] Game page with board, turn indicator, win celebration, end game
- [ ] Player colors integrated (no hardcoded hex values)
- [ ] `<SettingsButton />` included on game page
- [ ] Game card added to landing page with matchmaking handler
- [ ] Game added to `DEFAULT_GAME_ORDER` in `src/lib/game-registry.ts`
- [ ] Animations use Framer Motion
- [ ] Works for both Ricky and Lilian (test both player perspectives)

### Inbox Integration
- [ ] Add game type to `InboxGameType` union in `src/lib/inbox-types.ts`
- [ ] Add to `.in('game_type', [...])` filter in `src/hooks/useInbox.ts`
- [ ] Add icon and label in `src/components/inbox/InboxGameItem.tsx`

### Leaderboard & Match History
- [ ] Add game type to `GameType` in `src/lib/match-results.ts`
- [ ] Add game type to `MatchResult['game_type']` in `src/hooks/useMatchHistory.ts`
- [ ] Add to `by_game` object in `LeaderboardStats` and `computeStats()` in `src/hooks/useMatchHistory.ts`
- [ ] Add a `<GameStat>` entry in `src/components/Leaderboard.tsx`
- [ ] Add icon and label cases in `src/components/MatchHistory.tsx`
- [ ] Call `recordMatchResult()` on game completion in your game hook

### Notifications
- [ ] Add game label to `GAME_LABELS` in `supabase/functions/notify-telegram/index.ts`

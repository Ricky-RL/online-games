# Jenga — Design Spec

## Overview

A turn-based, strategic Jenga game for two players with abstracted physics. Players share a tower, take turns pulling blocks, and the player who topples the tower loses.

## Core Mechanics

### Tower Structure

- Standard Jenga tower: 18 rows × 3 blocks = 54 blocks
- Each row alternates orientation (determined by `row % 2`, not stored per block)
- Pulled blocks are placed on top, building new rows

### Block Risk

Each block has an individual risk percentage determined by:

- **Row position**: lower rows are riskier (supporting more weight)
- **Column position**: middle blocks are safer than edge blocks (+5 for edge)
- **Neighbors**: blocks adjacent to already-pulled gaps are riskier (+10 per adjacent empty slot)

Formula: `base_risk = (1 - row/total_rows) * 30 + edge_bonus(5) + gap_bonus(10 per gap)`

Where `total_rows` = current tower height (initial 18 + new rows added on top).

### Tower Wobble (Cumulative Instability)

- Global wobble score starts at 0
- Each successful pull adds to the wobble score (riskier pulls add more)
- Wobble makes ALL future pulls riskier: `effective_risk = block_risk + wobble_score`
- Wobble increases non-linearly as game progresses (early pulls are safe, late pulls are tense)

### Topple Check

After each pull:

1. Calculate `effective_risk = block_risk + wobble_score`
2. Cap at 95 (there's always a small chance of survival)
3. Random roll: if `random(0-100) < effective_risk`, tower topples
4. Player who toppled loses

### Win Condition

- Binary: the player who causes the tower to fall loses
- Winner gets +1 win on the leaderboard

## Visual Design

### Isometric 3D View

- Pseudo-3D isometric rendering of the tower using CSS transforms
- Blocks rendered as rectangular prisms with visible faces
- Alternating row orientations visible in the isometric view
- **Discrete rotation**: 4 fixed viewpoints at 90-degree increments (no continuous rotation — keeps it pure CSS, no Three.js needed)

### Interaction

- **Rotate button** or swipe to cycle through 4 viewpoints (front, right, back, left)
- **Tap a block** to select it — highlights and shows risk percentage overlay
- **Confirm button** appears after selection to execute the pull
- **Cancel** by tapping elsewhere or a cancel button

### Animations

- Block slides out from its position (direction depends on orientation)
- Block floats up and settles on top of the tower
- Tower wobble animation: subtle oscillation that intensifies with wobble score
- **Tower collapse**: dramatic falling/scattering animation when someone loses
- **Winner celebration**: confetti via canvas-confetti

### Visual Indicators

- Color gradient on blocks indicating risk (green = safe, yellow = moderate, red = dangerous)
- Wobble meter/bar showing current tower instability
- Current player indicator
- Turn history showing recent pulls

## Data Model

### Game State (JSON in `games` table `board` column)

```typescript
interface JengaGameState {
  tower: JengaBlock[][];        // rows of blocks (bottom to top)
  wobble_score: number;         // cumulative instability (0-100)
  move_history: JengaMove[];    // log of pulls for replay/display
}

interface JengaBlock {
  id: string;                   // deterministic: "row-col" e.g. "0-0", "0-1"
  exists: boolean;              // false if pulled from this position
}

interface JengaMove {
  player: 1 | 2;
  row: number;
  col: number;
  risk: number;
  wobble_after: number;
  toppled: boolean;
}
```

Note: `current_turn`, `winner`, and game status are stored on the `games` table row itself (not in the JSON), consistent with all other games. Orientation is computed from `row % 2`.

### Database

- Uses existing `games` table with `game_type: 'jenga'`
- State stored in the `board` JSON column
- `current_turn: 1 | 2` on the table row
- `winner: 1 | 2 | null` on the table row
- Real-time sync via Supabase polling (1.5s interval, same pattern as other games)

## Integration

### Inbox

- Add `'jenga'` to `InboxGameType` union in `src/lib/inbox-types.ts`
- Add to `.in('game_type', [...])` filter in `src/hooks/useInbox.ts`
- Add icon (tower/blocks icon) and label in `src/components/inbox/InboxGameItem.tsx`
- Notifications: "It's your turn", "Opponent pulled a block", "Game over — you won/lost"

### Leaderboard / Match Results

- Add `'jenga'` to `MatchResult.game_type` union in `src/hooks/useMatchHistory.ts`
- Add `'jenga'` key to `LeaderboardStats.by_game`
- Call `recordMatchResult()` when the game ends (in `useJengaGame.ts`)
- Displayed alongside Connect Four, Tic-Tac-Toe, Checkers, Battleship, Wordle

### Home Page

- New game tile on home page with Jenga icon
- Uses `router.push('/jenga')` pattern (like Checkers)

## Game Flow

1. Player 1 clicks Jenga tile → navigates to `/jenga` lobby
2. Player 1 creates a new game → generates shareable URL
3. Player 2 opens link → joins the game
4. Tower initializes with 54 blocks in 18 rows
5. Players alternate turns:
   a. Rotate tower to inspect blocks from different angles
   b. Tap a block to see its risk
   c. Confirm to pull
   d. Topple check runs
   e. If safe: block moves to top, wobble increases, turn passes
   f. If toppled: game over, opponent wins
6. Real-time sync shows opponent's actions via polling
7. On game end: `recordMatchResult()` called, winner set on table row

## File Structure

```
src/
  app/jenga/page.tsx                    # Lobby/new game page
  app/jenga/[gameId]/page.tsx           # Game page
  components/jenga/
    JengaTower.tsx                       # Isometric tower renderer
    JengaBlock.tsx                       # Individual block component
    JengaControls.tsx                    # Rotate/interact controls
    JengaRiskOverlay.tsx                 # Risk % display on selection
    JengaWobbleMeter.tsx                # Tower instability indicator
    JengaCollapseAnimation.tsx          # Tower fall animation
  hooks/useJengaGame.ts                 # Game state + real-time sync
  lib/jenga-logic.ts                    # Risk calculation, topple check, state management
  lib/jenga-logic.test.ts              # Unit tests for game logic
```

## Edge Cases

- **All blocks in a row pulled**: row collapses, increases wobble significantly
- **Last block in a row**: extremely high risk to pull
- **Very early game**: wobble is low, almost all pulls are safe (ramp-up period)
- **Disconnection**: game state persists in DB, player can rejoin and continue
- **Refresh**: reads current tower state from Postgres (source of truth)
- **Game end/cleanup**: follows existing pattern (set winner on row, "Play Again" creates new game)

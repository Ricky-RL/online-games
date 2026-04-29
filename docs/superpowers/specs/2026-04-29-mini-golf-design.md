# Mini Golf Game — Design Spec

## Overview

A two-player turn-based minigolf game for Ricky and Lilian. Players take turns completing holes (up to 6 strokes each), with the lowest total score winning. Each game consists of 3 holes randomly selected from 15 levels across 3 difficulty tiers.

## Game Rules

- **Players:** 2 (Ricky and Lilian, existing player system)
- **Holes per game:** 3 (one random from each tier: easy, medium, hard)
- **Turn structure:** Player 1 completes the entire hole, then Player 2 plays the same hole
- **Stroke cap:** 6 per hole. If ball not sunk after 6 strokes, score is 7 (penalty)
- **Scoring:** null = unplayed, 1-6 = strokes taken, 7 = penalty (failed to sink)
- **Winner:** Lowest total strokes. Tiebreaker: lowest single-hole score. Still tied: draw.

## Aiming & Shooting

- **Mechanic:** Drag-back slingshot — touch/click ball, drag backward, release to shoot
- **Direction:** Opposite of drag direction
- **Power:** Proportional to drag distance, capped at ~150px = max power
- **Visual feedback:** Dotted aim line from ball in shot direction, length = power. Line turns red/changes color at max power.
- **Mobile UX requirements:**
  - `touch-action: none` on canvas element
  - `overscroll-behavior: none` on game container
  - `setPointerCapture` to track drags outside canvas bounds
  - Max drag capped at 150px (no long drags needed)

## Physics System

**Arcade-style — predictable, not realistic.**

- **Movement:** Ball gets velocity vector `(vx, vy)` on shot. Moves at constant speed initially.
- **Friction:** After a set distance (based on power), ball decelerates linearly until stop.
- **Wall collision:** Reflect velocity across wall normal. No energy loss. Ball radius accounted for.
- **Hole (cup):** Ball sinks if center is within hole radius AND speed < `SINK_SPEED_THRESHOLD`. Fast balls roll over.
- **Stop condition:** Speed < `MIN_SPEED` → ball stops immediately.

**Tunable constants:**
- `BASE_SPEED` — initial speed multiplier from drag power
- `MAX_POWER` — cap on drag distance
- `FRICTION_RATE` — deceleration per frame
- `SINK_SPEED_THRESHOLD` — max speed to enter hole
- `BALL_RADIUS` — collision radius
- `SAND_FRICTION_MULTIPLIER` — sand slowdown (e.g., 3x)
- `BUMPER_BOOST` — speed multiplier on bumper hit
- `MIN_SPEED` — below this, ball stops

**Frame loop:**
1. If ball is moving:
   - Calculate next position
   - Check wall/obstacle collisions → reflect/modify velocity
   - Check sand zone → apply extra friction
   - Check water zone → reset ball to shot start, stroke counts
   - Check portal → teleport ball preserving velocity
   - Check hole proximity + speed → sink or pass over
   - Apply friction
   - If speed < MIN_SPEED → stop ball
2. If ball stopped and not sunk:
   - Increment stroke count
   - If strokes >= 6 → auto-end with penalty score (7)
   - Else → return to aiming state

## Obstacle Types

| Type | Behavior | Tier |
|------|----------|------|
| Wall | Reflects ball cleanly | All |
| Bumper | Reflects + speed boost | Easy+ |
| Sand | Extra friction (ball slows faster) | Medium+ |
| Water | Ball resets to shot start position, stroke counts | Medium+ |
| Portal | Ball enters, exits at paired portal with same velocity | Hard |
| Moving wall | Oscillates between two positions at defined speed | Hard |

## Level Data Format

```typescript
interface Level {
  id: number;
  name: string;
  tier: 'easy' | 'medium' | 'hard';
  par: number;
  start: { x: number; y: number };
  hole: { x: number; y: number; radius: number };
  walls: { x1: number; y1: number; x2: number; y2: number }[];
  bumpers?: { x: number; y: number; radius: number }[];
  sand?: { points: { x: number; y: number }[] }[];
  water?: { points: { x: number; y: number }[] }[];
  portals?: { in: { x: number; y: number }; out: { x: number; y: number } }[];
  movingWalls?: {
    start: { x1: number; y1: number; x2: number; y2: number };
    end: { x1: number; y1: number; x2: number; y2: number };
    speed: number;
  }[];
}
```

**Coordinate system:** 400x700 normalized units (portrait). Origin (0,0) at top-left. Canvas scales to fill viewport maintaining aspect ratio.

## 15 Levels

| # | Tier | Name | Key Feature |
|---|------|------|-------------|
| 1 | Easy | Straight Shot | Simple straight path with one turn |
| 2 | Easy | L-Bend | 90-degree corner |
| 3 | Easy | Zigzag | Two gentle zigzags |
| 4 | Easy | Wide Funnel | Narrows toward hole |
| 5 | Easy | Bumper Alley | Straight path with one bouncy bumper |
| 6 | Medium | Sand Pit | Direct route through sand, or long way around |
| 7 | Medium | Island Green | Water surrounds hole, narrow bridge access |
| 8 | Medium | Bumper Maze | Multiple bumpers creating chaotic bounces |
| 9 | Medium | Double Dog-leg | Two sharp turns with sand on inside corners |
| 10 | Medium | Moat | Water hazard you must clear with precise power |
| 11 | Hard | Portal Jump | Must use portal to reach the hole |
| 12 | Hard | Moving Gate | Oscillating wall blocks direct path |
| 13 | Hard | Gauntlet | Sand + water + moving wall in sequence |
| 14 | Hard | Double Portal | Two portal pairs, must chain them |
| 15 | Hard | The Fortress | Moving walls + bumpers + water surrounding hole |

## Database Schema

Uses existing `games` table with `game_type: 'mini-golf'`.

**Board JSONB structure:**
```json
{
  "levels": [3, 8, 14],
  "currentHole": 0,
  "scores": [[null, null], [null, null], [null, null]],
  "currentStroke": 0,
  "lastShot": null,
  "ready": [false, false],
  "phase": "waiting",
  "version": 1
}
```

**Field semantics:**
- `levels` — array of 3 level indices (one per tier), chosen at game creation
- `currentHole` — 0, 1, or 2
- `scores[holeIndex][playerIndex]` — Player 1 = index 0, Player 2 = index 1. `null` = unplayed, `1-6` = strokes, `7` = penalty
- `currentStroke` — strokes taken so far on current hole by active player (0-6)
- `lastShot` — `{angle, power}` of current/last shot, for recovery on page refresh. `null` when aiming.
- `ready[playerIndex]` — both must be `true` to advance from scoreboard to next hole
- `phase` — `"waiting" | "aiming" | "scoreboard" | "finished"`
- `version` — monotonically increasing, used for optimistic concurrency

**Row-level `current_turn` column is authoritative** for whose turn it is (1 or 2).

**Player index mapping:** `current_turn` (1|2) → array index (0|1) via utility: `const playerIndex = (turn: number) => turn - 1`

## State Machine

**Phases (DB-persisted):**
- `"waiting"` — game created, waiting for Player 2 to join
- `"aiming"` — active player is taking shots on the current hole
- `"scoreboard"` — both players completed current hole, reviewing scores
- `"finished"` — all 3 holes complete, showing final results

**"Animating" is client-local state only** — not persisted to DB.

**State transitions:**

| Transition | Triggered by | DB Write |
|------------|-------------|----------|
| Game created | P1 (lobby) | Creates row: `phase: "waiting"` |
| P2 joins | P2 (lobby) | `player2_id`, `phase: "aiming"`, conditional `WHERE player2_id IS NULL` |
| Shot taken | Active player | `currentStroke++`, `lastShot: {angle, power}`, `version++` |
| Ball stops (not sunk) | Active player | No additional write (stroke already counted) |
| Ball sinks | Active player | `scores[hole][player] = strokes`, clear `lastShot` |
| P1 finishes hole | P1's client | Writes score, flips `current_turn: 2`, resets `currentStroke: 0` |
| P2 finishes hole | P2's client | Writes score, sets `phase: "scoreboard"`, resets `ready: [false, false]` |
| Player clicks "Ready" | Either | Sets `ready[playerIndex] = true`, `version++` |
| Both ready | Last-to-ready player | `currentHole++`, `currentStroke: 0`, `phase: "aiming"`, `current_turn: 1`, `ready: [false, false]`, `version++` |
| Final hole both done | P2's client | `phase: "finished"`, sets `winner` column |
| Forfeit | Either player | `phase: "finished"`, sets `winner` to opponent |

**All writes use `WHERE version = :expected`** to prevent race conditions.

**Stroke written on shot initiation** (before animation) to prevent the page-refresh free-retry exploit.

## Game Flow

```
LOBBY → CREATE/JOIN → WAITING → P2 JOINS →

  HOLE LOOP (×3):
    P1 plays (up to 6 shots):
      AIMING → SHOT → ANIMATING (local) → BALL STOPS →
        sunk? → record score, flip to P2
        not sunk + strokes < 6? → AIMING again
        strokes = 6? → record penalty (7), flip to P2

    P2 plays (same):
      (identical flow)

    Both done → SCOREBOARD
      Both click "Ready" → advance to next hole

  After 3 holes → FINISHED (scorecard + stats + confetti)
```

## Non-Active Player Experience

- Sees the course layout for the current hole
- Header shows "Ricky is playing Hole 2" with stroke count (updates via poll)
- Cannot interact with canvas
- When `current_turn` flips to them: notification fires, enters aiming mode

## Scoreboard (Between Holes)

- Per-hole scores for both players (completed holes)
- Running total
- "Ready" button for each player (shows checkmark when pressed)
- Advances to next hole when both are ready

## End Game Screen

- Full scorecard: strokes per hole for both players
- Total strokes + winner announcement
- Fun stats:
  - "Hole-in-one!" (any 1-stroke hole)
  - "Least strokes on a single hole"
  - "Most bounces in a shot" (track wall hits during animation)
  - "Closest call" (narrowest speed that still sank)
- Confetti via extracted `useConfetti()` hook
- Play Again / Home buttons

## File Structure

```
src/app/mini-golf/
  ├── page.tsx                    # Lobby/matchmaking
  └── [gameId]/page.tsx           # Game play page

src/components/mini-golf/
  ├── Canvas.tsx                  # Main canvas renderer + physics loop
  ├── AimingIndicator.tsx         # Canvas layer: dotted aim line
  ├── CourseRenderer.tsx          # Draws level walls/obstacles/hole
  ├── Scoreboard.tsx              # Between-holes: scores + ready buttons
  ├── EndGameScreen.tsx           # Final scorecard + stats + confetti
  └── StrokeCounter.tsx           # DOM overlay: "Stroke 3/6" (pointer-events-none)

src/hooks/
  ├── useMiniGolfGame.ts          # Supabase sync, turn mgmt, polling
  └── useConfetti.ts              # Extracted confetti logic (shared)

src/lib/mini-golf/
  ├── physics.ts                  # Ball movement, friction, deceleration
  ├── physics.test.ts             # Physics tests
  ├── collision.ts                # Line-segment collision, reflection
  ├── collision.test.ts           # Collision tests
  ├── levels.ts                   # 15 level definitions
  ├── types.ts                    # MiniGolfGameState, Level, etc.
  ├── logic.ts                    # Pure game logic (scoring, win condition, stats)
  └── logic.test.ts               # Logic tests
```

## Shared Component Modifications

| Component | Change |
|-----------|--------|
| `TurnIndicator` | Add optional `label?: string` prop to override derived text |
| `useGameSounds` | Widen sound type from `'drop' \| 'win'` to `string` |
| `useNotifications` | Add `'mini-golf'` to GameType union, add notification body text, add optional `notificationTitle` prop |
| `WinCelebration` | Extract confetti logic into `useConfetti()` hook |

## Landing Page Integration

- 4th game card in the grid: "Mini Golf" with golf icon
- `handlePlayMiniGolf` matchmaking handler (same pattern as Tic-Tac-Toe)
- Loading state on card during matchmaking
- Grid is already `grid-cols-1 sm:grid-cols-2` — 4 cards fills perfectly (2×2)

## Visual Design

- **Canvas background:** `--color-board` (deep navy #1D3557)
- **Course surface:** `--color-board-surface` (medium blue #264573)
- **Walls:** Lighter blue/white stroke
- **Sand:** Warm tan/brown zone
- **Water:** Animated subtle blue with wave effect
- **Portals:** Glowing rings (paired colors)
- **Moving walls:** Pulsing/highlighted
- **Hole:** Dark circle with inner shadow
- **Ball:** Player's selected color from color system
- **Background (page):** Warm cream (`--color-background`)

## Page Layout

```
┌─────────────────────────────┐
│ [Settings] [Bell] Hole 2/3  │  ← header bar
│         Stroke 3/6          │
├─────────────────────────────┤
│                             │
│      [Canvas - Course]      │  ← 400:700 aspect, scales to fill
│                             │
├─────────────────────────────┤
│  TurnIndicator  [Forfeit]   │  ← footer bar
└─────────────────────────────┘
```

- StrokeCounter overlaid on canvas with `pointer-events-none`
- Canvas has `touch-action: none`
- Game container has `overscroll-behavior: none`

## Sounds

New audio files in `/public/sounds/`:
- `shot.mp3` — ball struck
- `bounce.mp3` — wall hit
- `sink.mp3` — ball drops in hole
- `splash.mp3` — ball hits water

## Notifications

- Fire on hole-level turn change (when `current_turn` flips to you), NOT per-stroke
- Title: "[Opponent] finished Hole [N] — your turn!"
- Uses existing `useNotifications()` hook with extended GameType

## Accepted Trade-offs

- Non-active player sees only stroke count (no replay/ghost trail) — v1 scope
- No Realtime subscription for turn-change — polling latency acceptable for casual game
- No AFK timeout — matches existing game behavior
- Canvas is not accessible to screen readers — acceptable for known-user game
- No spectator mode

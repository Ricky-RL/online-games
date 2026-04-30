# Jenga Skill-Based Mechanics Redesign

## Summary

Redesign the Jenga game to shift from ~50/50 skill/luck to ~70-80% skill-weighted outcomes. Two new skill axes: a steady-pull drag mechanic (execution skill) and cascading risk consequences (strategic planning). Includes a "How to Play" tooltip.

## Goals

- Better player wins ~70-80% of the time (up from ~50%)
- Two axes of skill: physical execution (drag accuracy) + strategic planning (lookahead)
- Maintain tension and upset potential (not fully deterministic)
- Works on both desktop and mobile
- Clear onboarding via tooltip

---

## 1. Steady-Pull Drag Mechanic

### Concept

When a player selects a block, a guide path appears showing the ideal extraction trajectory. The player press-and-holds, then drags along the path to pull the block out. Accuracy determines how much the topple risk is reduced.

### Path Generation

Each block gets a unique path based on position. Paths are defined in screen-space pixel coordinates relative to the block's center in the isometric render:

- **Wide-row blocks (row % 2 === 0):** path extends horizontally (left/right in screen space)
  - Col 0: straight left with slight downward curve (away from tower center)
  - Col 1: straight left or right (randomly assigned at game start for variety)
  - Col 2: straight right with slight downward curve (away from tower center)
- **Narrow-row blocks (row % 2 === 1):** path extends vertically in screen space (toward/away from viewer in isometric perspective)
  - Col 0: path curves slightly left
  - Col 1: straight out toward viewer
  - Col 2: path curves slightly right
- **Path length scales with row depth:**
  - Bottom third of tower (rows 0-5): 120px path length
  - Middle third (rows 6-11): 90px path length
  - Top third (rows 12+): 60px path length

Paths are represented as arrays of `Point` objects (`{x: number, y: number}`) sampled at ~2px intervals along the curve. Path rendered as a dotted/dashed line with a circular start indicator.

### Accuracy Measurement

The `measureDragDeviation(idealPath: Point[], playerTrace: Point[]): number` function is a pure, unit-testable function that returns a deviation score from 0.0 (perfect) to 1.0 (terrible):

1. For each point in `playerTrace`, find the nearest point on `idealPath`
2. Compute perpendicular distance from the ideal path at that sample
3. Normalize each distance by a "tolerance zone" width (20px on desktop, 28px on mobile to account for finger size)
4. Average all normalized distances, clamped to [0, 1]

| Deviation Score | Quality | Risk Modifier |
|-----------------|---------|---------------|
| 0.0 - 0.05     | Perfect | base × 0.15 (floor 5%) |
| 0.05 - 0.20    | Good    | linear scale: base × 0.15 to base × 0.60 |
| 0.20 - 0.50    | Sloppy  | linear scale: base × 0.60 to base × 1.0 |
| 0.50 - 1.0     | Failed  | linear scale: base × 1.0 to base × 1.3 (cap 95%) |

Note: Perfect modifier is 0.15x (not 0.25x from original draft) based on balance modeling — this stronger reward for precision is needed to achieve the 70-80% skill-weighted outcome target.

### Early Release Handling

If the player releases before reaching the end zone (defined as the final 10% of path length):

```
pathCompletionRatio = distanceTraveled / totalPathLength
finalDeviation = measuredDeviation * pathCompletionRatio + 0.7 * (1 - pathCompletionRatio)
```

The untraced portion counts as 0.7 deviation (sloppy). This means:
- Release at 90% with perfect trace so far: `0.0 * 0.9 + 0.7 * 0.1 = 0.07` (still "Good")
- Release at 50% with perfect trace: `0.0 * 0.5 + 0.7 * 0.5 = 0.35` (Sloppy)
- Release at 20%: `0.0 * 0.2 + 0.7 * 0.8 = 0.56` (Failed)

This is forgiving for near-complete pulls but punishes bailing early. Mobile-friendly since an accidental lift at 90% barely hurts.

### Drag Timeout

A 15-second timer starts when the drag begins (finger/mouse down on the block). If not completed:
- At 12 seconds: visual warning (path flashes, countdown appears)
- At 15 seconds: drag auto-completes with deviation = 0.8 (Failed territory)

This prevents stalling and handles connection drops gracefully.

### Input Handling

- **Desktop:** click-and-hold, drag along path, release at end
- **Mobile:** touch-and-hold, drag along path, release at end
- **Haptic feedback (mobile):** subtle vibration pulse when deviating significantly from path (`navigator.vibrate(10)` when deviation exceeds 0.3 at any sample point)

### Visual Feedback

- Path lights up green/yellow/red during drag based on current deviation
- Small real-time deviation indicator shown during drag
- Final accuracy grade shown briefly after pull completes (A/B/C/F with color)

### Practice Mode

On a player's first-ever game (tracked in localStorage), the first pull includes a "Practice Pull" overlay:
- The path appears with a "Trace this path!" instruction
- The pull still counts (not a freebie), but the UI is more instructive
- After the first pull, a brief "Got it! Good luck." message appears

---

## 2. Cascading Risk Consequences

### Concept

Pulling a block actively destabilizes neighboring blocks, changing their displayed risk in real-time. This creates trap-setting and multi-move planning.

### Cascade Rules

When a block is pulled from position (row, col):

- **Same-row neighbors (left/right):** +15% risk per adjacent gap (replaces the existing +10% gap bonus in `calculateBlockRisk`)
- **Row above:** blocks directly above gain +10% risk (less support)
- **Row below:** blocks below gain +5% risk (weight shift)

These cascade effects are cumulative across multiple pulls and persist for the rest of the game.

### Data Model

Cascade risk is stored as a parallel 2D array in `JengaGameState`:

```typescript
interface JengaGameState {
  tower: JengaBlock[][]
  wobble_score: number
  move_history: JengaMove[]
  cascade_risks: number[][]  // NEW: per-block accumulated cascade bonus
}
```

- `cascade_risks[row][col]` stores the total cascade bonus accumulated on that block (initially 0 for all)
- When a block is pulled, neighboring `cascade_risks` entries are incremented per the rules above
- A block's total risk = `calculateBasePositionRisk(row, col) + cascade_risks[row][col]`

**Backwards compatibility:** For existing games where `cascade_risks` is undefined/null, default to an all-zeros array matching tower dimensions. No migration needed — old games play with the old rules, new games get cascade from the start.

**Why stored (not recomputed):** Storing the values avoids O(moves × blocks) recomputation on every render and makes the cascade state immediately readable for UI display without iterating history.

### Threshold Interaction

The minimum risk threshold check uses the **full displayed risk** (base + cascade). This means cascade effects can push blocks above the threshold, making them playable when they previously weren't. It also means a strategic player can cascade an opponent's options to be just barely above threshold — forcing them to pull dangerous blocks.

**Fallback rule (updated):** If no blocks meet the minimum threshold, all blocks become playable (unchanged). However, the cascade risk still applies to their topple calculation. The fallback only bypasses the selection restriction, not the danger.

### Visual Feedback

- After each pull, affected blocks briefly flash/pulse to show risk change (200ms yellow highlight, fade to new risk color)
- Risk percentages and colors update in real-time
- Players can see consequences before choosing their next block

### Strategic Implications

- **Trap setting:** pull a block that makes remaining blocks extremely risky for opponent
- **Safe corridor:** pull blocks that keep your future options open
- **Sacrifice play:** take a harder pull now to leave yourself an easy path next turn
- **Lookahead advantage:** players thinking 2-3 moves ahead gain real edge

### First-Mover Consideration

Player 1 gets the first trap-setting opportunity. This is mitigated by:
- Player 2 sees the cascade result before choosing, so they can adapt
- The minimum risk threshold escalation means early-game traps have limited impact (thresholds are low, so "pushing a block to 25%" doesn't matter when the threshold is 10%)
- Late-game is where cascading matters most, and by then both players have had equal cascade opportunities

No explicit handicap is needed, but this should be monitored post-launch.

---

## 3. Revised Topple Formula

### Current (luck-heavy)

```
effectiveRisk = min(95, blockRisk + wobble_score)
toppled = Math.random() * 100 < effectiveRisk
```

### New (skill-weighted)

```
baseRisk = calculateBlockRisk(state, row, col)  // position risk + cascade_risks[row][col]
dragDeviation = measureDragDeviation(path, playerTrace)  // 0.0 (perfect) to 1.0 (terrible)

// Deviation maps to a risk multiplier: perfect = 0.15x, terrible = 1.3x
skillModifier = 0.15 + (dragDeviation * 1.15)  // range: 0.15 to 1.3
effectiveRisk = min(95, max(5, baseRisk * skillModifier + wobble_score * 0.3))
toppled = Math.random() * 100 < effectiveRisk
```

### Key Changes

- **Variable named `dragDeviation`** (not `dragAccuracy`) — 0 = perfect trace, 1 = terrible. No semantic confusion.
- **Wobble contribution reduced to 0.3x** — still creates late-game pressure but doesn't overwhelm skill. A wobble of 50 adds +15% effective risk rather than +50%.
- **Skill modifier range widened (0.15 to 1.3)** — greater reward for precision, greater punishment for sloppiness. This amplifies the skill gap.
- **Floor of 5%:** even perfect pulls have tension
- **Cap of 95%:** even worst scenarios allow survival

### Wobble Decay

The existing wobble decay mechanic (safe pulls reduce wobble by 3) is preserved unchanged. With the reduced wobble contribution (0.3x), wobble remains relevant as a tiebreaker in close games but doesn't dominate outcomes.

### Balance Modeling

Approximate survival rates per pull for a "skilled" vs "unskilled" player on a 30% base-risk block with wobble at 20:

- **Skilled** (deviation 0.05): effectiveRisk = 30 × 0.21 + 20 × 0.3 = 6.3 + 6 = 12.3% → 87.7% survival
- **Unskilled** (deviation 0.40): effectiveRisk = 30 × 0.61 + 20 × 0.3 = 18.3 + 6 = 24.3% → 75.7% survival

Over 12 pulls each in a typical game:
- Skilled survives all 12: 0.877^12 ≈ 20.5%
- Unskilled survives all 12: 0.757^12 ≈ 3.5%

The skilled player is ~6x more likely to survive a full game. Combined with strategic block selection (cascade traps), the better player wins approximately 70-80% of games. A Monte Carlo simulation should be run during implementation to validate and tune the 0.15/1.15/0.3 constants before shipping.

### Scoring

Points equal the **displayed risk** of the block (base position risk + cascade bonus). This is what the player sees when selecting the block and represents the actual danger they chose to face. Higher-cascade blocks are worth more points because they genuinely are riskier to attempt.

---

## 4. How to Play Tooltip

### Implementation

- `?` icon button in top-right corner of game view
- Click/tap shows modal or popover with rules
- Auto-shown on first game (keyed off player's game count from match history, not localStorage — works across devices)

### Content

> **How to Play Jenga**
>
> **Goal:** Don't topple the tower! The player who causes the tower to fall loses.
>
> **Taking your turn:**
> 1. Select a block — blocks glow with their risk level (green = safe, red = dangerous). You can only pull blocks above the minimum risk threshold (shown at the top).
> 2. Drag to pull — a guide path appears. Trace it carefully! The closer you follow the path, the safer your pull. A perfect drag can reduce your topple chance by up to 85%.
> 3. Watch the cascade — pulling a block destabilizes its neighbors. Plan ahead to leave yourself safe options and set traps for your opponent.
>
> **Scoring:** You earn points equal to the risk % of each block you successfully pull. High risk = high reward!
>
> **Tips:**
> - Lower blocks and edge blocks are riskier
> - Pulling a block increases risk on blocks above and beside it
> - The minimum risk threshold rises each turn — you can't play it safe forever
> - Steady hands matter: a sloppy pull on a safe block can still topple the tower
> - You have 15 seconds to complete each drag

---

## 5. Files to Modify

| File | Changes |
|------|---------|
| `src/lib/jenga-logic.ts` | New cascade risk calculation, revised topple formula, path generation, `measureDragDeviation()` pure function |
| `src/lib/jenga-logic.test.ts` | Tests for cascade, new topple formula, path generation, drag deviation measurement |
| `src/hooks/useJengaGame.ts` | Drag state management, pull-in-progress guard, drag timeout, updated pull flow |
| `src/components/jenga/JengaTower.tsx` | Drag interaction, path rendering, cascade flash animation |
| `src/components/jenga/JengaDragPath.tsx` | New component: renders guide path and accuracy feedback |
| `src/components/jenga/JengaHowToPlay.tsx` | New component: tooltip/modal with rules |
| `src/app/jenga/[gameId]/page.tsx` | Integrate drag mechanic, add tooltip button, practice mode |

---

## 6. Async Play Compatibility

### Drag is Local-Only

The drag mechanic happens entirely on the active player's device. Only the result is stored and synced.

### Pull-In-Progress Guard

When a drag begins, the hook sets `pullingInProgress = true` locally. While true:
- Polling continues but **does not update `current_turn`** from server responses
- If a poll response shows the game has ended (opponent won/toppled on their turn before our pull registered), the drag is cancelled and the game-over state is shown
- When the drag completes and the write succeeds, `pullingInProgress` is cleared

This prevents the race condition where a poll update mid-drag could confuse the turn state.

### Server-Side Validation

The existing `.eq('current_turn', myPlayerNumber)` optimistic concurrency check remains. If two clients somehow both attempt a pull (extreme edge case), the second write fails and the client re-fetches.

### Updated JengaMove Type

```typescript
interface JengaMove {
  player: 1 | 2
  row: number
  col: number
  risk: number           // displayed risk (base + cascade) at time of selection
  dragDeviation: number  // 0.0 (perfect) to 1.0 (terrible)
  effectiveRisk: number  // final risk after skill modifier + wobble
  wobble_after: number
  toppled: boolean
}
```

**Backwards compatibility:** `dragDeviation` and `effectiveRisk` are optional fields (`dragDeviation?: number`). Old moves without them are treated as having deviation 0.5 (average) for any replay/scoring purposes. The `getPlayerScores` function uses `move.risk` (unchanged field) for scoring, so old games score correctly.

### Updated JengaGameState

```typescript
interface JengaGameState {
  tower: JengaBlock[][]
  wobble_score: number
  move_history: JengaMove[]
  cascade_risks?: number[][]  // undefined in old games → treated as all-zeros
}
```

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

Each block gets a unique path based on position:

- **Center blocks (col 1):** straight horizontal pull outward
- **Edge blocks (col 0):** slight outward curve away from center
- **Edge blocks (col 2):** slight outward curve the other direction
- **Lower rows:** longer pull distance (more weight above = more care needed)
- **Upper rows:** shorter pull distance

Path rendered as a dotted/dashed line with a start indicator.

### Accuracy Scoring

Average deviation from ideal path measured in pixels, normalized to 0-1 scale:

| Accuracy | Deviation | Risk Modifier |
|----------|-----------|---------------|
| Perfect  | < 5%      | base × 0.25 (floor 5%) |
| Good     | 5-20%     | linear scale: base × 0.25 to base × 0.75 |
| Sloppy   | 20-50%    | linear scale: base × 0.75 to base × 1.0 |
| Failed   | > 50%     | base × 1.2 (cap 95%) |

### Input Handling

- **Desktop:** click-and-hold, drag along path, release at end
- **Mobile:** touch-and-hold, drag along path, release at end
- **Early release:** scored on completed portion with a penalty applied

### Visual Feedback

- Path lights up green/yellow/red during drag based on current accuracy
- Small real-time accuracy % indicator shown during drag
- Final accuracy shown briefly after pull completes

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

### Changes from Current System

Currently gaps only affect the pulled block's own risk. Now pulling a block actively changes the displayed risk of neighboring blocks. This is visible and persistent.

### Visual Feedback

- After each pull, affected blocks briefly flash/pulse to show risk change
- Risk colors update in real-time
- Players can see consequences before choosing their next block

### Strategic Implications

- **Trap setting:** pull a block that makes remaining blocks extremely risky for opponent
- **Safe corridor:** pull blocks that keep your future options open
- **Sacrifice play:** take a harder pull now to leave yourself an easy path next turn
- **Lookahead advantage:** players thinking 2-3 moves ahead gain real edge

---

## 3. Revised Topple Formula

### Current (luck-heavy)

```
effectiveRisk = min(95, blockRisk + wobble_score)
toppled = Math.random() * 100 < effectiveRisk
```

### New (skill-weighted)

```
baseRisk = calculateBlockRisk(state, row, col)  // includes cascade effects
dragAccuracy = measureDragAccuracy(path, playerTrace)  // 0.0 to 1.0

skillModifier = 0.25 + (dragAccuracy * 0.95)  // range: 0.25 to 1.2
effectiveRisk = min(95, max(5, baseRisk * skillModifier + wobble_score * 0.5))
toppled = Math.random() * 100 < effectiveRisk
```

### Key Changes

- **Wobble contribution halved:** still matters but doesn't dominate late game
- **Skill modifier dominates:** perfect pull cuts risk by 75%; terrible pull worsens it by 20%
- **Floor of 5%:** even perfect pulls have some tension
- **Cap of 95%:** even worst scenarios allow survival

### Scoring

Points still equal the base risk of the block (unchanged). Rewarding risky block choice, not just execution.

---

## 4. How to Play Tooltip

### Implementation

- `?` icon button in top-right corner of game view
- Click/tap shows modal or popover with rules
- Auto-shown on first game (localStorage flag)

### Content

> **How to Play Jenga**
>
> **Goal:** Don't topple the tower! The player who causes the tower to fall loses.
>
> **Taking your turn:**
> 1. Select a block — blocks glow with their risk level (green = safe, red = dangerous). You can only pull blocks above the minimum risk threshold (shown at the top).
> 2. Drag to pull — a guide path appears. Trace it carefully! The closer you follow the path, the safer your pull. A perfect drag can reduce your topple chance by up to 75%.
> 3. Watch the cascade — pulling a block destabilizes its neighbors. Plan ahead to leave yourself safe options and set traps for your opponent.
>
> **Scoring:** You earn points equal to the risk % of each block you successfully pull. High risk = high reward!
>
> **Tips:**
> - Lower blocks and edge blocks are riskier
> - Pulling a block increases risk on blocks above and beside it
> - The minimum risk threshold rises each turn — you can't play it safe forever
> - Steady hands matter: a sloppy pull on a safe block can still topple the tower

---

## 5. Files to Modify

| File | Changes |
|------|---------|
| `src/lib/jenga-logic.ts` | New cascade risk calculation, revised topple formula, path generation |
| `src/lib/jenga-logic.test.ts` | Tests for cascade, new topple formula, path generation |
| `src/hooks/useJengaGame.ts` | Drag state management, accuracy measurement, updated pull flow |
| `src/components/jenga/JengaTower.tsx` | Drag interaction, path rendering, cascade flash animation |
| `src/components/jenga/JengaDragPath.tsx` | New component: renders guide path and accuracy feedback |
| `src/components/jenga/JengaHowToPlay.tsx` | New component: tooltip/modal with rules |
| `src/app/jenga/[gameId]/page.tsx` | Integrate drag mechanic, add tooltip button |

---

## 6. Async Play Compatibility

The drag mechanic is local-only (happens on the active player's device). Only the result (block position + accuracy score) is stored in move_history and synced to opponent. No changes to the polling/sync model needed beyond adding an `accuracy` field to `JengaMove`.

Updated `JengaMove`:
```typescript
{
  player: 1 | 2
  row: number
  col: number
  risk: number        // base risk (pre-skill-modifier)
  accuracy: number    // 0.0 (perfect) to 1.0 (terrible)
  effectiveRisk: number  // final risk after skill modifier
  wobble_after: number
  toppled: boolean
}
```

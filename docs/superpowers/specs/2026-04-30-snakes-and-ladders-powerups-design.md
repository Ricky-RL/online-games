# Snakes and Ladders: Powerups

## Overview

Add chaotic, party-style powerups to the existing Snakes and Ladders game. Powerups are placed on random tiles, visible to both players, and trigger immediately on landing. When triggered, they respawn on a different tile after 3 turns. A turn replay animation plays when a player returns to show what their opponent did.

## Powerup Types

| Powerup | Icon | Effect | Resolution Details |
|---------|------|--------|-------------------|
| Double Dice | 🎲 | Roll value × 2 on NEXT roll | Deferred — stored until next turn, applied before bounce-back |
| Shield | 🛡️ | Ignore next snake landing | Deferred — persists until consumed by a snake |
| Reverse | ⏪ | Opponent moves back 5-10 spaces (random) | Immediate — clamped at tile 1, no secondary effects |
| Teleport | ✨ | Jump forward 1-15 tiles (random) | Immediate — clamped at 100, no bounce-back, snake/ladder checks apply to new position |
| Freeze | 🧊 | Opponent skips their next turn | Immediate — consumed when opponent's turn is skipped |
| Swap | 🔄 | Switch positions with opponent | Immediate — final position, no snake/ladder/powerup checks |
| Earthquake | 🌋 | All snakes + ladders re-randomize | Immediate — uses existing generation constraints, re-validates powerup positions |
| Magnet | 🧲 | Move to nearest ladder bottom ahead | Immediate — if no ladder ahead, move forward 5. Ladder climb applies. |

## Game State

Extend `SnakesAndLaddersState` in `src/lib/types.ts`:

```typescript
export type PowerupType =
  | 'double_dice'
  | 'shield'
  | 'reverse'
  | 'teleport'
  | 'freeze'
  | 'swap'
  | 'earthquake'
  | 'magnet'

export interface SnakesAndLaddersState {
  players: { 1: number; 2: number }
  snakes: Record<number, number>
  ladders: Record<number, number>
  lastRoll: { player: 1 | 2; value: number } | null
  moveNumber: number
  powerups: Record<number, PowerupType>
  powerupRespawns: { turnsLeft: number; type: PowerupType }[]
  lastMoveEvents: MoveEvent[]
  skipNextTurn: { player: 1 | 2 } | null
  shielded: { player: 1 | 2 } | null
  doubleDice: { player: 1 | 2 } | null
}

export interface MoveEvent {
  player: 1 | 2
  roll: number
  from: number
  to: number
  powerups: { tile: number; type: PowerupType; effect: string }[]
  snakeSlide: { from: number; to: number } | null
  ladderClimb: { from: number; to: number } | null
  shieldUsed: boolean
  skipped: boolean
}
```

`lastMoveEvents` stores ALL moves since the opponent last saw the board (handles roll-6 multi-move sequences). `moveNumber` is a monotonic counter incremented each turn.

## Turn Processing Order

1. Decrement all `powerupRespawns` timers; spawn new powerups where timer hits 0
2. Check if current player has `skipNextTurn` — if so, consume it, record a `MoveEvent` with `skipped: true`, flip turn, done
3. Roll dice (1-6)
4. If `doubleDice` is active for this player, multiply roll by 2 and consume it
5. Calculate new position (current + roll)
6. Apply bounce-back if > 100 (200 - position)
7. Check if landing on a powerup tile — if so, trigger it:
   - Remove powerup from `powerups` map
   - Add to `powerupRespawns` with `turnsLeft: 3`
   - Apply immediate effects (Reverse, Teleport, Freeze, Swap, Earthquake, Magnet)
   - Store deferred effects (Shield → `shielded`, Double Dice → `doubleDice`)
   - Powerup chaining: if Teleport/Magnet moves player onto another powerup, trigger it too (max depth 3)
   - Chaining only applies within this step — snake/ladder resolution does NOT re-trigger powerups
8. Check snake head at player's FINAL position (after all powerup effects):
   - If `shielded` is active for this player, consume shield, stay in place
   - Otherwise slide to snake tail
9. Check ladder bottom at player's FINAL position — if on one, climb to top
10. Check win condition (position === 100)
11. Increment `moveNumber`, append `MoveEvent` to `lastMoveEvents`
12. Update `current_turn` (same player if rolled 6 and no winner, otherwise flip)
13. If turn passes to other player, clear `lastMoveEvents` only when that player acknowledges (see Replay)

Note: Steps 7-9 operate on the player's position AFTER all powerup effects resolve. Exception: Swap is terminal (no snake/ladder/powerup checks after swap).

## Powerup Spawning

### Initial Placement
- 7 powerups placed at game creation
- Valid tiles: not 1, not 100, not a snake head, not a ladder bottom, not another powerup
- Type selected uniformly at random from the 8 types

### Respawn
- Timers decrement at the START of each turn (step 1), including skipped turns
- When a timer hits 0, a new powerup spawns on a random valid empty tile with a random type
- The respawned powerup does not need to be the same type as the original

### After Earthquake
- After snakes/ladders re-randomize, check all existing powerup tiles
- Remove any powerup now sitting on a new snake head or ladder bottom
- Those removed powerups enter `powerupRespawns` with `turnsLeft: 2` (faster respawn since they were removed involuntarily)

## Turn Replay Animation

When a player returns and `moveNumber` has advanced since they last saw the board, play back all events in `lastMoveEvents`:

For each `MoveEvent` in sequence:
1. **Skipped turn** — If `skipped: true`, show "Turn skipped! (Frozen)" text (1s), continue to next event
2. **Dice result** — Show the rolled number (0.5s)
3. **Piece movement** — Animate piece hopping square by square to new position (1s)
4. **Powerup toast(s)** — For each powerup in `powerups[]`, show centered popup with icon, name, and one-line effect description (1.5s each)
5. **Snake/Ladder** — If `snakeSlide` or `ladderClimb` is non-null, animate the slide/climb (0.8s)
6. **Skip button** — Visible in corner throughout, clicking skips to final board state

Total replay: ~3-5 seconds per move. Multiple moves (roll-6 chains) play sequentially.

Detection: Compare `moveNumber` from polled state vs last-seen `moveNumber`. If higher, replay is needed.

Acknowledgment: After replay completes (or skip pressed), client writes its seen `moveNumber` — `lastMoveEvents` clears on the next turn by the replaying player.

## Powerup Toast UI

Appears when any powerup is triggered (during live play or replay):

- Centered overlay, semi-transparent backdrop
- Powerup emoji icon (large)
- Powerup name in bold
- One-line description of what happened (e.g., "Your opponent moves back 7 spaces!")
- Auto-dismisses after 2 seconds or on tap/click
- Framer Motion fade-in/fade-out animation

## Board Rendering Changes

- Powerup tiles show their emoji icon in the tile (replacing or overlaying the tile number)
- Subtle background tint per powerup category (warm colors for offensive, cool for defensive)
- When a powerup respawns on a tile, use a scale-in "pop" animation (Framer Motion)
- Powerup tiles should be visually distinct from snake heads and ladder bottoms

## Edge Cases

- **Powerup + Snake on same tile:** Not possible — powerups don't spawn on snake heads/ladder bottoms
- **Teleport/Magnet lands on another powerup:** Chain triggers (max depth 3). All triggered powerups recorded in `MoveEvent.powerups[]`
- **Swap puts you on a snake/ladder/powerup:** No additional effects — swap is terminal
- **Earthquake while on a snake/ladder tile:** Player stays on their current tile number; new snakes/ladders may now be under them but don't trigger retroactively. Powerups invalidated by new layout respawn faster (2 turns)
- **Shield + Roll 6:** Shield only blocks snakes, roll-6 extra turn still applies
- **Freeze + Roll 6:** Frozen player loses their turn; the 6-bonus was for the player who triggered Freeze
- **Freeze stacking:** If opponent already has `skipNextTurn`, a second Freeze is wasted (state can only hold one)
- **Double Dice + Roll 6:** Movement is doubled (max 12), extra turn still applies
- **Bounce-back lands on powerup:** Powerup triggers normally after bounce-back
- **Reverse below tile 1:** Clamped to tile 1. No secondary snake/ladder/powerup effects on reversed player
- **Reverse onto snake/ladder/powerup:** No secondary effects — Reverse is final position for the opponent
- **Teleport/Magnet to tile 100:** Player wins
- **Magnet lands on ladder bottom:** Player climbs the ladder (step 9 applies after powerup resolution)

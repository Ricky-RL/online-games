# Snakes and Ladders: Powerups

## Overview

Add chaotic, party-style powerups to the existing Snakes and Ladders game. Powerups are placed on random tiles, visible to both players, and trigger immediately on landing. When triggered, they respawn on a different tile after 3 turns. A turn replay animation plays when a player returns to show what their opponent did.

## Powerup Types

| Powerup | Icon | Effect | Resolution Details |
|---------|------|--------|-------------------|
| Double Dice | 🎲 | Roll value × 2 | Applied before bounce-back calculation |
| Shield | 🛡️ | Ignore next snake landing | Persists in state until consumed by a snake |
| Reverse | ⏪ | Opponent moves back 5-10 spaces (random) | Clamped at tile 1 minimum |
| Teleport | ✨ | Jump forward 1-15 tiles (random) | Clamped at 100, no bounce-back applied |
| Freeze | 🧊 | Opponent skips their next turn | Consumed when opponent's turn is skipped |
| Swap | 🔄 | Switch positions with opponent | Immediate position swap |
| Earthquake | 🌋 | All snakes + ladders re-randomize | Uses existing generation constraints |
| Magnet | 🧲 | Move to nearest ladder bottom ahead | If no ladder ahead, move forward 5 |

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
  powerups: Record<number, PowerupType>
  powerupRespawns: { tile: number; turnsLeft: number }[]
  lastPowerup: { player: 1 | 2; tile: number; type: PowerupType; effect: string } | null
  skipNextTurn: { player: 1 | 2 } | null
  shielded: { player: 1 | 2 } | null
  doubleDice: { player: 1 | 2 } | null
}
```

## Turn Processing Order

1. Check if current player has `skipNextTurn` — if so, consume it, flip turn, done
2. Roll dice (1-6)
3. If `doubleDice` is active for this player, multiply roll by 2 and consume it
4. Calculate new position (current + roll)
5. Apply bounce-back if > 100 (200 - position)
6. Check if landing on a powerup tile — if so, trigger it:
   - Remove powerup from `powerups` map
   - Add to `powerupRespawns` with `turnsLeft: 3`
   - Set `lastPowerup` with name and effect description
   - Apply immediate effects (Reverse, Teleport, Freeze, Swap, Earthquake, Magnet)
   - Store deferred effects (Shield → `shielded`, Double Dice → `doubleDice`)
7. Check snake head — if landing on one:
   - If `shielded` is active for this player, consume shield, stay in place
   - Otherwise slide to snake tail
8. Check ladder bottom — if landing on one, climb to top
9. Check win condition (position === 100)
10. Decrement all `powerupRespawns` timers; spawn new powerups where timer hits 0
11. Update `current_turn` (same player if rolled 6 and no winner, otherwise flip)

## Powerup Spawning

### Initial Placement
- 7 powerups placed at game creation
- Valid tiles: not 1, not 100, not a snake head, not a ladder bottom, not another powerup
- Type selected uniformly at random from the 8 types

### Respawn
- When triggered, powerup is removed and added to `powerupRespawns` with `turnsLeft: 3`
- Each turn (regardless of which player), all respawn timers decrement by 1
- When a timer hits 0, a new powerup spawns on a random valid empty tile with a random type
- The respawned powerup does not need to be the same type or location as the original

## Turn Replay Animation

When a player loads the game and the opponent has taken a turn since they last saw the board:

1. **Dice result** — Show the rolled number (0.5s)
2. **Piece movement** — Animate piece hopping square by square to new position (1s)
3. **Powerup toast** — If powerup triggered, show centered popup with icon, name, and one-line effect description (1.5s pause)
4. **Snake/Ladder** — If hit, animate the slide/climb (0.8s)
5. **Skip button** — Visible in corner throughout, clicking skips to final board state

Total replay duration: ~3-4 seconds.

Detection: Compare `lastRoll` from polled state vs what was last seen. If different, the opponent took a turn — play it back before enabling the roll button.

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

- **Powerup + Snake on same tile:** Not possible — powerups don't spawn on snake heads
- **Teleport/Magnet lands on another powerup:** That second powerup also triggers (chain, max depth 3 to prevent infinite loops)
- **Swap puts you on a snake/ladder:** No additional movement — swap is final position
- **Earthquake while on a snake/ladder tile:** Player stays on their current tile number; new snakes/ladders may now be under them (resolved on their next move, not retroactively)
- **Shield + Roll 6:** Shield only blocks snakes, roll-6 extra turn still applies
- **Freeze + Roll 6:** Frozen player loses their turn; the 6-bonus was for the player who triggered Freeze
- **Double Dice + Roll 6:** Movement is doubled (max 12), extra turn still applies
- **Bounce-back lands on powerup:** Powerup triggers normally after bounce-back
- **Reverse below tile 1:** Clamped to tile 1
- **Teleport/Magnet to tile 100:** Player wins

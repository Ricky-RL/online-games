# Changelog

All notable changes to this project will be documented in this file.

## [0.1.1.0] - 2026-04-30

### Changed
- Jenga drag interaction uses delta-based coordinates for smoother pull feedback
- Drag events batched with requestAnimationFrame to reduce layout thrashing
- Hold-to-drag threshold reduced from 150ms to 50ms for more responsive feel
- onDragStart now provides screen position for overlay positioning

### Added
- Comprehensive test coverage for Jenga scoring mechanics (getEarlyGameMultiplier, getMovePoints, getPlayerScores)
- Tests for minimum risk threshold escalation with growth, oscillation, capping, and floor logic
- Tests for wobble mechanics (increase, cap at 100, floor at 0)
- Tests for top row fill order (center, left, right, new row creation)
- Tests for cascade_risks array expansion when tower grows

## [0.1.0.0] - 2026-04-30

### Added
- Powerup system for Snakes and Ladders with 8 powerup types: Double Dice, Shield, Reverse, Teleport, Freeze, Swap, Earthquake, and Magnet
- Powerups spawn on the board at game start and respawn after 3 turns when collected
- Turn replay animation shows opponent moves with dice results and powerup effects
- PowerupToast component displays animated notifications when powerups are triggered
- Board tiles visually display active powerups with animated icons
- Shield protects from the next snake, Double Dice doubles your next roll
- Freeze skips the opponent's next turn, Swap exchanges positions
- Earthquake reshuffles all snakes and ladders, Magnet pulls to nearest ladder
- Teleport jumps forward, Reverse sends opponent backward
- Skip replay button lets players bypass the turn replay animation
- Powerup chaining: Teleport and Magnet can trigger additional powerups on landing

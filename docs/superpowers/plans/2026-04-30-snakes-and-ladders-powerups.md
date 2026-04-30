# Snakes and Ladders Powerups Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 8 chaotic powerup types to Snakes and Ladders with visible board tiles, turn replay animation, and toast notifications.

**Architecture:** Extend existing `SnakesAndLaddersState` with powerup fields. Pure game logic stays in `snakes-and-ladders-logic.ts`, powerup processing integrated into `makeMove`. New `PowerupToast` component and replay system in the hook.

**Tech Stack:** TypeScript, React, Framer Motion, Vitest, Supabase (existing stack)

---

### Task 1: Extend Types

**Files:**
- Modify: `src/lib/types.ts:101-107`

- [ ] **Step 1: Add PowerupType and MoveEvent types, extend SnakesAndLaddersState**

Replace lines 101-107 in `src/lib/types.ts` with:

```typescript
// Snakes and Ladders types
export type PowerupType =
  | 'double_dice'
  | 'shield'
  | 'reverse'
  | 'teleport'
  | 'freeze'
  | 'swap'
  | 'earthquake'
  | 'magnet'

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
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: Type errors in existing files referencing `SnakesAndLaddersState` (expected — we'll fix those in subsequent tasks)

- [ ] **Step 3: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat(snakes): extend types with powerup fields and MoveEvent"
```

---

### Task 2: Powerup Logic - Board Generation and Spawning

**Files:**
- Modify: `src/lib/snakes-and-ladders-logic.ts`
- Modify: `src/lib/snakes-and-ladders-logic.test.ts`

- [ ] **Step 1: Write failing tests for powerup generation**

Add to `src/lib/snakes-and-ladders-logic.test.ts`:

```typescript
import { generateBoard, makeMove, checkWin, rollDice, getSquareEntity, getValidPowerupTile, spawnPowerups, POWERUP_TYPES } from './snakes-and-ladders-logic';
import type { SnakesAndLaddersState, PowerupType } from './types';

describe('spawnPowerups', () => {
  it('places 7 powerups on a fresh board', () => {
    const board = generateBoard();
    expect(Object.keys(board.powerups)).toHaveLength(7);
  });

  it('powerups are not placed on tile 1 or 100', () => {
    const board = generateBoard();
    expect(board.powerups[1]).toBeUndefined();
    expect(board.powerups[100]).toBeUndefined();
  });

  it('powerups are not placed on snake heads', () => {
    const board = generateBoard();
    for (const tile of Object.keys(board.powerups).map(Number)) {
      expect(board.snakes[tile]).toBeUndefined();
    }
  });

  it('powerups are not placed on ladder bottoms', () => {
    const board = generateBoard();
    for (const tile of Object.keys(board.powerups).map(Number)) {
      expect(board.ladders[tile]).toBeUndefined();
    }
  });

  it('each powerup type is from POWERUP_TYPES', () => {
    const board = generateBoard();
    for (const type of Object.values(board.powerups)) {
      expect(POWERUP_TYPES).toContain(type);
    }
  });
});

describe('getValidPowerupTile', () => {
  it('returns a tile not occupied by snakes, ladders, powerups, 1, or 100', () => {
    const board = generateBoard();
    const tile = getValidPowerupTile(board);
    expect(tile).toBeGreaterThanOrEqual(2);
    expect(tile).toBeLessThanOrEqual(99);
    expect(board.snakes[tile]).toBeUndefined();
    expect(board.ladders[tile]).toBeUndefined();
    expect(board.powerups[tile]).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/snakes-and-ladders-logic.test.ts 2>&1 | tail -20`
Expected: FAIL — `spawnPowerups` and `getValidPowerupTile` not exported

- [ ] **Step 3: Implement powerup spawning**

In `src/lib/snakes-and-ladders-logic.ts`, add after the existing imports:

```typescript
import type { Player, SnakesAndLaddersState, PowerupType } from './types';

export const POWERUP_TYPES: PowerupType[] = [
  'double_dice', 'shield', 'reverse', 'teleport',
  'freeze', 'swap', 'earthquake', 'magnet',
];

const INITIAL_POWERUP_COUNT = 7;
```

Add these functions before `generateBoard`:

```typescript
export function getValidPowerupTile(state: SnakesAndLaddersState): number {
  const occupied = new Set<number>([1, 100]);
  for (const head of Object.keys(state.snakes).map(Number)) occupied.add(head);
  for (const tail of Object.values(state.snakes)) occupied.add(tail as number);
  for (const bottom of Object.keys(state.ladders).map(Number)) occupied.add(bottom);
  for (const top of Object.values(state.ladders)) occupied.add(top as number);
  for (const tile of Object.keys(state.powerups).map(Number)) occupied.add(tile);

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const tile = randomInt(2, 99);
    if (!occupied.has(tile)) return tile;
  }
  return -1;
}

export function spawnPowerups(state: SnakesAndLaddersState, count: number): Record<number, PowerupType> {
  const powerups: Record<number, PowerupType> = { ...state.powerups };
  const tempState = { ...state, powerups };

  for (let i = 0; i < count; i++) {
    const tile = getValidPowerupTile(tempState);
    if (tile === -1) break;
    const type = POWERUP_TYPES[randomInt(0, POWERUP_TYPES.length - 1)];
    powerups[tile] = type;
    tempState.powerups = powerups;
  }

  return powerups;
}
```

Update `generateBoard` to include powerups:

```typescript
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

  const baseState: SnakesAndLaddersState = {
    players: { 1: 1, 2: 1 },
    snakes,
    ladders,
    lastRoll: null,
    moveNumber: 0,
    powerups: {},
    powerupRespawns: [],
    lastMoveEvents: [],
    skipNextTurn: null,
    shielded: null,
    doubleDice: null,
  };

  baseState.powerups = spawnPowerups(baseState, INITIAL_POWERUP_COUNT);
  return baseState;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/snakes-and-ladders-logic.test.ts 2>&1 | tail -20`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/snakes-and-ladders-logic.ts src/lib/snakes-and-ladders-logic.test.ts
git commit -m "feat(snakes): add powerup spawning to board generation"
```

---

### Task 3: Powerup Logic - makeMove with Powerup Processing

**Files:**
- Modify: `src/lib/snakes-and-ladders-logic.ts`
- Modify: `src/lib/snakes-and-ladders-logic.test.ts`

- [ ] **Step 1: Write failing tests for powerup-aware makeMove**

Add to test file:

```typescript
describe('makeMove with powerups', () => {
  const basePowerupState: SnakesAndLaddersState = {
    players: { 1: 1, 2: 1 },
    snakes: { 50: 10 },
    ladders: { 30: 60 },
    lastRoll: null,
    moveNumber: 0,
    powerups: {},
    powerupRespawns: [],
    lastMoveEvents: [],
    skipNextTurn: null,
    shielded: null,
    doubleDice: null,
  };

  it('triggers teleport powerup and moves player forward', () => {
    const state: SnakesAndLaddersState = {
      ...basePowerupState,
      players: { 1: 3, 2: 1 },
      powerups: { 5: 'teleport' },
    };
    // Player at 3, rolls 2, lands on 5 (teleport)
    // Teleport moves forward 1-15, so final position > 5
    const result = makeMove(state, 1, 2);
    expect(result.players[1]).toBeGreaterThan(5);
    expect(result.powerups[5]).toBeUndefined();
    expect(result.powerupRespawns.length).toBe(1);
    expect(result.powerupRespawns[0].turnsLeft).toBe(3);
  });

  it('triggers freeze powerup and sets skipNextTurn', () => {
    const state: SnakesAndLaddersState = {
      ...basePowerupState,
      players: { 1: 3, 2: 1 },
      powerups: { 5: 'freeze' },
    };
    const result = makeMove(state, 1, 2);
    expect(result.skipNextTurn).toEqual({ player: 2 });
    expect(result.powerups[5]).toBeUndefined();
  });

  it('triggers shield powerup and sets shielded', () => {
    const state: SnakesAndLaddersState = {
      ...basePowerupState,
      players: { 1: 3, 2: 1 },
      powerups: { 5: 'shield' },
    };
    const result = makeMove(state, 1, 2);
    expect(result.shielded).toEqual({ player: 1 });
    expect(result.powerups[5]).toBeUndefined();
  });

  it('triggers double_dice powerup and sets doubleDice', () => {
    const state: SnakesAndLaddersState = {
      ...basePowerupState,
      players: { 1: 3, 2: 1 },
      powerups: { 5: 'double_dice' },
    };
    const result = makeMove(state, 1, 2);
    expect(result.doubleDice).toEqual({ player: 1 });
    expect(result.powerups[5]).toBeUndefined();
  });

  it('applies doubleDice modifier when active', () => {
    const state: SnakesAndLaddersState = {
      ...basePowerupState,
      players: { 1: 10, 2: 1 },
      doubleDice: { player: 1 },
    };
    const result = makeMove(state, 1, 3);
    // Roll 3 doubled = 6, so 10 + 6 = 16
    expect(result.players[1]).toBe(16);
    expect(result.doubleDice).toBeNull();
  });

  it('triggers reverse powerup and moves opponent back', () => {
    const state: SnakesAndLaddersState = {
      ...basePowerupState,
      players: { 1: 3, 2: 40 },
      powerups: { 5: 'reverse' },
    };
    const result = makeMove(state, 1, 2);
    // Opponent moved back 5-10 from 40
    expect(result.players[2]).toBeGreaterThanOrEqual(30);
    expect(result.players[2]).toBeLessThanOrEqual(35);
  });

  it('reverse clamps opponent at tile 1', () => {
    const state: SnakesAndLaddersState = {
      ...basePowerupState,
      players: { 1: 3, 2: 3 },
      powerups: { 5: 'reverse' },
    };
    const result = makeMove(state, 1, 2);
    expect(result.players[2]).toBe(1);
  });

  it('triggers swap powerup and exchanges positions', () => {
    const state: SnakesAndLaddersState = {
      ...basePowerupState,
      players: { 1: 3, 2: 70 },
      powerups: { 5: 'swap' },
    };
    const result = makeMove(state, 1, 2);
    expect(result.players[1]).toBe(70);
    expect(result.players[2]).toBe(5);
  });

  it('triggers earthquake and re-randomizes snakes/ladders', () => {
    const state: SnakesAndLaddersState = {
      ...basePowerupState,
      players: { 1: 3, 2: 1 },
      powerups: { 5: 'earthquake' },
      snakes: { 50: 10, 80: 20 },
      ladders: { 30: 60, 15: 45 },
    };
    const result = makeMove(state, 1, 2);
    // Snakes and ladders should be different (re-randomized)
    // At minimum, the counts should be the same
    expect(Object.keys(result.snakes).length).toBe(8);
    expect(Object.keys(result.ladders).length).toBe(8);
  });

  it('triggers magnet and moves to nearest ladder bottom ahead', () => {
    const state: SnakesAndLaddersState = {
      ...basePowerupState,
      players: { 1: 3, 2: 1 },
      powerups: { 5: 'magnet' },
      ladders: { 30: 60 },
    };
    const result = makeMove(state, 1, 2);
    // Magnet sends to ladder bottom (30), then ladder climbs to 60
    expect(result.players[1]).toBe(60);
  });

  it('magnet with no ladder ahead moves forward 5', () => {
    const state: SnakesAndLaddersState = {
      ...basePowerupState,
      players: { 1: 93, 2: 1 },
      powerups: { 95: 'magnet' },
      ladders: { 30: 60 },
    };
    const result = makeMove(state, 1, 2);
    // No ladder ahead of 95, move forward 5 = 100 → win
    expect(result.players[1]).toBe(100);
  });

  it('shield blocks snake', () => {
    const state: SnakesAndLaddersState = {
      ...basePowerupState,
      players: { 1: 47, 2: 1 },
      snakes: { 50: 10 },
      shielded: { player: 1 },
    };
    const result = makeMove(state, 1, 3);
    expect(result.players[1]).toBe(50);
    expect(result.shielded).toBeNull();
  });

  it('records MoveEvent in lastMoveEvents', () => {
    const state: SnakesAndLaddersState = {
      ...basePowerupState,
      players: { 1: 3, 2: 1 },
      powerups: { 5: 'freeze' },
    };
    const result = makeMove(state, 1, 2);
    expect(result.lastMoveEvents.length).toBe(1);
    expect(result.lastMoveEvents[0].player).toBe(1);
    expect(result.lastMoveEvents[0].roll).toBe(2);
    expect(result.lastMoveEvents[0].from).toBe(3);
    expect(result.lastMoveEvents[0].powerups[0].type).toBe('freeze');
  });

  it('increments moveNumber', () => {
    const state: SnakesAndLaddersState = {
      ...basePowerupState,
      players: { 1: 3, 2: 1 },
    };
    const result = makeMove(state, 1, 2);
    expect(result.moveNumber).toBe(1);
  });
});

describe('skipTurn', () => {
  const basePowerupState: SnakesAndLaddersState = {
    players: { 1: 1, 2: 1 },
    snakes: {},
    ladders: {},
    lastRoll: null,
    moveNumber: 0,
    powerups: {},
    powerupRespawns: [],
    lastMoveEvents: [],
    skipNextTurn: null,
    shielded: null,
    doubleDice: null,
  };

  it('handleSkipTurn consumes skipNextTurn and returns skipped event', () => {
    const state: SnakesAndLaddersState = {
      ...basePowerupState,
      skipNextTurn: { player: 1 },
    };
    const result = handleSkipTurn(state, 1);
    expect(result).not.toBeNull();
    expect(result!.skipNextTurn).toBeNull();
    expect(result!.lastMoveEvents[0].skipped).toBe(true);
  });

  it('handleSkipTurn returns null if player is not frozen', () => {
    const state: SnakesAndLaddersState = {
      ...basePowerupState,
      skipNextTurn: { player: 2 },
    };
    const result = handleSkipTurn(state, 1);
    expect(result).toBeNull();
  });
});

describe('tickRespawns', () => {
  const basePowerupState: SnakesAndLaddersState = {
    players: { 1: 1, 2: 1 },
    snakes: {},
    ladders: {},
    lastRoll: null,
    moveNumber: 0,
    powerups: {},
    powerupRespawns: [{ turnsLeft: 2, type: 'freeze' }, { turnsLeft: 1, type: 'shield' }],
    lastMoveEvents: [],
    skipNextTurn: null,
    shielded: null,
    doubleDice: null,
  };

  it('decrements respawn timers', () => {
    const result = tickRespawns(basePowerupState);
    expect(result.powerupRespawns[0].turnsLeft).toBe(1);
  });

  it('spawns a new powerup when timer reaches 0', () => {
    const result = tickRespawns(basePowerupState);
    // The second respawn (turnsLeft: 1) should hit 0 and spawn
    const powerupCount = Object.keys(result.powerups).length;
    expect(powerupCount).toBe(1);
    expect(result.powerupRespawns.length).toBe(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/snakes-and-ladders-logic.test.ts 2>&1 | tail -20`
Expected: FAIL — new functions and behaviors not implemented

- [ ] **Step 3: Implement powerup-aware makeMove, handleSkipTurn, and tickRespawns**

Rewrite `makeMove` in `src/lib/snakes-and-ladders-logic.ts`:

```typescript
export function handleSkipTurn(state: SnakesAndLaddersState, player: Player): SnakesAndLaddersState | null {
  if (!state.skipNextTurn || state.skipNextTurn.player !== player) return null;

  const event: MoveEvent = {
    player,
    roll: 0,
    from: state.players[player],
    to: state.players[player],
    powerups: [],
    snakeSlide: null,
    ladderClimb: null,
    shieldUsed: false,
    skipped: true,
  };

  return {
    ...state,
    skipNextTurn: null,
    moveNumber: state.moveNumber + 1,
    lastMoveEvents: [...state.lastMoveEvents, event],
    lastRoll: state.lastRoll,
  };
}

export function tickRespawns(state: SnakesAndLaddersState): SnakesAndLaddersState {
  const remaining: { turnsLeft: number; type: PowerupType }[] = [];
  const newPowerups = { ...state.powerups };
  const tempState = { ...state, powerups: newPowerups };

  for (const respawn of state.powerupRespawns) {
    const newTurns = respawn.turnsLeft - 1;
    if (newTurns <= 0) {
      const tile = getValidPowerupTile(tempState);
      if (tile !== -1) {
        const type = POWERUP_TYPES[randomInt(0, POWERUP_TYPES.length - 1)];
        newPowerups[tile] = type;
        tempState.powerups = newPowerups;
      }
    } else {
      remaining.push({ turnsLeft: newTurns, type: respawn.type });
    }
  }

  return { ...state, powerups: newPowerups, powerupRespawns: remaining };
}

function applyPowerup(
  state: SnakesAndLaddersState,
  player: Player,
  position: number,
  depth: number
): { state: SnakesAndLaddersState; position: number; events: { tile: number; type: PowerupType; effect: string }[] } {
  if (depth > 3) return { state, position, events: [] };
  if (state.powerups[position] === undefined) return { state, position, events: [] };

  const type = state.powerups[position];
  const newPowerups = { ...state.powerups };
  delete newPowerups[position];
  const newRespawns = [...state.powerupRespawns, { turnsLeft: 3, type }];
  let newState = { ...state, powerups: newPowerups, powerupRespawns: newRespawns };
  let newPosition = position;
  let effect = '';
  const otherPlayer: Player = player === 1 ? 2 : 1;

  switch (type) {
    case 'double_dice':
      newState = { ...newState, doubleDice: { player } };
      effect = 'Your next roll will be doubled!';
      break;
    case 'shield':
      newState = { ...newState, shielded: { player } };
      effect = 'Protected from the next snake!';
      break;
    case 'reverse': {
      const amount = randomInt(5, 10);
      const opponentPos = Math.max(1, newState.players[otherPlayer] - amount);
      newState = { ...newState, players: { ...newState.players, [otherPlayer]: opponentPos } };
      effect = `Opponent moves back ${amount} spaces!`;
      break;
    }
    case 'teleport': {
      const jump = randomInt(1, 15);
      newPosition = Math.min(100, position + jump);
      effect = `Teleported forward ${jump} spaces!`;
      break;
    }
    case 'freeze':
      newState = { ...newState, skipNextTurn: { player: otherPlayer } };
      effect = 'Opponent\'s next turn is frozen!';
      break;
    case 'swap': {
      const myPos = position;
      const theirPos = newState.players[otherPlayer];
      newState = {
        ...newState,
        players: { ...newState.players, [player]: theirPos, [otherPlayer]: myPos },
      };
      newPosition = theirPos;
      effect = 'Swapped positions with opponent!';
      return { state: newState, position: newPosition, events: [{ tile: position, type, effect }] };
    }
    case 'earthquake': {
      const freshBoard = generateBoard();
      newState = { ...newState, snakes: freshBoard.snakes, ladders: freshBoard.ladders };
      // Re-validate powerup positions after earthquake
      const invalidTiles = Object.keys(newState.powerups).map(Number).filter(
        t => newState.snakes[t] !== undefined || newState.ladders[t] !== undefined
      );
      for (const t of invalidTiles) {
        delete newState.powerups[t];
        newState.powerupRespawns = [...newState.powerupRespawns, { turnsLeft: 2, type: newState.powerups[t] || 'freeze' }];
      }
      effect = 'Earthquake! All snakes and ladders shuffled!';
      break;
    }
    case 'magnet': {
      const ladderBottoms = Object.keys(newState.ladders).map(Number).filter(b => b > position).sort((a, b) => a - b);
      if (ladderBottoms.length > 0) {
        newPosition = ladderBottoms[0];
        effect = `Pulled to ladder at tile ${newPosition}!`;
      } else {
        newPosition = Math.min(100, position + 5);
        effect = 'No ladder ahead — moved forward 5!';
      }
      break;
    }
  }

  const events = [{ tile: position, type, effect }];

  // Check for chaining (landing on another powerup after teleport/magnet)
  if (type === 'teleport' || type === 'magnet') {
    const chain = applyPowerup(newState, player, newPosition, depth + 1);
    return { state: chain.state, position: chain.position, events: [...events, ...chain.events] };
  }

  return { state: newState, position: newPosition, events };
}

export function makeMove(
  state: SnakesAndLaddersState,
  player: Player,
  roll: number
): SnakesAndLaddersState {
  const fromPosition = state.players[player];
  let effectiveRoll = roll;

  // Apply double dice
  let newDoubleDice = state.doubleDice;
  if (state.doubleDice && state.doubleDice.player === player) {
    effectiveRoll = roll * 2;
    newDoubleDice = null;
  }

  let workingState: SnakesAndLaddersState = { ...state, doubleDice: newDoubleDice };

  // Calculate position
  let newPosition = workingState.players[player] + effectiveRoll;
  if (newPosition > 100) {
    newPosition = 200 - newPosition;
  }

  // Apply powerup at landing position
  const powerupResult = applyPowerup(workingState, player, newPosition, 0);
  workingState = powerupResult.state;
  newPosition = powerupResult.position;
  const powerupEvents = powerupResult.events;

  // Update player position
  workingState = { ...workingState, players: { ...workingState.players, [player]: newPosition } };

  // Apply snake/ladder (unless swap was used — swap is terminal, handled in applyPowerup)
  let snakeSlide: { from: number; to: number } | null = null;
  let ladderClimb: { from: number; to: number } | null = null;
  let shieldUsed = false;

  if (workingState.snakes[newPosition] !== undefined) {
    if (workingState.shielded && workingState.shielded.player === player) {
      shieldUsed = true;
      workingState = { ...workingState, shielded: null };
    } else {
      const dest = workingState.snakes[newPosition];
      snakeSlide = { from: newPosition, to: dest };
      newPosition = dest;
      workingState = { ...workingState, players: { ...workingState.players, [player]: newPosition } };
    }
  } else if (workingState.ladders[newPosition] !== undefined) {
    const dest = workingState.ladders[newPosition];
    ladderClimb = { from: newPosition, to: dest };
    newPosition = dest;
    workingState = { ...workingState, players: { ...workingState.players, [player]: newPosition } };
  }

  // Record move event
  const event: MoveEvent = {
    player,
    roll: effectiveRoll,
    from: fromPosition,
    to: newPosition,
    powerups: powerupEvents,
    snakeSlide,
    ladderClimb,
    shieldUsed,
    skipped: false,
  };

  return {
    ...workingState,
    lastRoll: { player, value: roll },
    moveNumber: workingState.moveNumber + 1,
    lastMoveEvents: [...workingState.lastMoveEvents, event],
  };
}
```

Update the import at the top:

```typescript
import type { Player, SnakesAndLaddersState, PowerupType, MoveEvent } from './types';
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/snakes-and-ladders-logic.test.ts 2>&1 | tail -30`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/snakes-and-ladders-logic.ts src/lib/snakes-and-ladders-logic.test.ts
git commit -m "feat(snakes): implement powerup-aware makeMove with all 8 powerup types"
```

---

### Task 4: Update the Game Hook

**Files:**
- Modify: `src/hooks/useSnakesAndLaddersGame.ts`

- [ ] **Step 1: Update the hook to handle powerup state and replay**

Replace the full contents of `src/hooks/useSnakesAndLaddersGame.ts` with an updated version that:

1. Imports `handleSkipTurn`, `tickRespawns` from logic
2. Adds `MoveEvent[]` replay state: `replayEvents` and `isReplaying`
3. In `rollDice`: calls `tickRespawns` at the start of each turn, checks `handleSkipTurn` before rolling
4. In the polling effect: detects `moveNumber` changes (instead of `lastRoll`) and triggers replay
5. Exposes `replayEvents`, `isReplaying`, `skipReplay` from the hook

Key changes to `rollDice`:

```typescript
const rollDice = useCallback(async () => {
  const currentGame = gameRef.current;
  if (!currentGame) return;

  const myName = getMyName();
  if (!myName) { setError('No player name set'); return; }

  const isPlayer1 = currentGame.player1_name === myName;
  const isPlayer2 = currentGame.player2_name === myName;
  if (!isPlayer1 && !isPlayer2) { setError('You are not a player in this game'); return; }

  const myPlayerNumber: Player = isPlayer1 ? 1 : 2;
  if (currentGame.current_turn !== myPlayerNumber) { setError('Not your turn'); return; }
  if (currentGame.winner !== null) { setError('Game is already over'); return; }

  let currentBoard = currentGame.board as SnakesAndLaddersState;

  // Tick respawns at start of turn
  currentBoard = tickRespawns(currentBoard);

  // Check for skip
  const skipResult = handleSkipTurn(currentBoard, myPlayerNumber);
  if (skipResult) {
    const nextTurn: Player = myPlayerNumber === 1 ? 2 : 1;
    optimisticBoard.current = skipResult;
    updateGame((prev) => prev ? { ...prev, board: skipResult, current_turn: nextTurn } : null);

    await supabase.from('games').update({
      board: skipResult,
      current_turn: nextTurn,
      updated_at: new Date().toISOString(),
    }).eq('id', gameId);
    return;
  }

  const roll = generateRoll();
  const fromPosition = currentBoard.players[myPlayerNumber];
  const newBoard = computeMove(currentBoard, myPlayerNumber, roll);
  const winner = checkWin(newBoard);

  const nextTurn: Player = (roll === 6 && !winner)
    ? myPlayerNumber
    : (myPlayerNumber === 1 ? 2 : 1);

  // Clear lastMoveEvents when it's other player's turn (they've seen the replay)
  const boardToSave = nextTurn !== myPlayerNumber
    ? newBoard
    : { ...newBoard, lastMoveEvents: [] };

  optimisticBoard.current = boardToSave;
  setLastMove({
    player: myPlayerNumber,
    from: fromPosition,
    to: newBoard.players[myPlayerNumber],
    roll,
  });
  updateGame((prev) => prev ? { ...prev, board: boardToSave, current_turn: winner ? prev.current_turn : nextTurn, winner } : null);
  setError(null);

  const { error: updateError } = await supabase.from('games').update({
    board: boardToSave,
    current_turn: winner ? currentGame.current_turn : nextTurn,
    winner,
    updated_at: new Date().toISOString(),
  }).eq('id', gameId);

  if (updateError) {
    optimisticBoard.current = null;
    const { data: freshGame } = await supabase.from('games').select('*').eq('id', gameId).single();
    if (freshGame) updateGame(freshGame as SnakesAndLaddersGame);
    setError(updateError.message);
    return;
  }

  if (winner && !matchRecorded.current) {
    matchRecorded.current = true;
    // ... existing match recording logic unchanged
  }
}, [gameId, updateGame]);
```

Add replay detection to polling:

```typescript
const lastSeenMoveNumber = useRef<number>(0);
const [replayEvents, setReplayEvents] = useState<MoveEvent[]>([]);
const [isReplaying, setIsReplaying] = useState(false);

// In polling effect, after detecting state change:
const freshBoard = fresh.board as SnakesAndLaddersState;
if (freshBoard.moveNumber > lastSeenMoveNumber.current && freshBoard.lastMoveEvents.length > 0) {
  setReplayEvents(freshBoard.lastMoveEvents);
  setIsReplaying(true);
  lastSeenMoveNumber.current = freshBoard.moveNumber;
}

const skipReplay = useCallback(() => {
  setReplayEvents([]);
  setIsReplaying(false);
}, []);
```

Update the return type to include `replayEvents`, `isReplaying`, `skipReplay`.

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: No errors (or only unrelated ones)

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useSnakesAndLaddersGame.ts
git commit -m "feat(snakes): update game hook with powerup processing and replay detection"
```

---

### Task 5: PowerupToast Component

**Files:**
- Create: `src/components/snakes-and-ladders/PowerupToast.tsx`

- [ ] **Step 1: Create the PowerupToast component**

```typescript
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { PowerupType } from '@/lib/types';

const POWERUP_INFO: Record<PowerupType, { icon: string; name: string }> = {
  double_dice: { icon: '🎲', name: 'Double Dice' },
  shield: { icon: '🛡️', name: 'Shield' },
  reverse: { icon: '⏪', name: 'Reverse' },
  teleport: { icon: '✨', name: 'Teleport' },
  freeze: { icon: '🧊', name: 'Freeze' },
  swap: { icon: '🔄', name: 'Swap' },
  earthquake: { icon: '🌋', name: 'Earthquake' },
  magnet: { icon: '🧲', name: 'Magnet' },
};

interface PowerupToastProps {
  powerup: { type: PowerupType; effect: string } | null;
  onDismiss: () => void;
}

export function PowerupToast({ powerup, onDismiss }: PowerupToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (powerup) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        onDismiss();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [powerup, onDismiss]);

  const info = powerup ? POWERUP_INFO[powerup.type] : null;

  return (
    <AnimatePresence>
      {visible && info && powerup && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
        >
          <div
            className="bg-surface/95 backdrop-blur-sm border border-border rounded-2xl px-8 py-6 shadow-xl text-center pointer-events-auto cursor-pointer"
            onClick={() => { setVisible(false); onDismiss(); }}
          >
            <div className="text-5xl mb-3">{info.icon}</div>
            <div className="text-lg font-bold text-text-primary mb-1">{info.name}</div>
            <div className="text-sm text-text-secondary">{powerup.effect}</div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export { POWERUP_INFO };
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit src/components/snakes-and-ladders/PowerupToast.tsx 2>&1`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/snakes-and-ladders/PowerupToast.tsx
git commit -m "feat(snakes): add PowerupToast component for powerup notifications"
```

---

### Task 6: Update Board Component to Show Powerups

**Files:**
- Modify: `src/components/snakes-and-ladders/Board.tsx`

- [ ] **Step 1: Add powerup tile rendering to the board grid**

In the `Board` component, import `POWERUP_INFO` from `PowerupToast` and update the square rendering to show powerup icons:

Add import:
```typescript
import { POWERUP_INFO } from './PowerupToast';
```

Inside the `squares.map()` block, after the existing `isSnakeHead` / `isLadderBottom` checks, add:

```typescript
const powerupType = board.powerups?.[num];
const powerupInfo = powerupType ? POWERUP_INFO[powerupType] : null;
```

Add inside the square `<div>`, after the ladder bottom highlight:

```typescript
{powerupInfo && (
  <motion.div
    key={`powerup-${num}-${powerupType}`}
    initial={{ scale: 0 }}
    animate={{ scale: 1 }}
    transition={{ type: 'spring', stiffness: 400, damping: 15 }}
    className="absolute inset-0 flex items-center justify-center text-lg bg-amber-500/10 rounded-sm"
  >
    {powerupInfo.icon}
  </motion.div>
)}
```

Also add `motion` import from framer-motion to the existing import if not already a named import for div:

```typescript
import { motion, useAnimationControls, AnimatePresence } from 'framer-motion';
```

- [ ] **Step 2: Verify the board compiles and renders powerup icons**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/snakes-and-ladders/Board.tsx
git commit -m "feat(snakes): render powerup icons on board tiles"
```

---

### Task 7: Turn Replay Animation

**Files:**
- Create: `src/components/snakes-and-ladders/TurnReplay.tsx`
- Modify: `src/app/snakes-and-ladders/[gameId]/page.tsx`

- [ ] **Step 1: Create TurnReplay component**

```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PowerupToast, POWERUP_INFO } from './PowerupToast';
import type { MoveEvent } from '@/lib/types';

interface TurnReplayProps {
  events: MoveEvent[];
  onComplete: () => void;
}

export function TurnReplay({ events, onComplete }: TurnReplayProps) {
  const [currentEventIndex, setCurrentEventIndex] = useState(0);
  const [phase, setPhase] = useState<'dice' | 'powerup' | 'done'>('dice');
  const [currentPowerupIndex, setCurrentPowerupIndex] = useState(0);

  const currentEvent = events[currentEventIndex];

  useEffect(() => {
    if (!currentEvent) {
      onComplete();
      return;
    }

    if (currentEvent.skipped) {
      const timer = setTimeout(() => {
        if (currentEventIndex < events.length - 1) {
          setCurrentEventIndex(i => i + 1);
          setPhase('dice');
        } else {
          onComplete();
        }
      }, 1000);
      return () => clearTimeout(timer);
    }

    if (phase === 'dice') {
      const timer = setTimeout(() => {
        if (currentEvent.powerups.length > 0) {
          setPhase('powerup');
          setCurrentPowerupIndex(0);
        } else {
          setPhase('done');
        }
      }, 1500);
      return () => clearTimeout(timer);
    }

    if (phase === 'done') {
      const timer = setTimeout(() => {
        if (currentEventIndex < events.length - 1) {
          setCurrentEventIndex(i => i + 1);
          setPhase('dice');
          setCurrentPowerupIndex(0);
        } else {
          onComplete();
        }
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [currentEvent, currentEventIndex, events, phase, onComplete]);

  const handlePowerupDismiss = useCallback(() => {
    if (!currentEvent) return;
    if (currentPowerupIndex < currentEvent.powerups.length - 1) {
      setCurrentPowerupIndex(i => i + 1);
    } else {
      setPhase('done');
    }
  }, [currentEvent, currentPowerupIndex]);

  if (!currentEvent) return null;

  return (
    <div className="fixed inset-0 z-40 pointer-events-none">
      {/* Skip button */}
      <button
        onClick={onComplete}
        className="absolute top-4 right-4 px-3 py-1.5 text-xs font-medium rounded-lg bg-surface/90 border border-border text-text-secondary hover:text-text-primary pointer-events-auto cursor-pointer z-50"
      >
        Skip
      </button>

      {/* Skipped turn text */}
      <AnimatePresence>
        {currentEvent.skipped && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="bg-surface/95 border border-border rounded-xl px-6 py-4 text-center">
              <div className="text-2xl mb-1">🧊</div>
              <div className="text-sm font-semibold text-text-primary">Turn Skipped! (Frozen)</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dice result overlay */}
      <AnimatePresence>
        {!currentEvent.skipped && phase === 'dice' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="absolute top-20 left-1/2 -translate-x-1/2"
          >
            <div className="bg-surface/95 border border-border rounded-xl px-4 py-2 text-center shadow-lg">
              <div className="text-xs text-text-secondary">Opponent rolled</div>
              <div className="text-2xl font-bold text-text-primary">{currentEvent.roll}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Powerup toast */}
      {phase === 'powerup' && currentEvent.powerups[currentPowerupIndex] && (
        <PowerupToast
          powerup={currentEvent.powerups[currentPowerupIndex]}
          onDismiss={handlePowerupDismiss}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Integrate TurnReplay into the game page**

In `src/app/snakes-and-ladders/[gameId]/page.tsx`, import and render `TurnReplay` when `isReplaying` is true:

```typescript
import { TurnReplay } from '@/components/snakes-and-ladders/TurnReplay';
```

Add to the JSX, above the board:

```typescript
{isReplaying && replayEvents.length > 0 && (
  <TurnReplay events={replayEvents} onComplete={skipReplay} />
)}
```

Disable the roll button while replaying:

```typescript
disabled={isReplaying || game.winner !== null}
```

- [ ] **Step 3: Verify compilation**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/components/snakes-and-ladders/TurnReplay.tsx src/app/snakes-and-ladders/\[gameId\]/page.tsx
git commit -m "feat(snakes): add turn replay animation with skip button"
```

---

### Task 8: Integration - Wire PowerupToast into Live Play

**Files:**
- Modify: `src/app/snakes-and-ladders/[gameId]/page.tsx`

- [ ] **Step 1: Add live powerup toast to game page**

In the game page component, add state for showing powerup toasts during live play:

```typescript
const [activePowerupToast, setActivePowerupToast] = useState<{ type: PowerupType; effect: string } | null>(null);
```

After `rollDice` is called, detect if the latest move event had a powerup:

```typescript
useEffect(() => {
  if (!game?.board) return;
  const board = game.board as SnakesAndLaddersState;
  const events = board.lastMoveEvents;
  if (events.length === 0) return;
  const lastEvent = events[events.length - 1];
  const myName = getMyName();
  const myPlayerNumber = game.player1_name === myName ? 1 : 2;
  if (lastEvent.player === myPlayerNumber && lastEvent.powerups.length > 0) {
    setActivePowerupToast(lastEvent.powerups[0]);
  }
}, [game?.board]);
```

Add toast to JSX:

```typescript
<PowerupToast powerup={activePowerupToast} onDismiss={() => setActivePowerupToast(null)} />
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/app/snakes-and-ladders/\[gameId\]/page.tsx
git commit -m "feat(snakes): wire PowerupToast into live gameplay"
```

---

### Task 9: Update Existing Tests for New State Shape

**Files:**
- Modify: `src/lib/snakes-and-ladders-logic.test.ts`

- [ ] **Step 1: Update baseState in existing tests to include new fields**

All existing test `baseState` objects need the new fields. Update every `SnakesAndLaddersState` literal in the test file to include:

```typescript
moveNumber: 0,
powerups: {},
powerupRespawns: [],
lastMoveEvents: [],
skipNextTurn: null,
shielded: null,
doubleDice: null,
```

- [ ] **Step 2: Run full test suite**

Run: `npx vitest run src/lib/snakes-and-ladders-logic.test.ts 2>&1 | tail -30`
Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
git add src/lib/snakes-and-ladders-logic.test.ts
git commit -m "test(snakes): update existing tests for new powerup state shape"
```

---

### Task 10: Update Lobby Page for New Board Shape

**Files:**
- Modify: `src/app/snakes-and-ladders/page.tsx`

- [ ] **Step 1: Update game creation to use new generateBoard (which now includes powerups)**

The lobby page calls `generateBoard()` when creating a new game. Since `generateBoard` now returns the full state including powerups, no changes should be needed to the creation call. But verify the `resetGame` function in the hook uses the correct default state shape:

In `src/hooks/useSnakesAndLaddersGame.ts`, update the `resetGame` board value:

```typescript
board: {
  players: { 1: 1, 2: 1 },
  snakes: {},
  ladders: {},
  lastRoll: null,
  moveNumber: 0,
  powerups: {},
  powerupRespawns: [],
  lastMoveEvents: [],
  skipNextTurn: null,
  shielded: null,
  doubleDice: null,
},
```

- [ ] **Step 2: Verify the app compiles end-to-end**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: No errors

- [ ] **Step 3: Run all snakes-and-ladders tests**

Run: `npx vitest run src/lib/snakes-and-ladders-logic.test.ts 2>&1 | tail -10`
Expected: All PASS

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useSnakesAndLaddersGame.ts src/app/snakes-and-ladders/page.tsx
git commit -m "fix(snakes): update resetGame and lobby for new board state shape"
```

---

### Task 11: Manual QA and Polish

**Files:**
- Potentially modify: any of the above files

- [ ] **Step 1: Start dev server and test the game**

Run: `npm run dev`

Test:
1. Navigate to snakes-and-ladders lobby
2. Start a new game — verify 7 powerup icons visible on board
3. Roll dice and land on a powerup — verify toast appears
4. Test each powerup type (may need multiple games)
5. Test the replay: open a second browser tab, take turns, verify replay animation shows when returning

- [ ] **Step 2: Fix any visual or functional issues found during testing**

- [ ] **Step 3: Final commit if changes were needed**

```bash
git add -A
git commit -m "fix(snakes): polish powerup rendering and replay animation"
```

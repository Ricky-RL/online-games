import { describe, it, expect, vi } from 'vitest';
import { makeMove, handleSkipTurn, tickRespawns, getValidPowerupTile } from './snakes-and-ladders-logic';
import type { SnakesAndLaddersState } from './types';

const baseState: SnakesAndLaddersState = {
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

describe('handleSkipTurn edge cases', () => {
  it('returns null when skipNextTurn is null', () => {
    const result = handleSkipTurn(baseState, 1);
    expect(result).toBeNull();
  });

  it('increments moveNumber when skip is consumed', () => {
    const state: SnakesAndLaddersState = {
      ...baseState,
      moveNumber: 5,
      skipNextTurn: { player: 2 },
    };
    const result = handleSkipTurn(state, 2);
    expect(result).not.toBeNull();
    expect(result!.moveNumber).toBe(6);
  });

  it('preserves lastRoll when skip is consumed', () => {
    const state: SnakesAndLaddersState = {
      ...baseState,
      lastRoll: { player: 1, value: 4 },
      skipNextTurn: { player: 2 },
    };
    const result = handleSkipTurn(state, 2);
    expect(result!.lastRoll).toEqual({ player: 1, value: 4 });
  });

  it('skipped event has from and to equal to current position', () => {
    const state: SnakesAndLaddersState = {
      ...baseState,
      players: { 1: 1, 2: 42 },
      skipNextTurn: { player: 2 },
    };
    const result = handleSkipTurn(state, 2);
    expect(result!.lastMoveEvents[0].from).toBe(42);
    expect(result!.lastMoveEvents[0].to).toBe(42);
    expect(result!.lastMoveEvents[0].roll).toBe(0);
  });
});

describe('doubleDice edge cases', () => {
  it('does not consume doubleDice if it belongs to the other player', () => {
    const state: SnakesAndLaddersState = {
      ...baseState,
      players: { 1: 10, 2: 10 },
      doubleDice: { player: 2 },
    };
    const result = makeMove(state, 1, 3);
    // Player 1 moves normally (not doubled)
    expect(result.players[1]).toBe(13);
    // doubleDice remains for player 2
    expect(result.doubleDice).toEqual({ player: 2 });
  });

  it('doubleDice causes bounce-back correctly', () => {
    const state: SnakesAndLaddersState = {
      ...baseState,
      players: { 1: 96, 2: 1 },
      doubleDice: { player: 1 },
    };
    // roll 4 => effective 8 => 96 + 8 = 104 > 100 => bounce to 200 - 104 = 96
    const result = makeMove(state, 1, 4);
    expect(result.players[1]).toBe(96);
    expect(result.doubleDice).toBeNull();
  });
});

describe('powerup chaining (teleport/magnet depth)', () => {
  it('teleport chains into a second powerup', () => {
    // Player at 3, rolls 2, lands on 5 which has teleport.
    // Teleport moves forward 1-15. We place another powerup at each possible spot.
    // Use a deterministic approach: place freeze at tile 6-20 to catch the teleport.
    const state: SnakesAndLaddersState = {
      ...baseState,
      players: { 1: 3, 2: 1 },
      powerups: {
        5: 'teleport',
        6: 'freeze', 7: 'freeze', 8: 'freeze', 9: 'freeze', 10: 'freeze',
        11: 'freeze', 12: 'freeze', 13: 'freeze', 14: 'freeze', 15: 'freeze',
        16: 'freeze', 17: 'freeze', 18: 'freeze', 19: 'freeze', 20: 'freeze',
      },
    };
    const result = makeMove(state, 1, 2);
    // After teleport, should chain into a freeze powerup
    // The result should have skipNextTurn set (from the freeze)
    expect(result.skipNextTurn).toEqual({ player: 2 });
    // At least 2 powerup events in the move
    const lastEvent = result.lastMoveEvents[result.lastMoveEvents.length - 1];
    expect(lastEvent.powerups.length).toBeGreaterThanOrEqual(2);
    expect(lastEvent.powerups[0].type).toBe('teleport');
    expect(lastEvent.powerups[1].type).toBe('freeze');
  });

  it('chaining stops at depth > 3', () => {
    // Place powerups that chain: teleport -> teleport -> teleport -> teleport
    // At depth 3, it should stop processing
    const state: SnakesAndLaddersState = {
      ...baseState,
      players: { 1: 3, 2: 1 },
      powerups: {
        5: 'teleport',
        // Fill potential teleport destinations with more teleports
        6: 'teleport', 7: 'teleport', 8: 'teleport', 9: 'teleport', 10: 'teleport',
        11: 'teleport', 12: 'teleport', 13: 'teleport', 14: 'teleport', 15: 'teleport',
        16: 'teleport', 17: 'teleport', 18: 'teleport', 19: 'teleport', 20: 'teleport',
        21: 'teleport', 22: 'teleport', 23: 'teleport', 24: 'teleport', 25: 'teleport',
        26: 'teleport', 27: 'teleport', 28: 'teleport', 29: 'teleport', 30: 'teleport',
        31: 'teleport', 32: 'teleport', 33: 'teleport', 34: 'teleport', 35: 'teleport',
        36: 'teleport', 37: 'teleport', 38: 'teleport', 39: 'teleport', 40: 'teleport',
        41: 'teleport', 42: 'teleport', 43: 'teleport', 44: 'teleport', 45: 'teleport',
        46: 'teleport', 47: 'teleport', 48: 'teleport', 49: 'teleport', 50: 'teleport',
        51: 'teleport', 52: 'teleport', 53: 'teleport', 54: 'teleport', 55: 'teleport',
        56: 'teleport', 57: 'teleport', 58: 'teleport', 59: 'teleport', 60: 'teleport',
      },
    };
    const result = makeMove(state, 1, 2);
    const lastEvent = result.lastMoveEvents[result.lastMoveEvents.length - 1];
    // Max depth is 4 total: initial(0) + chain at depths 1, 2, 3 => max 4 events
    expect(lastEvent.powerups.length).toBeLessThanOrEqual(4);
  });

  it('magnet chains into a powerup at the ladder bottom', () => {
    const state: SnakesAndLaddersState = {
      ...baseState,
      players: { 1: 3, 2: 1 },
      powerups: { 5: 'magnet', 20: 'shield' },
      ladders: { 20: 60 },
    };
    const result = makeMove(state, 1, 2);
    // Magnet pulls to ladder at 20, which has a shield powerup
    // The shield is applied BEFORE the ladder (powerup processing happens before snake/ladder)
    expect(result.shielded).toEqual({ player: 1 });
    const lastEvent = result.lastMoveEvents[result.lastMoveEvents.length - 1];
    expect(lastEvent.powerups.length).toBe(2);
    expect(lastEvent.powerups[0].type).toBe('magnet');
    expect(lastEvent.powerups[1].type).toBe('shield');
  });
});

describe('MoveEvent details', () => {
  it('records snakeSlide in MoveEvent', () => {
    const state: SnakesAndLaddersState = {
      ...baseState,
      players: { 1: 47, 2: 1 },
      snakes: { 50: 10 },
    };
    const result = makeMove(state, 1, 3);
    const event = result.lastMoveEvents[0];
    expect(event.snakeSlide).toEqual({ from: 50, to: 10 });
    expect(event.ladderClimb).toBeNull();
    expect(event.shieldUsed).toBe(false);
  });

  it('records ladderClimb in MoveEvent', () => {
    const state: SnakesAndLaddersState = {
      ...baseState,
      players: { 1: 2, 2: 1 },
      ladders: { 5: 30 },
    };
    const result = makeMove(state, 1, 3);
    const event = result.lastMoveEvents[0];
    expect(event.ladderClimb).toEqual({ from: 5, to: 30 });
    expect(event.snakeSlide).toBeNull();
  });

  it('records shieldUsed in MoveEvent when shield blocks snake', () => {
    const state: SnakesAndLaddersState = {
      ...baseState,
      players: { 1: 47, 2: 1 },
      snakes: { 50: 10 },
      shielded: { player: 1 },
    };
    const result = makeMove(state, 1, 3);
    const event = result.lastMoveEvents[0];
    expect(event.shieldUsed).toBe(true);
    expect(event.snakeSlide).toBeNull();
    expect(event.to).toBe(50);
  });

  it('resets lastMoveEvents to only the current move event', () => {
    const state: SnakesAndLaddersState = {
      ...baseState,
      players: { 1: 3, 2: 1 },
      lastMoveEvents: [
        { player: 2, roll: 4, from: 1, to: 5, powerups: [], snakeSlide: null, ladderClimb: null, shieldUsed: false, skipped: false },
      ],
    };
    const result = makeMove(state, 1, 2);
    expect(result.lastMoveEvents.length).toBe(1);
    expect(result.lastMoveEvents[0].player).toBe(1);
  });

  it('MoveEvent from and to are correct for basic move', () => {
    const state: SnakesAndLaddersState = {
      ...baseState,
      players: { 1: 10, 2: 1 },
    };
    const result = makeMove(state, 1, 5);
    const event = result.lastMoveEvents[0];
    expect(event.from).toBe(10);
    expect(event.to).toBe(15);
    expect(event.roll).toBe(5);
    expect(event.player).toBe(1);
    expect(event.skipped).toBe(false);
  });
});

describe('tickRespawns edge cases', () => {
  it('handles empty respawns array', () => {
    const state: SnakesAndLaddersState = {
      ...baseState,
      powerupRespawns: [],
    };
    const result = tickRespawns(state);
    expect(result.powerupRespawns).toEqual([]);
    expect(Object.keys(result.powerups)).toHaveLength(0);
  });

  it('decrements all timers when none reach 0', () => {
    const state: SnakesAndLaddersState = {
      ...baseState,
      powerupRespawns: [
        { turnsLeft: 3, type: 'shield' },
        { turnsLeft: 2, type: 'freeze' },
      ],
    };
    const result = tickRespawns(state);
    expect(result.powerupRespawns.length).toBe(2);
    expect(result.powerupRespawns[0].turnsLeft).toBe(2);
    expect(result.powerupRespawns[1].turnsLeft).toBe(1);
    expect(Object.keys(result.powerups)).toHaveLength(0);
  });

  it('spawns multiple powerups when multiple timers reach 0', () => {
    const state: SnakesAndLaddersState = {
      ...baseState,
      powerupRespawns: [
        { turnsLeft: 1, type: 'shield' },
        { turnsLeft: 1, type: 'freeze' },
      ],
    };
    const result = tickRespawns(state);
    expect(result.powerupRespawns.length).toBe(0);
    expect(Object.keys(result.powerups).length).toBe(2);
  });

  it('preserves existing powerups when spawning new ones', () => {
    const state: SnakesAndLaddersState = {
      ...baseState,
      powerups: { 25: 'magnet', 50: 'swap' },
      powerupRespawns: [{ turnsLeft: 1, type: 'shield' }],
    };
    const result = tickRespawns(state);
    expect(result.powerups[25]).toBe('magnet');
    expect(result.powerups[50]).toBe('swap');
    expect(Object.keys(result.powerups).length).toBe(3);
  });
});

describe('getValidPowerupTile edge cases', () => {
  it('returns -1 when the board is fully occupied', () => {
    // Create a state where all tiles 2-99 are occupied
    const powerups: Record<number, any> = {};
    for (let i = 2; i <= 99; i++) {
      powerups[i] = 'shield';
    }
    const state: SnakesAndLaddersState = {
      ...baseState,
      powerups,
    };
    const tile = getValidPowerupTile(state);
    expect(tile).toBe(-1);
  });

  it('avoids snake tails', () => {
    // Snake goes from 50 to 10. Tile 10 (the tail) should be excluded
    const state: SnakesAndLaddersState = {
      ...baseState,
      snakes: { 50: 10 },
    };
    // Run many times to verify tile 10 is never chosen
    for (let i = 0; i < 50; i++) {
      const tile = getValidPowerupTile(state);
      expect(tile).not.toBe(10);
      expect(tile).not.toBe(50);
    }
  });

  it('avoids ladder tops', () => {
    const state: SnakesAndLaddersState = {
      ...baseState,
      ladders: { 5: 30 },
    };
    for (let i = 0; i < 50; i++) {
      const tile = getValidPowerupTile(state);
      expect(tile).not.toBe(5);
      expect(tile).not.toBe(30);
    }
  });
});

describe('earthquake powerup details', () => {
  it('removes powerups that conflict with new snakes/ladders', () => {
    // Place powerups at tiles that a fresh board generation will likely occupy with snakes/ladders.
    // Since earthquake generates a new board, any existing powerup on a new snake/ladder tile is removed.
    // We can't predict exactly, but we can verify the invariant.
    const state: SnakesAndLaddersState = {
      ...baseState,
      players: { 1: 3, 2: 1 },
      powerups: { 5: 'earthquake' },
      snakes: { 50: 10 },
      ladders: { 20: 60 },
    };
    const result = makeMove(state, 1, 2);
    // No powerup should overlap with a snake head or ladder bottom in the result
    for (const tile of Object.keys(result.powerups).map(Number)) {
      expect(result.snakes[tile]).toBeUndefined();
      expect(result.ladders[tile]).toBeUndefined();
    }
  });
});

describe('swap powerup details', () => {
  it('swap powerup does not chain (returns immediately)', () => {
    // Place a powerup on the opponent's position (which is where we'll swap to)
    const state: SnakesAndLaddersState = {
      ...baseState,
      players: { 1: 3, 2: 70 },
      powerups: { 5: 'swap', 70: 'freeze' },
    };
    const result = makeMove(state, 1, 2);
    // Player 1 swaps to tile 70, but swap does NOT chain further
    expect(result.players[1]).toBe(70);
    expect(result.players[2]).toBe(5);
    const lastEvent = result.lastMoveEvents[result.lastMoveEvents.length - 1];
    // Only 1 powerup event (swap), not 2 (swap + freeze)
    expect(lastEvent.powerups.length).toBe(1);
    expect(lastEvent.powerups[0].type).toBe('swap');
    // The freeze powerup at 70 should still be on the board (not consumed)
    expect(result.powerups[70]).toBe('freeze');
  });
});

describe('reverse powerup from player 2 perspective', () => {
  it('reverse by player 2 moves player 1 back', () => {
    const state: SnakesAndLaddersState = {
      ...baseState,
      players: { 1: 40, 2: 3 },
      powerups: { 5: 'reverse' },
    };
    const result = makeMove(state, 2, 2);
    // Player 1 should be moved back 5-10 spaces from 40
    expect(result.players[1]).toBeGreaterThanOrEqual(30);
    expect(result.players[1]).toBeLessThanOrEqual(35);
  });
});

describe('makeMove roll 6 extra turn logic', () => {
  it('records effective doubled roll in MoveEvent', () => {
    const state: SnakesAndLaddersState = {
      ...baseState,
      players: { 1: 10, 2: 1 },
      doubleDice: { player: 1 },
    };
    const result = makeMove(state, 1, 3);
    const event = result.lastMoveEvents[0];
    expect(event.roll).toBe(6); // effectiveRoll = 3 * 2
  });
});

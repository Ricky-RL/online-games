import { describe, it, expect } from 'vitest';
import { generateBoard, makeMove, checkWin, rollDice, getSquareEntity, getValidPowerupTile, spawnPowerups, POWERUP_TYPES, handleSkipTurn, tickRespawns } from './snakes-and-ladders-logic';
import type { SnakesAndLaddersState, PowerupType } from './types';

describe('generateBoard', () => {
  it('creates initial state with players at position 1', () => {
    const state = generateBoard();
    expect(state.players[1]).toBe(1);
    expect(state.players[2]).toBe(1);
  });

  it('generates 8 snakes', () => {
    const state = generateBoard();
    expect(Object.keys(state.snakes)).toHaveLength(8);
  });

  it('generates 8 ladders', () => {
    const state = generateBoard();
    expect(Object.keys(state.ladders)).toHaveLength(8);
  });

  it('snakes always go downward (head > tail)', () => {
    const state = generateBoard();
    for (const [head, tail] of Object.entries(state.snakes)) {
      expect(Number(head)).toBeGreaterThan(tail);
    }
  });

  it('ladders always go upward (top > bottom)', () => {
    const state = generateBoard();
    for (const [bottom, top] of Object.entries(state.ladders)) {
      expect(top).toBeGreaterThan(Number(bottom));
    }
  });

  it('no endpoints overlap with each other or squares 1/100', () => {
    const state = generateBoard();
    const allEndpoints: number[] = [];
    for (const [head, tail] of Object.entries(state.snakes)) {
      allEndpoints.push(Number(head), tail);
    }
    for (const [bottom, top] of Object.entries(state.ladders)) {
      allEndpoints.push(Number(bottom), top);
    }
    const unique = new Set(allEndpoints);
    expect(unique.size).toBe(allEndpoints.length);
    expect(unique.has(1)).toBe(false);
    expect(unique.has(100)).toBe(false);
  });

  it('has at least 2 snakes in range 80-99', () => {
    const state = generateBoard();
    const highSnakes = Object.keys(state.snakes)
      .map(Number)
      .filter((h) => h >= 80 && h <= 99);
    expect(highSnakes.length).toBeGreaterThanOrEqual(2);
  });

  it('has at least 2 ladders in range 2-20', () => {
    const state = generateBoard();
    const earlyLadders = Object.keys(state.ladders)
      .map(Number)
      .filter((b) => b >= 2 && b <= 20);
    expect(earlyLadders.length).toBeGreaterThanOrEqual(2);
  });

  it('lastRoll starts as null', () => {
    const state = generateBoard();
    expect(state.lastRoll).toBeNull();
  });
});

describe('rollDice', () => {
  it('returns a number between 1 and 6', () => {
    for (let i = 0; i < 100; i++) {
      const roll = rollDice();
      expect(roll).toBeGreaterThanOrEqual(1);
      expect(roll).toBeLessThanOrEqual(6);
    }
  });
});

describe('makeMove', () => {
  const baseState: SnakesAndLaddersState = {
    players: { 1: 1, 2: 1 },
    snakes: { 50: 10 },
    ladders: { 5: 30 },
    lastRoll: null,
    moveNumber: 0,
    powerups: {},
    powerupRespawns: [],
    lastMoveEvents: [],
    skipNextTurn: null,
    shielded: null,
    doubleDice: null,
  };

  it('advances player by roll value', () => {
    const result = makeMove(baseState, 1, 3);
    expect(result.players[1]).toBe(4);
  });

  it('records the last roll', () => {
    const result = makeMove(baseState, 1, 3);
    expect(result.lastRoll).toEqual({ player: 1, value: 3 });
  });

  it('does not move the other player', () => {
    const result = makeMove(baseState, 1, 3);
    expect(result.players[2]).toBe(1);
  });

  it('applies ladder when landing on ladder bottom', () => {
    const state: SnakesAndLaddersState = {
      players: { 1: 2, 2: 1 },
      snakes: {},
      ladders: { 5: 30 },
      lastRoll: null,
      moveNumber: 0,
      powerups: {},
      powerupRespawns: [],
      lastMoveEvents: [],
      skipNextTurn: null,
      shielded: null,
      doubleDice: null,
    };
    const result = makeMove(state, 1, 3);
    expect(result.players[1]).toBe(30);
  });

  it('applies snake when landing on snake head', () => {
    const state: SnakesAndLaddersState = {
      players: { 1: 47, 2: 1 },
      snakes: { 50: 10 },
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
    const result = makeMove(state, 1, 3);
    expect(result.players[1]).toBe(10);
  });

  it('bounces back when exceeding 100', () => {
    const state: SnakesAndLaddersState = {
      players: { 1: 98, 2: 1 },
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
    const result = makeMove(state, 1, 5);
    expect(result.players[1]).toBe(97);
  });

  it('applies snake after bounce-back', () => {
    const state: SnakesAndLaddersState = {
      players: { 1: 98, 2: 1 },
      snakes: { 97: 20 },
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
    const result = makeMove(state, 1, 5);
    expect(result.players[1]).toBe(20);
  });

  it('lands exactly on 100 to win', () => {
    const state: SnakesAndLaddersState = {
      players: { 1: 96, 2: 1 },
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
    const result = makeMove(state, 1, 4);
    expect(result.players[1]).toBe(100);
  });

  it('wins via ladder landing on 100', () => {
    const state: SnakesAndLaddersState = {
      players: { 1: 92, 2: 1 },
      snakes: {},
      ladders: { 95: 100 },
      lastRoll: null,
      moveNumber: 0,
      powerups: {},
      powerupRespawns: [],
      lastMoveEvents: [],
      skipNextTurn: null,
      shielded: null,
      doubleDice: null,
    };
    const result = makeMove(state, 1, 3);
    expect(result.players[1]).toBe(100);
  });
});

describe('checkWin', () => {
  it('returns null when no player is on 100', () => {
    const state: SnakesAndLaddersState = {
      players: { 1: 50, 2: 60 },
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
    expect(checkWin(state)).toBeNull();
  });

  it('returns 1 when player 1 is on 100', () => {
    const state: SnakesAndLaddersState = {
      players: { 1: 100, 2: 60 },
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
    expect(checkWin(state)).toBe(1);
  });

  it('returns 2 when player 2 is on 100', () => {
    const state: SnakesAndLaddersState = {
      players: { 1: 50, 2: 100 },
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
    expect(checkWin(state)).toBe(2);
  });
});

describe('getSquareEntity', () => {
  const state: SnakesAndLaddersState = {
    players: { 1: 1, 2: 1 },
    snakes: { 50: 10 },
    ladders: { 5: 30 },
    lastRoll: null,
    moveNumber: 0,
    powerups: {},
    powerupRespawns: [],
    lastMoveEvents: [],
    skipNextTurn: null,
    shielded: null,
    doubleDice: null,
  };

  it('returns snake info for a snake head', () => {
    expect(getSquareEntity(state, 50)).toEqual({ type: 'snake', destination: 10 });
  });

  it('returns ladder info for a ladder bottom', () => {
    expect(getSquareEntity(state, 5)).toEqual({ type: 'ladder', destination: 30 });
  });

  it('returns null for empty square', () => {
    expect(getSquareEntity(state, 25)).toBeNull();
  });
});

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
    const powerupCount = Object.keys(result.powerups).length;
    expect(powerupCount).toBe(1);
    expect(result.powerupRespawns.length).toBe(1);
  });
});

import type { Player, SnakesAndLaddersState, PowerupType, MoveEvent } from './types';

const MAX_ATTEMPTS = 100;

export const POWERUP_TYPES: PowerupType[] = [
  'double_dice', 'shield', 'reverse', 'teleport',
  'freeze', 'swap', 'earthquake', 'magnet',
  'lucky_seven', 'sniper', 'clone', 'gravity',
];

const INITIAL_POWERUP_COUNT = 11;

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

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
    luckySeven: null,
    lastPowerupType: null,
  };

  baseState.powerups = spawnPowerups(baseState, INITIAL_POWERUP_COUNT);
  return baseState;
}

export function rollDice(): number {
  return Math.floor(Math.random() * 6) + 1;
}

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
    lastMoveEvents: [event],
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
      const invalidTiles = Object.keys(newState.powerups).map(Number).filter(
        t => newState.snakes[t] !== undefined || newState.ladders[t] !== undefined
      );
      for (const t of invalidTiles) {
        const removedType = newState.powerups[t];
        delete newState.powerups[t];
        newState.powerupRespawns = [...newState.powerupRespawns, { turnsLeft: 2, type: removedType }];
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
    case 'lucky_seven':
      newState = { ...newState, luckySeven: { player } };
      effect = 'Your next roll will be lucky 7!';
      break;
    case 'sniper': {
      const snakeHeads = Object.keys(newState.snakes).map(Number).sort((a, b) => b - a);
      if (snakeHeads.length > 0) {
        const targetHead = snakeHeads[0];
        const targetTail = newState.snakes[targetHead];
        newState = { ...newState, players: { ...newState.players, [otherPlayer]: targetTail } };
        effect = `Sniped opponent onto snake! Sent to tile ${targetTail}!`;
      } else {
        const amount = randomInt(8, 15);
        const opponentPos = Math.max(1, newState.players[otherPlayer] - amount);
        newState = { ...newState, players: { ...newState.players, [otherPlayer]: opponentPos } };
        effect = `No snakes to target — opponent sent back ${amount}!`;
      }
      break;
    }
    case 'clone': {
      const lastPowerup = newState.lastPowerupType;
      if (lastPowerup && lastPowerup.player === player && lastPowerup.type !== 'clone') {
        // Re-apply the last powerup this player triggered
        const cloneResult = applyPowerup(
          { ...newState, powerups: { ...newState.powerups, [position]: lastPowerup.type } },
          player,
          position,
          depth + 1
        );
        effect = `Cloned ${lastPowerup.type.replace('_', ' ')}!`;
        return {
          state: cloneResult.state,
          position: cloneResult.position,
          events: [{ tile: position, type, effect }, ...cloneResult.events],
        };
      } else {
        // No previous powerup to clone — grant a small forward boost
        newPosition = Math.min(100, position + 3);
        effect = 'Nothing to clone — moved forward 3!';
      }
      break;
    }
    case 'gravity': {
      const opponentPos = newState.players[otherPlayer];
      const snakeTails = Object.values(newState.snakes).map(Number).filter(t => t < opponentPos).sort((a, b) => b - a);
      if (snakeTails.length > 0) {
        const targetTail = snakeTails[0];
        newState = { ...newState, players: { ...newState.players, [otherPlayer]: targetTail } };
        effect = `Gravity pulled opponent down to tile ${targetTail}!`;
      } else {
        const amount = randomInt(5, 10);
        const newOpponentPos = Math.max(1, opponentPos - amount);
        newState = { ...newState, players: { ...newState.players, [otherPlayer]: newOpponentPos } };
        effect = `No snake tail below opponent — dragged back ${amount}!`;
      }
      break;
    }
  }

  const events = [{ tile: position, type, effect }];

  // Track the last powerup activated by this player (for clone)
  newState = { ...newState, lastPowerupType: { player, type } };

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

  let newDoubleDice = state.doubleDice;
  if (state.doubleDice && state.doubleDice.player === player) {
    effectiveRoll = roll * 2;
    newDoubleDice = null;
  }

  let newLuckySeven = state.luckySeven;
  if (state.luckySeven && state.luckySeven.player === player) {
    effectiveRoll = 7;
    newLuckySeven = null;
  }

  let workingState: SnakesAndLaddersState = { ...state, doubleDice: newDoubleDice, luckySeven: newLuckySeven };

  let newPosition = workingState.players[player] + effectiveRoll;
  if (newPosition > 100) {
    newPosition = 200 - newPosition;
  }

  const powerupResult = applyPowerup(workingState, player, newPosition, 0);
  workingState = powerupResult.state;
  newPosition = powerupResult.position;
  const powerupEvents = powerupResult.events;

  workingState = { ...workingState, players: { ...workingState.players, [player]: newPosition } };

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
    lastMoveEvents: [event],
  };
}

export function checkWin(state: SnakesAndLaddersState): Player | null {
  if (state.players[1] === 100) return 1;
  if (state.players[2] === 100) return 2;
  return null;
}

export function getSquareEntity(
  state: SnakesAndLaddersState,
  square: number
): { type: 'snake' | 'ladder'; destination: number } | null {
  if (state.snakes[square] !== undefined) {
    return { type: 'snake', destination: state.snakes[square] };
  }
  if (state.ladders[square] !== undefined) {
    return { type: 'ladder', destination: state.ladders[square] };
  }
  return null;
}

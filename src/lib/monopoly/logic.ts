import { Player } from '../types';
import {
  MonopolyBoard, PlayerState, PropertyOwnership, MonopolyPhase, LastRoll,
  MAX_TURNS, STARTING_CASH, GO_SALARY, JAIL_FEE, MAX_JAIL_TURNS,
  HOUSE_VALUE, HOTEL_VALUE, ColorGroup,
} from './types';
import { BOARD, getPropertiesInGroup, getRailroadIndices, getUtilityIndices } from './board-data';

export function createInitialBoard(startingPlayer: Player = 1): MonopolyBoard {
  return {
    players: [
      { position: 0, cash: STARTING_CASH, inJail: false, jailTurns: 0 },
      { position: 0, cash: STARTING_CASH, inJail: false, jailTurns: 0 },
    ],
    properties: {},
    currentTurn: 1,
    turnSequence: 0,
    activePlayer: startingPlayer,
    phase: 'roll',
    lastRoll: null,
    doublesCount: 0,
    winner: null,
    finalNetWorth: undefined,
  };
}

export function rollDice(): [number, number] {
  return [
    Math.floor(Math.random() * 6) + 1,
    Math.floor(Math.random() * 6) + 1,
  ];
}

export function isDoubles(dice: [number, number]): boolean {
  return dice[0] === dice[1];
}

export function playerIdx(player: Player): 0 | 1 {
  return (player - 1) as 0 | 1;
}

export function getPlayerState(board: MonopolyBoard, player: Player): PlayerState {
  return board.players[playerIdx(player)];
}

export function updatePlayerState(board: MonopolyBoard, player: Player, updates: Partial<PlayerState>): MonopolyBoard {
  const players = [...board.players] as [PlayerState, PlayerState];
  players[playerIdx(player)] = { ...players[playerIdx(player)], ...updates };
  return { ...board, players };
}

export function movePlayer(board: MonopolyBoard, player: Player, dice: [number, number]): { board: MonopolyBoard; passedGo: boolean } {
  const state = getPlayerState(board, player);
  const from = state.position;
  const spaces = dice[0] + dice[1];
  const to = (from + spaces) % 40;
  const passedGo = to < from && to !== 0;

  let updatedBoard = updatePlayerState(board, player, { position: to });
  if (passedGo || to === 0) {
    const currentCash = getPlayerState(updatedBoard, player).cash;
    updatedBoard = updatePlayerState(updatedBoard, player, { cash: currentCash + GO_SALARY });
  }

  updatedBoard = {
    ...updatedBoard,
    lastRoll: { dice, from, to },
  };

  return { board: updatedBoard, passedGo };
}

export function sendToJail(board: MonopolyBoard, player: Player): MonopolyBoard {
  let updated = updatePlayerState(board, player, { position: 10, inJail: true, jailTurns: 0 });
  updated = { ...updated, doublesCount: 0, phase: 'end-turn' };
  return updated;
}

export function countOwnedRailroads(board: MonopolyBoard, player: Player): number {
  return getRailroadIndices().filter(i => board.properties[i]?.owner === player).length;
}

export function countOwnedUtilities(board: MonopolyBoard, player: Player): number {
  return getUtilityIndices().filter(i => board.properties[i]?.owner === player).length;
}

export function ownsFullGroup(board: MonopolyBoard, player: Player, color: ColorGroup): boolean {
  const indices = getPropertiesInGroup(color);
  return indices.every(i => board.properties[i]?.owner === player);
}

export function calculateRent(board: MonopolyBoard, spaceIndex: number, diceTotal: number): number {
  const space = BOARD[spaceIndex];
  const ownership = board.properties[spaceIndex];
  if (!space || !ownership) return 0;

  const owner = ownership.owner;

  if (space.type === 'railroad') {
    const count = countOwnedRailroads(board, owner);
    return space.rent[count - 1] ?? 0;
  }

  if (space.type === 'utility') {
    const count = countOwnedUtilities(board, owner);
    const multiplier = space.rent[count - 1] ?? 4;
    return diceTotal * multiplier;
  }

  if (space.type === 'property') {
    const houses = ownership.houses;
    if (houses > 0) {
      return space.rent[houses] ?? 0;
    }
    const baseRent = space.rent[0] ?? 0;
    if (space.color && ownsFullGroup(board, owner, space.color)) {
      return baseRent * 2;
    }
    return baseRent;
  }

  return 0;
}

export function resolveLanding(board: MonopolyBoard, player: Player): { board: MonopolyBoard; phase: MonopolyPhase } {
  const state = getPlayerState(board, player);
  const space = BOARD[state.position];

  if (!space) return { board, phase: 'end-turn' };

  switch (space.type) {
    case 'corner': {
      if (space.cornerType === 'go-to-jail') {
        return { board: sendToJail(board, player), phase: 'end-turn' };
      }
      return { board, phase: 'end-turn' };
    }

    case 'tax': {
      const taxAmount = space.taxAmount ?? 0;
      const newCash = state.cash - taxAmount;
      if (newCash < 0) {
        const opponent: Player = player === 1 ? 2 : 1;
        const updated = updatePlayerState(board, player, { cash: newCash });
        const finalNetWorth = calculateNetWorth(updated);
        return { board: { ...updated, winner: opponent, phase: 'game-over', finalNetWorth }, phase: 'game-over' };
      }
      const updated = updatePlayerState(board, player, { cash: newCash });
      return { board: updated, phase: 'end-turn' };
    }

    case 'property':
    case 'railroad':
    case 'utility': {
      const ownership = board.properties[state.position];
      if (!ownership) {
        if (space.price && state.cash >= space.price) {
          return { board, phase: 'buy-decision' };
        }
        return { board, phase: 'end-turn' };
      }
      if (ownership.owner === player) {
        return { board, phase: 'end-turn' };
      }
      // Pay rent to opponent
      const diceTotal = board.lastRoll ? board.lastRoll.dice[0] + board.lastRoll.dice[1] : 0;
      const rent = calculateRent(board, state.position, diceTotal);
      const newCash = state.cash - rent;
      if (newCash < 0) {
        const opponent: Player = player === 1 ? 2 : 1;
        const updated = updatePlayerState(board, player, { cash: newCash });
        const finalNetWorth = calculateNetWorth(updated);
        return { board: { ...updated, winner: opponent, phase: 'game-over', finalNetWorth }, phase: 'game-over' };
      }
      let updated = updatePlayerState(board, player, { cash: newCash });
      const opponent: Player = player === 1 ? 2 : 1;
      const opponentCash = getPlayerState(updated, opponent).cash;
      updated = updatePlayerState(updated, opponent, { cash: opponentCash + rent });
      return { board: updated, phase: 'end-turn' };
    }

    default:
      return { board, phase: 'end-turn' };
  }
}

export function buyProperty(board: MonopolyBoard, player: Player): MonopolyBoard {
  const state = getPlayerState(board, player);
  const space = BOARD[state.position];
  if (!space || !space.price) return board;

  const newProperties = { ...board.properties, [state.position]: { owner: player, houses: 0 } };
  const updated = updatePlayerState(board, player, { cash: state.cash - space.price });
  return { ...updated, properties: newProperties };
}

export function canBuildOnProperty(board: MonopolyBoard, player: Player, spaceIndex: number): boolean {
  const space = BOARD[spaceIndex];
  if (!space || space.type !== 'property' || !space.color) return false;

  const ownership = board.properties[spaceIndex];
  if (!ownership || ownership.owner !== player) return false;
  if (ownership.houses >= 5) return false;

  if (!ownsFullGroup(board, player, space.color)) return false;

  // Check even building: can't be more than 1 house ahead of lowest in group
  const groupIndices = getPropertiesInGroup(space.color);
  const minHouses = Math.min(...groupIndices.map(i => board.properties[i]?.houses ?? 0));
  if (ownership.houses > minHouses) return false;

  // Check affordability
  const cost = space.housePrice ?? 0;
  const state = getPlayerState(board, player);
  if (state.cash < cost) return false;

  return true;
}

export function buildHouse(board: MonopolyBoard, player: Player, spaceIndex: number): MonopolyBoard {
  if (!canBuildOnProperty(board, player, spaceIndex)) return board;

  const space = BOARD[spaceIndex];
  const cost = space.housePrice ?? 0;
  const ownership = board.properties[spaceIndex];

  const newProperties = {
    ...board.properties,
    [spaceIndex]: { ...ownership, houses: ownership.houses + 1 },
  };
  const updated = updatePlayerState(board, player, {
    cash: getPlayerState(board, player).cash - cost,
  });
  return { ...updated, properties: newProperties };
}

export function getBuildableProperties(board: MonopolyBoard, player: Player): number[] {
  return Object.keys(board.properties)
    .map(Number)
    .filter(i => canBuildOnProperty(board, player, i));
}

export function endTurn(board: MonopolyBoard): MonopolyBoard {
  const player = board.activePlayer;
  const lastRoll = board.lastRoll;
  const wasDoubles = lastRoll ? isDoubles(lastRoll.dice) : false;

  // Doubles: roll again (unless in jail or sent to jail)
  if (wasDoubles && !getPlayerState(board, player).inJail && board.doublesCount < 3) {
    return { ...board, phase: 'roll', turnSequence: board.turnSequence + 1 };
  }

  // Switch to other player
  const nextPlayer: Player = player === 1 ? 2 : 1;
  const newTurn = board.currentTurn + 1;

  if (newTurn > MAX_TURNS) {
    const netWorth = calculateNetWorth(board);
    const winner: Player | null = netWorth[0] > netWorth[1] ? 1 : netWorth[1] > netWorth[0] ? 2 : null;
    return {
      ...board,
      currentTurn: newTurn,
      winner,
      finalNetWorth: netWorth,
      phase: 'game-over',
      turnSequence: board.turnSequence + 1,
    };
  }

  const nextPhase: MonopolyPhase = getPlayerState(board, nextPlayer).inJail ? 'jail-decision' : 'roll';

  return {
    ...board,
    activePlayer: nextPlayer,
    currentTurn: newTurn,
    doublesCount: 0,
    lastRoll: null,
    phase: nextPhase,
    turnSequence: board.turnSequence + 1,
  };
}

export function jailPayFee(board: MonopolyBoard, player: Player): MonopolyBoard {
  const state = getPlayerState(board, player);
  const newCash = state.cash - JAIL_FEE;
  if (newCash < 0) {
    const opponent: Player = player === 1 ? 2 : 1;
    const updated = updatePlayerState(board, player, { cash: newCash, inJail: false, jailTurns: 0 });
    const finalNetWorth = calculateNetWorth(updated);
    return { ...updated, winner: opponent, phase: 'game-over', finalNetWorth };
  }
  const updated = updatePlayerState(board, player, { cash: newCash, inJail: false, jailTurns: 0 });
  return { ...updated, phase: 'roll' };
}

export function jailRollForDoubles(board: MonopolyBoard, player: Player, dice: [number, number]): MonopolyBoard {
  if (isDoubles(dice)) {
    let updated = updatePlayerState(board, player, { inJail: false, jailTurns: 0 });
    const moveResult = movePlayer(updated, player, dice);
    updated = { ...moveResult.board, doublesCount: 0 };
    const landing = resolveLanding(updated, player);
    return { ...landing.board, phase: landing.phase, turnSequence: board.turnSequence + 1 };
  }

  const state = getPlayerState(board, player);
  const newJailTurns = state.jailTurns + 1;

  if (newJailTurns >= MAX_JAIL_TURNS) {
    // Forced to pay
    return jailPayFee({ ...board, lastRoll: { dice, from: 10, to: 10 }, turnSequence: board.turnSequence + 1 }, player);
  }

  const updated = updatePlayerState(board, player, { jailTurns: newJailTurns });
  return { ...updated, lastRoll: { dice, from: 10, to: 10 }, phase: 'end-turn', turnSequence: board.turnSequence + 1 };
}

export function calculateNetWorth(board: MonopolyBoard): [number, number] {
  const worth: [number, number] = [
    board.players[0].cash,
    board.players[1].cash,
  ];

  for (const [indexStr, prop] of Object.entries(board.properties)) {
    const spaceIndex = Number(indexStr);
    const space = BOARD[spaceIndex];
    if (!space) continue;

    const idx = playerIdx(prop.owner);
    worth[idx] += space.price ?? 0;

    if (prop.houses > 0 && prop.houses <= 4) {
      worth[idx] += prop.houses * HOUSE_VALUE;
    } else if (prop.houses === 5) {
      worth[idx] += 4 * HOUSE_VALUE + HOTEL_VALUE;
    }
  }

  return worth;
}

export function forfeit(board: MonopolyBoard, player: Player): MonopolyBoard {
  const opponent: Player = player === 1 ? 2 : 1;
  const finalNetWorth = calculateNetWorth(board);
  return { ...board, winner: opponent, phase: 'game-over', finalNetWorth };
}

export function performRoll(board: MonopolyBoard, player: Player, dice: [number, number]): MonopolyBoard {
  const newDoublesCount = isDoubles(dice) ? board.doublesCount + 1 : 0;

  // 3 doubles = go to jail
  if (newDoublesCount >= 3) {
    const updated = { ...board, doublesCount: newDoublesCount, turnSequence: board.turnSequence + 1 };
    return sendToJail(updated, player);
  }

  const moveResult = movePlayer(board, player, dice);
  let updated = { ...moveResult.board, doublesCount: newDoublesCount, turnSequence: board.turnSequence + 1 };

  const landing = resolveLanding(updated, player);
  return { ...landing.board, phase: landing.phase };
}

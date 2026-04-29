import { describe, test, expect } from 'vitest';
import {
  createInitialBoard, rollDice, isDoubles, movePlayer, sendToJail,
  calculateRent, resolveLanding, buyProperty, endTurn, buildHouse,
  canBuildOnProperty, getBuildableProperties, jailPayFee, jailRollForDoubles,
  calculateNetWorth, performRoll, playerIdx, getPlayerState, ownsFullGroup,
} from './logic';
import { MonopolyBoard, STARTING_CASH, GO_SALARY, JAIL_FEE, MAX_TURNS, HOUSE_VALUE, HOTEL_VALUE } from './types';
import { BOARD } from './board-data';

describe('createInitialBoard', () => {
  test('creates board with correct initial state', () => {
    const board = createInitialBoard();
    expect(board.players[0].cash).toBe(STARTING_CASH);
    expect(board.players[1].cash).toBe(STARTING_CASH);
    expect(board.players[0].position).toBe(0);
    expect(board.players[1].position).toBe(0);
    expect(board.activePlayer).toBe(1);
    expect(board.phase).toBe('roll');
    expect(board.currentTurn).toBe(1);
    expect(board.turnSequence).toBe(0);
    expect(board.winner).toBeNull();
  });
});

describe('rollDice', () => {
  test('returns two numbers between 1 and 6', () => {
    for (let i = 0; i < 100; i++) {
      const [a, b] = rollDice();
      expect(a).toBeGreaterThanOrEqual(1);
      expect(a).toBeLessThanOrEqual(6);
      expect(b).toBeGreaterThanOrEqual(1);
      expect(b).toBeLessThanOrEqual(6);
    }
  });
});

describe('isDoubles', () => {
  test('returns true for matching dice', () => {
    expect(isDoubles([3, 3])).toBe(true);
  });
  test('returns false for non-matching dice', () => {
    expect(isDoubles([3, 4])).toBe(false);
  });
});

describe('movePlayer', () => {
  test('moves player forward', () => {
    const board = createInitialBoard();
    const { board: updated } = movePlayer(board, 1, [3, 4]);
    expect(getPlayerState(updated, 1).position).toBe(7);
  });

  test('wraps around and collects GO salary', () => {
    let board = createInitialBoard();
    board = { ...board, players: [{ ...board.players[0], position: 38 }, board.players[1]] };
    const { board: updated, passedGo } = movePlayer(board, 1, [3, 4]);
    expect(getPlayerState(updated, 1).position).toBe(5);
    expect(passedGo).toBe(true);
    expect(getPlayerState(updated, 1).cash).toBe(STARTING_CASH + GO_SALARY);
  });
});

describe('sendToJail', () => {
  test('sends player to position 10 and marks as in jail', () => {
    let board = createInitialBoard();
    board = { ...board, players: [{ ...board.players[0], position: 30 }, board.players[1]] };
    const updated = sendToJail(board, 1);
    expect(getPlayerState(updated, 1).position).toBe(10);
    expect(getPlayerState(updated, 1).inJail).toBe(true);
    expect(updated.phase).toBe('end-turn');
  });
});

describe('calculateRent', () => {
  test('returns base rent for unimproved property', () => {
    let board = createInitialBoard();
    board = { ...board, properties: { 1: { owner: 2, houses: 0 } } };
    const rent = calculateRent(board, 1, 7);
    expect(rent).toBe(2); // East Hastings base rent
  });

  test('returns double rent for full color group', () => {
    let board = createInitialBoard();
    board = { ...board, properties: { 1: { owner: 2, houses: 0 }, 3: { owner: 2, houses: 0 } } };
    const rent = calculateRent(board, 1, 7);
    expect(rent).toBe(4); // 2 * 2 = doubled base rent
  });

  test('returns house rent', () => {
    let board = createInitialBoard();
    board = { ...board, properties: { 1: { owner: 2, houses: 2 }, 3: { owner: 2, houses: 2 } } };
    const rent = calculateRent(board, 1, 7);
    expect(rent).toBe(30); // East Hastings with 2 houses
  });

  test('railroad rent scales with count', () => {
    let board = createInitialBoard();
    board = { ...board, properties: { 5: { owner: 1, houses: 0 }, 15: { owner: 1, houses: 0 } } };
    expect(calculateRent(board, 5, 7)).toBe(50); // 2 railroads owned
  });

  test('utility rent uses dice total', () => {
    let board = createInitialBoard();
    board = { ...board, properties: { 12: { owner: 1, houses: 0 } } };
    expect(calculateRent(board, 12, 8)).toBe(32); // 8 * 4
  });
});

describe('buyProperty', () => {
  test('deducts price and assigns ownership', () => {
    let board = createInitialBoard();
    board = { ...board, players: [{ ...board.players[0], position: 1 }, board.players[1]] };
    const updated = buyProperty(board, 1);
    expect(getPlayerState(updated, 1).cash).toBe(STARTING_CASH - 60);
    expect(updated.properties[1]).toEqual({ owner: 1, houses: 0 });
  });
});

describe('buildHouse', () => {
  test('builds a house when owning full group', () => {
    let board = createInitialBoard();
    board = { ...board, properties: { 1: { owner: 1, houses: 0 }, 3: { owner: 1, houses: 0 } } };
    const updated = buildHouse(board, 1, 1);
    expect(updated.properties[1].houses).toBe(1);
    expect(getPlayerState(updated, 1).cash).toBe(STARTING_CASH - 50);
  });

  test('enforces even building', () => {
    let board = createInitialBoard();
    board = { ...board, properties: { 1: { owner: 1, houses: 1 }, 3: { owner: 1, houses: 0 } } };
    expect(canBuildOnProperty(board, 1, 1)).toBe(false);
    expect(canBuildOnProperty(board, 1, 3)).toBe(true);
  });
});

describe('endTurn', () => {
  test('switches to other player', () => {
    let board = createInitialBoard();
    board = { ...board, lastRoll: { dice: [3, 4], from: 0, to: 7 } };
    const updated = endTurn(board);
    expect(updated.activePlayer).toBe(2);
    expect(updated.currentTurn).toBe(2);
    expect(updated.phase).toBe('roll');
  });

  test('keeps same player on doubles', () => {
    let board = createInitialBoard();
    board = { ...board, lastRoll: { dice: [3, 3], from: 0, to: 6 }, doublesCount: 1 };
    const updated = endTurn(board);
    expect(updated.activePlayer).toBe(1);
    expect(updated.phase).toBe('roll');
  });

  test('ends game after MAX_TURNS', () => {
    let board = createInitialBoard();
    board = { ...board, currentTurn: MAX_TURNS, lastRoll: { dice: [3, 4], from: 0, to: 7 } };
    const updated = endTurn(board);
    expect(updated.phase).toBe('game-over');
    expect(updated.finalNetWorth).toBeDefined();
  });
});

describe('jailPayFee', () => {
  test('deducts fee and frees player', () => {
    let board = createInitialBoard();
    board = { ...board, players: [{ ...board.players[0], inJail: true, jailTurns: 0 }, board.players[1]] };
    const updated = jailPayFee(board, 1);
    expect(getPlayerState(updated, 1).cash).toBe(STARTING_CASH - JAIL_FEE);
    expect(getPlayerState(updated, 1).inJail).toBe(false);
    expect(updated.phase).toBe('roll');
  });
});

describe('calculateNetWorth', () => {
  test('includes cash and property values', () => {
    let board = createInitialBoard();
    board = { ...board, properties: { 1: { owner: 1, houses: 2 }, 39: { owner: 2, houses: 0 } } };
    const [p1, p2] = calculateNetWorth(board);
    expect(p1).toBe(STARTING_CASH + 60 + 2 * HOUSE_VALUE); // cash + property price + 2 houses
    expect(p2).toBe(STARTING_CASH + 400); // cash + Shaughnessy price
  });
});

import { describe, test, expect } from 'vitest';
import {
  createInitialBoard, rollDice, isDoubles, movePlayer, sendToJail,
  calculateRent, resolveLanding, buyProperty, endTurn, buildHouse,
  canBuildOnProperty, getBuildableProperties, jailPayFee, jailRollForDoubles,
  calculateNetWorth, performRoll, playerIdx, getPlayerState, ownsFullGroup,
  applyCardEffect, drawAndApplyCard, acknowledgeCard,
} from './logic';
import { MonopolyBoard, STARTING_CASH, GO_SALARY, JAIL_FEE, MAX_TURNS, HOUSE_VALUE, HOTEL_VALUE, CardEffect } from './types';
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

  test('hotel counts as 4 houses + hotel value', () => {
    let board = createInitialBoard();
    board = { ...board, properties: { 1: { owner: 1, houses: 5 } } };
    const [p1] = calculateNetWorth(board);
    expect(p1).toBe(STARTING_CASH + 60 + 4 * HOUSE_VALUE + HOTEL_VALUE); // cash + price + 4 houses + hotel
  });
});

describe('applyCardEffect', () => {
  test('cash effect adds money', () => {
    const board = createInitialBoard();
    const effect: CardEffect = { kind: 'cash', amount: 200 };
    const result = applyCardEffect(board, 1, effect);
    expect(getPlayerState(result.board, 1).cash).toBe(STARTING_CASH + 200);
    expect(result.phase).toBe('end-turn');
  });

  test('cash effect removes money', () => {
    const board = createInitialBoard();
    const effect: CardEffect = { kind: 'cash', amount: -100 };
    const result = applyCardEffect(board, 1, effect);
    expect(getPlayerState(result.board, 1).cash).toBe(STARTING_CASH - 100);
    expect(result.phase).toBe('end-turn');
  });

  test('cash effect causes bankruptcy', () => {
    let board = createInitialBoard();
    board = { ...board, players: [{ ...board.players[0], cash: 50 }, board.players[1]] };
    const effect: CardEffect = { kind: 'cash', amount: -100 };
    const result = applyCardEffect(board, 1, effect);
    expect(getPlayerState(result.board, 1).cash).toBe(-50);
    expect(result.phase).toBe('game-over');
    expect(result.board.winner).toBe(2);
  });

  test('move-to moves player and collects GO if passing', () => {
    let board = createInitialBoard();
    board = { ...board, players: [{ ...board.players[0], position: 30 }, board.players[1]] };
    const effect: CardEffect = { kind: 'move-to', position: 0, collectGo: true };
    const result = applyCardEffect(board, 1, effect);
    expect(getPlayerState(result.board, 1).position).toBe(0);
    expect(getPlayerState(result.board, 1).cash).toBe(STARTING_CASH + GO_SALARY);
  });

  test('move-to lands on unowned property gives buy-decision', () => {
    let board = createInitialBoard();
    board = { ...board, players: [{ ...board.players[0], position: 10 }, board.players[1]] };
    const effect: CardEffect = { kind: 'move-to', position: 21, collectGo: true };
    const result = applyCardEffect(board, 1, effect);
    expect(getPlayerState(result.board, 1).position).toBe(21);
    expect(result.phase).toBe('buy-decision');
  });

  test('move-to lands on owned property pays rent', () => {
    let board = createInitialBoard();
    board = {
      ...board,
      players: [{ ...board.players[0], position: 10 }, board.players[1]],
      properties: { 21: { owner: 2, houses: 0 } },
      lastRoll: { dice: [3, 4], from: 0, to: 7 },
    };
    const effect: CardEffect = { kind: 'move-to', position: 21, collectGo: true };
    const result = applyCardEffect(board, 1, effect);
    expect(getPlayerState(result.board, 1).cash).toBe(STARTING_CASH - 18); // Robson Street base rent
    expect(getPlayerState(result.board, 2).cash).toBe(STARTING_CASH + 18);
    expect(result.phase).toBe('end-turn');
  });

  test('go-to-jail sends to jail', () => {
    const board = createInitialBoard();
    const effect: CardEffect = { kind: 'go-to-jail' };
    const result = applyCardEffect(board, 1, effect);
    expect(getPlayerState(result.board, 1).position).toBe(10);
    expect(getPlayerState(result.board, 1).inJail).toBe(true);
    expect(result.phase).toBe('end-turn');
  });

  test('advance-to-nearest-railroad finds correct railroad', () => {
    let board = createInitialBoard();
    // Player at position 7 (Chance), nearest railroad is 15 (Commercial-Broadway)
    board = { ...board, players: [{ ...board.players[0], position: 7 }, board.players[1]] };
    const effect: CardEffect = { kind: 'advance-to-nearest-railroad' };
    const result = applyCardEffect(board, 1, effect);
    expect(getPlayerState(result.board, 1).position).toBe(15);
    expect(result.phase).toBe('buy-decision');
  });

  test('advance-to-nearest-railroad wraps around board', () => {
    let board = createInitialBoard();
    // Player at position 36 (Chance), nearest railroad wraps to 5 (Waterfront Station)
    board = { ...board, players: [{ ...board.players[0], position: 36 }, board.players[1]] };
    const effect: CardEffect = { kind: 'advance-to-nearest-railroad' };
    const result = applyCardEffect(board, 1, effect);
    expect(getPlayerState(result.board, 1).position).toBe(5);
    // Should collect GO since wrapping past
    expect(getPlayerState(result.board, 1).cash).toBe(STARTING_CASH + GO_SALARY);
    expect(result.phase).toBe('buy-decision');
  });

  test('advance-to-nearest-railroad pays double rent if owned', () => {
    let board = createInitialBoard();
    board = {
      ...board,
      players: [{ ...board.players[0], position: 7 }, board.players[1]],
      properties: { 15: { owner: 2, houses: 0 } },
      lastRoll: { dice: [3, 4], from: 0, to: 7 },
    };
    const effect: CardEffect = { kind: 'advance-to-nearest-railroad' };
    const result = applyCardEffect(board, 1, effect);
    // 1 railroad owned by opponent, base rent $25, doubled = $50
    expect(getPlayerState(result.board, 1).cash).toBe(STARTING_CASH - 50);
    expect(getPlayerState(result.board, 2).cash).toBe(STARTING_CASH + 50);
    expect(result.phase).toBe('end-turn');
  });

  test('advance-to-nearest-utility finds correct utility', () => {
    let board = createInitialBoard();
    // Player at position 7, nearest utility is 12 (BC Hydro)
    board = { ...board, players: [{ ...board.players[0], position: 7 }, board.players[1]] };
    const effect: CardEffect = { kind: 'advance-to-nearest-utility' };
    const result = applyCardEffect(board, 1, effect);
    expect(getPlayerState(result.board, 1).position).toBe(12);
    expect(result.phase).toBe('buy-decision');
  });

  test('advance-to-nearest-utility pays 10x dice if owned', () => {
    let board = createInitialBoard();
    board = {
      ...board,
      players: [{ ...board.players[0], position: 7 }, board.players[1]],
      properties: { 12: { owner: 2, houses: 0 } },
      lastRoll: { dice: [3, 4], from: 0, to: 7 },
    };
    const effect: CardEffect = { kind: 'advance-to-nearest-utility' };
    const result = applyCardEffect(board, 1, effect);
    // 10x dice total = 10 * 7 = 70
    expect(getPlayerState(result.board, 1).cash).toBe(STARTING_CASH - 70);
    expect(getPlayerState(result.board, 2).cash).toBe(STARTING_CASH + 70);
    expect(result.phase).toBe('end-turn');
  });

  test('move-back moves player backward', () => {
    let board = createInitialBoard();
    // Player at position 7 (Chance), go back 3 = position 4 (Income Tax)
    board = { ...board, players: [{ ...board.players[0], position: 7 }, board.players[1]] };
    const effect: CardEffect = { kind: 'move-back', spaces: 3 };
    const result = applyCardEffect(board, 1, effect);
    expect(getPlayerState(result.board, 1).position).toBe(4);
    // Income Tax costs $200
    expect(getPlayerState(result.board, 1).cash).toBe(STARTING_CASH - 200);
    expect(result.phase).toBe('end-turn');
  });

  test('move-back wraps around from low position', () => {
    let board = createInitialBoard();
    // Player at position 1, go back 3 = position 38 (Luxury Tax)
    board = { ...board, players: [{ ...board.players[0], position: 1 }, board.players[1]] };
    const effect: CardEffect = { kind: 'move-back', spaces: 3 };
    const result = applyCardEffect(board, 1, effect);
    expect(getPlayerState(result.board, 1).position).toBe(38);
    // Luxury Tax costs $100
    expect(getPlayerState(result.board, 1).cash).toBe(STARTING_CASH - 100);
    expect(result.phase).toBe('end-turn');
  });

  test('collect-from-opponent transfers money', () => {
    const board = createInitialBoard();
    const effect: CardEffect = { kind: 'collect-from-opponent', amount: 50 };
    const result = applyCardEffect(board, 1, effect);
    expect(getPlayerState(result.board, 1).cash).toBe(STARTING_CASH + 50);
    expect(getPlayerState(result.board, 2).cash).toBe(STARTING_CASH - 50);
    expect(result.phase).toBe('end-turn');
  });

  test('collect-from-opponent can bankrupt opponent', () => {
    let board = createInitialBoard();
    board = { ...board, players: [board.players[0], { ...board.players[1], cash: 30 }] };
    const effect: CardEffect = { kind: 'collect-from-opponent', amount: 50 };
    const result = applyCardEffect(board, 1, effect);
    expect(getPlayerState(result.board, 2).cash).toBe(-20);
    expect(result.phase).toBe('game-over');
    expect(result.board.winner).toBe(1); // Opponent bankrupted, current player wins
  });

  test('repairs charges per house and hotel', () => {
    let board = createInitialBoard();
    board = {
      ...board,
      properties: {
        1: { owner: 1, houses: 2 },
        3: { owner: 1, houses: 5 }, // hotel
        11: { owner: 1, houses: 1 },
      },
    };
    const effect: CardEffect = { kind: 'repairs', perHouse: 40, perHotel: 115 };
    const result = applyCardEffect(board, 1, effect);
    // 3 houses (2 + 1) * 40 + 1 hotel * 115 = 120 + 115 = 235
    expect(getPlayerState(result.board, 1).cash).toBe(STARTING_CASH - 235);
    expect(result.phase).toBe('end-turn');
  });

  test('repairs with no properties costs nothing', () => {
    const board = createInitialBoard();
    const effect: CardEffect = { kind: 'repairs', perHouse: 40, perHotel: 115 };
    const result = applyCardEffect(board, 1, effect);
    expect(getPlayerState(result.board, 1).cash).toBe(STARTING_CASH);
    expect(result.phase).toBe('end-turn');
  });
});

describe('drawAndApplyCard', () => {
  test('returns card-drawn phase with card text', () => {
    const board = createInitialBoard();
    const result = drawAndApplyCard(board, 1, 'community-chest');
    expect(result.phase).toBe('card-drawn');
    expect(result.board.drawnCard).not.toBeNull();
    expect(result.board.drawnCard!.cardType).toBe('community-chest');
    expect(result.board.drawnCard!.text).toBeTruthy();
  });

  test('chance cards also work', () => {
    const board = createInitialBoard();
    const result = drawAndApplyCard(board, 1, 'chance');
    expect(result.board.drawnCard!.cardType).toBe('chance');
  });
});

describe('acknowledgeCard', () => {
  test('clears drawnCard and sets nextPhase', () => {
    let board = createInitialBoard();
    board = {
      ...board,
      drawnCard: { cardType: 'community-chest', text: 'Test', nextPhase: 'end-turn' },
      phase: 'card-drawn',
    };
    const result = acknowledgeCard(board);
    expect(result.drawnCard).toBeNull();
    expect(result.phase).toBe('end-turn');
  });

  test('transitions to buy-decision when card moves to unowned property', () => {
    let board = createInitialBoard();
    board = {
      ...board,
      drawnCard: { cardType: 'chance', text: 'Advance to GO', nextPhase: 'buy-decision' },
      phase: 'card-drawn',
    };
    const result = acknowledgeCard(board);
    expect(result.drawnCard).toBeNull();
    expect(result.phase).toBe('buy-decision');
  });

  test('defaults to end-turn if no drawnCard', () => {
    let board = createInitialBoard();
    board = { ...board, drawnCard: null, phase: 'card-drawn' };
    const result = acknowledgeCard(board);
    expect(result.phase).toBe('end-turn');
  });
});

describe('resolveLanding on card spaces', () => {
  test('landing on community-chest triggers card draw', () => {
    let board = createInitialBoard();
    board = { ...board, players: [{ ...board.players[0], position: 2 }, board.players[1]] };
    const result = resolveLanding(board, 1);
    // Should be card-drawn (unless the card effect causes game-over)
    expect(['card-drawn', 'game-over']).toContain(result.phase);
    if (result.phase === 'card-drawn') {
      expect(result.board.drawnCard).not.toBeNull();
      expect(result.board.drawnCard!.cardType).toBe('community-chest');
    }
  });

  test('landing on chance triggers card draw', () => {
    let board = createInitialBoard();
    board = { ...board, players: [{ ...board.players[0], position: 7 }, board.players[1]] };
    const result = resolveLanding(board, 1);
    expect(['card-drawn', 'game-over']).toContain(result.phase);
    if (result.phase === 'card-drawn') {
      expect(result.board.drawnCard).not.toBeNull();
      expect(result.board.drawnCard!.cardType).toBe('chance');
    }
  });

  test('community-chest positions are correct (2, 17, 33)', () => {
    expect(BOARD[2].type).toBe('community-chest');
    expect(BOARD[17].type).toBe('community-chest');
    expect(BOARD[33].type).toBe('community-chest');
  });

  test('chance positions are correct (7, 22, 36)', () => {
    expect(BOARD[7].type).toBe('chance');
    expect(BOARD[22].type).toBe('chance');
    expect(BOARD[36].type).toBe('chance');
  });
});

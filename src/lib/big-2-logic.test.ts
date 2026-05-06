import { describe, expect, it } from 'vitest';
import {
  canBeatCombination,
  createBigTwoBoard,
  evaluateCombination,
  getCardLabel,
  passTurn,
  playCards,
  type BigTwoCard,
} from './big-2-logic';

function card(id: string): BigTwoCard {
  const rank = id.slice(0, -1) as BigTwoCard['rank'];
  const suit = id.slice(-1) as BigTwoCard['suit'];
  return { id, rank, suit };
}

describe('big-2 logic', () => {
  it('deals 26 cards to each player and gives the first player 3D', () => {
    const board = createBigTwoBoard(1, () => 0.42);

    expect(board.hands['1']).toHaveLength(26);
    expect(board.hands['2']).toHaveLength(26);
    expect(new Set([...board.hands['1'], ...board.hands['2']].map((c) => c.id)).size).toBe(52);
    expect(board.hands['1'].some((c) => c.id === '3D')).toBe(true);
  });

  it('orders singles by Big 2 rank and then suit', () => {
    const kingSpade = evaluateCombination([card('KS')], 1)!;
    const aceDiamond = evaluateCombination([card('AD')], 2)!;
    const aceHeart = evaluateCombination([card('AH')], 1)!;
    const twoDiamond = evaluateCombination([card('2D')], 2)!;

    expect(canBeatCombination(aceDiamond, kingSpade)).toBe(true);
    expect(canBeatCombination(aceHeart, aceDiamond)).toBe(true);
    expect(canBeatCombination(twoDiamond, aceHeart)).toBe(true);
  });

  it('classifies pairs, triples, and the five-card hierarchy', () => {
    expect(evaluateCombination([card('5D'), card('5S')], 1)?.type).toBe('pair');
    expect(evaluateCombination([card('9D'), card('9C'), card('9S')], 1)?.type).toBe('triple');
    expect(evaluateCombination([card('3D'), card('4C'), card('5H'), card('6S'), card('7D')], 1)?.type).toBe('straight');
    expect(evaluateCombination([card('3S'), card('8S'), card('10S'), card('QS'), card('AS')], 1)?.type).toBe('flush');
    expect(evaluateCombination([card('KD'), card('KC'), card('KS'), card('4H'), card('4S')], 1)?.type).toBe('full-house');
    expect(evaluateCombination([card('7D'), card('7C'), card('7H'), card('7S'), card('3D')], 1)?.type).toBe('four-kind');
    expect(evaluateCombination([card('10H'), card('JH'), card('QH'), card('KH'), card('AH')], 1)?.type).toBe('straight-flush');
  });

  it('ranks 5-card hands from straight up to straight flush', () => {
    const straight = evaluateCombination([card('3D'), card('4C'), card('5H'), card('6S'), card('7D')], 1)!;
    const flush = evaluateCombination([card('3S'), card('8S'), card('10S'), card('QS'), card('AS')], 1)!;
    const fullHouse = evaluateCombination([card('KD'), card('KC'), card('KS'), card('4H'), card('4S')], 1)!;
    const fourKind = evaluateCombination([card('7D'), card('7C'), card('7H'), card('7S'), card('3D')], 1)!;
    const straightFlush = evaluateCombination([card('10H'), card('JH'), card('QH'), card('KH'), card('AH')], 1)!;

    expect(canBeatCombination(flush, straight)).toBe(true);
    expect(canBeatCombination(fullHouse, flush)).toBe(true);
    expect(canBeatCombination(fourKind, fullHouse)).toBe(true);
    expect(canBeatCombination(straightFlush, fourKind)).toBe(true);
  });

  it('requires the opening play to include 3D', () => {
    const board = createBigTwoBoard(1, () => 0.1);
    const nonOpeningCard = board.hands['1'].find((c) => c.id !== '3D')!;

    expect(() => playCards(board, 1, [nonOpeningCard.id])).toThrow('3♦');
    const result = playCards(board, 1, ['3D']);
    expect(result.board.hands['1']).toHaveLength(25);
    expect(result.winner).toBeNull();
  });

  it('clears a two-player trick after one pass and lets the last player lead', () => {
    const afterPlay = playCards(createBigTwoBoard(1, () => 0.1), 1, ['3D']).board;

    const afterPass = passTurn(afterPlay, 2);

    expect(afterPass.currentTrick.activeCombination).toBeNull();
    expect(afterPass.currentTrick.leader).toBe(1);
    expect(afterPass.discards.map(getCardLabel)).toEqual(['3♦']);
  });

  it('scores the winner from remaining cards when a player sheds their hand', () => {
    const board = {
      ...createBigTwoBoard(1, () => 0.2),
      hands: {
        '1': [card('3D')],
        '2': [card('4D'), card('4C'), card('5D')],
      },
    };

    const result = playCards(board, 1, ['3D']);

    expect(result.winner).toBe(1);
    expect(result.board.scores).toEqual({ '1': 9, '2': -9 });
  });
});

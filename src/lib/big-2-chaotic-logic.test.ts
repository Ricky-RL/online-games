import { describe, expect, it } from 'vitest';
import {
  canBeatCombination,
  createChaoticBigTwoBoard,
  evaluateCombination,
  passTurn,
  playCards,
  type ChaoticBigTwoCard,
} from './big-2-chaotic-logic';

function card(id: string): ChaoticBigTwoCard {
  const suit = id.slice(-1) as ChaoticBigTwoCard['suit'];
  const rank = id.slice(0, -1) as ChaoticBigTwoCard['rank'];
  return { id, rank, suit };
}

describe('big-2 chaotic logic', () => {
  it('deals 25 cards per player and burns 4 cards from a 54-card deck with jokers', () => {
    const board = createChaoticBigTwoBoard(1, () => 0.31);
    const allDealt = [...board.hands['1'], ...board.hands['2'], ...board.burnedCards];
    const uniqueIds = new Set(allDealt.map((c) => c.id));

    expect(board.hands['1']).toHaveLength(25);
    expect(board.hands['2']).toHaveLength(25);
    expect(board.burnedCards).toHaveLength(4);
    expect(uniqueIds.size).toBe(54);
    expect(allDealt.some((c) => c.id === 'JKB')).toBe(true);
    expect(allDealt.some((c) => c.id === 'JKR')).toBe(true);
    expect(board.hands['1'].some((c) => c.rank === 'JK')).toBe(true);
    expect(board.hands['2'].some((c) => c.rank === 'JK')).toBe(true);
    expect(board.hands['1'].some((c) => c.rank === '3' && c.suit === 'D')).toBe(true);
  });

  it('treats jokers as top singles and wildcard helpers', () => {
    const blackJoker = { id: 'JKB', rank: 'JK', suit: 'B' } as ChaoticBigTwoCard;
    const redJoker = { id: 'JKR', rank: 'JK', suit: 'R' } as ChaoticBigTwoCard;
    const twoSpades = card('2S');
    const jokerPair = evaluateCombination([card('AD'), blackJoker], 1);

    const blackSingle = evaluateCombination([blackJoker], 1);
    const redSingle = evaluateCombination([redJoker], 1);
    const twoSingle = evaluateCombination([twoSpades], 1);

    expect(jokerPair?.type).toBe('pair');
    expect(blackSingle && twoSingle && canBeatCombination(blackSingle, twoSingle)).toBe(true);
    expect(redSingle && blackSingle && canBeatCombination(redSingle, blackSingle)).toBe(true);
  });

  it('uses level wildcard (2H) to complete combinations', () => {
    const wildcardPair = evaluateCombination([card('AH'), card('2H')], 1);
    const wildcardFullHouse = evaluateCombination(
      [card('9D'), card('9C'), card('4S'), card('4D'), card('2H')],
      1
    );

    expect(wildcardPair?.type).toBe('pair');
    expect(wildcardPair?.strength[0]).toBe(11); // A pair
    expect(wildcardFullHouse?.type).toBe('full-house');
  });

  it('detects tubes and plates, including wildcard-assisted tubes', () => {
    const tube = evaluateCombination(
      [card('5D'), card('5C'), card('6D'), card('6C'), card('7D'), card('7C')],
      1
    );
    const wildcardTube = evaluateCombination(
      [card('5D'), card('5C'), card('6D'), card('6C'), card('7D'), card('2H')],
      1
    );
    const plate = evaluateCombination(
      [card('8D'), card('8C'), card('8S'), card('9D'), card('9C'), card('9S')],
      1
    );

    expect(tube?.type).toBe('tube');
    expect(wildcardTube?.type).toBe('tube');
    expect(plate?.type).toBe('plate');
  });

  it('applies bomb precedence over non-bombs and orders larger bombs higher', () => {
    const straight = evaluateCombination([card('3D'), card('4C'), card('5S'), card('6D'), card('7C')], 2)!;
    const fourKindBomb = evaluateCombination([card('9D'), card('9C'), card('9S'), card('2H')], 1)!;
    const fiveKindBomb = evaluateCombination([card('KD'), card('KC'), card('KS'), card('KH'), card('2H')], 1)!;

    expect(fourKindBomb.isBomb).toBe(true);
    expect(canBeatCombination(fourKindBomb, straight)).toBe(true);
    expect(canBeatCombination(fiveKindBomb, fourKindBomb)).toBe(true);
    expect(canBeatCombination(straight, fourKindBomb)).toBe(false);
  });

  it('enforces opening move to include a 3D and clears a two-player trick after one pass', () => {
    const board = createChaoticBigTwoBoard(1, () => 0.17);
    const openingCard = board.hands['1'].find((c) => c.rank === '3' && c.suit === 'D')!;
    const nonOpeningCard = board.hands['1'].find((c) => !(c.rank === '3' && c.suit === 'D'))!;

    expect(() => playCards(board, 1, [nonOpeningCard.id])).toThrow('opening play must include 3D');

    const afterPlay = playCards(board, 1, [openingCard.id]).board;
    const afterPass = passTurn(afterPlay, 2);

    expect(afterPlay.currentTrick.activeCombination?.type).toBe('single');
    expect(afterPass.currentTrick.activeCombination).toBeNull();
    expect(afterPass.currentTrick.leader).toBe(1);
    expect(afterPass.discards).toHaveLength(1);
  });
});

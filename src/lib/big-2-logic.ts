import type { Player } from './types';

export type BigTwoSuit = 'D' | 'C' | 'H' | 'S';
export type BigTwoRank = '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A' | '2';
export type BigTwoCombinationType = 'single' | 'pair' | 'triple' | 'straight' | 'flush' | 'full-house' | 'four-kind' | 'straight-flush';

export interface BigTwoCard {
  id: string;
  rank: BigTwoRank;
  suit: BigTwoSuit;
}

export interface BigTwoCombination {
  type: BigTwoCombinationType;
  cards: BigTwoCard[];
  size: 1 | 2 | 3 | 5;
  strength: number[];
  playedBy: Player;
}

export interface BigTwoTrickPlay {
  player: Player;
  action: 'play' | 'pass';
  cards: BigTwoCard[];
  combinationType?: BigTwoCombinationType;
}

export interface BigTwoTrickState {
  leader: Player;
  activeCombination: BigTwoCombination | null;
  lastPlayedBy: Player | null;
  passesInRow: number;
  plays: BigTwoTrickPlay[];
}

export interface BigTwoBoardState {
  hands: Record<'1' | '2', BigTwoCard[]>;
  currentTrick: BigTwoTrickState;
  discards: BigTwoCard[];
  playedCardCounts: Record<'1' | '2', number>;
  scores: Record<'1' | '2', number>;
  lastAction: string | null;
  moveCount: number;
}

const RANK_ORDER: BigTwoRank[] = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];
const SUIT_ORDER: BigTwoSuit[] = ['D', 'C', 'H', 'S'];
const FIVE_CARD_TYPE_ORDER: BigTwoCombinationType[] = ['straight', 'flush', 'full-house', 'four-kind', 'straight-flush'];
const PLAYER_COUNT = 2;

const STRAIGHT_SEQUENCES: BigTwoRank[][] = [
  ['3', '4', '5', '6', '7'],
  ['4', '5', '6', '7', '8'],
  ['5', '6', '7', '8', '9'],
  ['6', '7', '8', '9', '10'],
  ['7', '8', '9', '10', 'J'],
  ['8', '9', '10', 'J', 'Q'],
  ['9', '10', 'J', 'Q', 'K'],
  ['10', 'J', 'Q', 'K', 'A'],
  ['2', '3', '4', '5', '6'],
  ['J', 'Q', 'K', 'A', '2'],
];

function rankValue(rank: BigTwoRank): number {
  return RANK_ORDER.indexOf(rank);
}

function suitValue(suit: BigTwoSuit): number {
  return SUIT_ORDER.indexOf(suit);
}

function cardValue(card: BigTwoCard): number[] {
  return [rankValue(card.rank), suitValue(card.suit)];
}

function compareStrength(a: number[], b: number[]): number {
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i++) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

function compareCards(a: BigTwoCard, b: BigTwoCard): number {
  return compareStrength(cardValue(a), cardValue(b));
}

function otherPlayer(player: Player): Player {
  return player === 1 ? 2 : 1;
}

function playerKey(player: Player): '1' | '2' {
  return player === 1 ? '1' : '2';
}

function makeDeck(): BigTwoCard[] {
  return RANK_ORDER.flatMap((rank) =>
    SUIT_ORDER.map((suit) => ({
      id: `${rank}${suit}`,
      rank,
      suit,
    }))
  );
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function sortCards(cards: BigTwoCard[]): BigTwoCard[] {
  return [...cards].sort(compareCards);
}

function sameRanks(cards: BigTwoCard[]): boolean {
  return cards.every((card) => card.rank === cards[0].rank);
}

function rankCounts(cards: BigTwoCard[]): Map<BigTwoRank, number> {
  const counts = new Map<BigTwoRank, number>();
  for (const card of cards) {
    counts.set(card.rank, (counts.get(card.rank) ?? 0) + 1);
  }
  return counts;
}

function getStraightIndex(cards: BigTwoCard[]): number | null {
  const uniqueRanks = [...new Set(cards.map((card) => card.rank))];
  if (uniqueRanks.length !== 5) return null;
  const sorted = [...uniqueRanks].sort((a, b) => rankValue(a) - rankValue(b));
  const key = sorted.join(',');
  const index = STRAIGHT_SEQUENCES.findIndex((sequence) => [...sequence].sort((a, b) => rankValue(a) - rankValue(b)).join(',') === key);
  return index >= 0 ? index : null;
}

function highestCardOfRanks(cards: BigTwoCard[], ranks: BigTwoRank[]): BigTwoCard {
  const allowed = new Set(ranks);
  return [...cards].filter((card) => allowed.has(card.rank)).sort(compareCards).at(-1)!;
}

function evaluateFiveCardHand(cards: BigTwoCard[], player: Player): BigTwoCombination | null {
  const flush = cards.every((card) => card.suit === cards[0].suit);
  const straightIndex = getStraightIndex(cards);
  const counts = [...rankCounts(cards).entries()];
  const sortedRanks = sortCards(cards).map((card) => rankValue(card.rank)).reverse();

  if (straightIndex !== null && flush) {
    const sequence = STRAIGHT_SEQUENCES[straightIndex];
    const highCard = highestCardOfRanks(cards, sequence);
    return {
      type: 'straight-flush',
      cards: sortCards(cards),
      size: 5,
      strength: [FIVE_CARD_TYPE_ORDER.indexOf('straight-flush'), straightIndex, ...cardValue(highCard)],
      playedBy: player,
    };
  }

  const fourRank = counts.find(([, count]) => count === 4)?.[0];
  if (fourRank) {
    return {
      type: 'four-kind',
      cards: sortCards(cards),
      size: 5,
      strength: [FIVE_CARD_TYPE_ORDER.indexOf('four-kind'), rankValue(fourRank)],
      playedBy: player,
    };
  }

  const tripleRank = counts.find(([, count]) => count === 3)?.[0];
  const pairRank = counts.find(([, count]) => count === 2)?.[0];
  if (tripleRank && pairRank) {
    return {
      type: 'full-house',
      cards: sortCards(cards),
      size: 5,
      strength: [FIVE_CARD_TYPE_ORDER.indexOf('full-house'), rankValue(tripleRank)],
      playedBy: player,
    };
  }

  if (flush) {
    return {
      type: 'flush',
      cards: sortCards(cards),
      size: 5,
      strength: [FIVE_CARD_TYPE_ORDER.indexOf('flush'), suitValue(cards[0].suit), ...sortedRanks],
      playedBy: player,
    };
  }

  if (straightIndex !== null) {
    const sequence = STRAIGHT_SEQUENCES[straightIndex];
    const highCard = highestCardOfRanks(cards, sequence);
    return {
      type: 'straight',
      cards: sortCards(cards),
      size: 5,
      strength: [FIVE_CARD_TYPE_ORDER.indexOf('straight'), straightIndex, ...cardValue(highCard)],
      playedBy: player,
    };
  }

  return null;
}

export function evaluateCombination(cards: BigTwoCard[], player: Player): BigTwoCombination | null {
  const sorted = sortCards(cards);
  if (sorted.length === 1) {
    return { type: 'single', cards: sorted, size: 1, strength: cardValue(sorted[0]), playedBy: player };
  }
  if (sorted.length === 2 && sameRanks(sorted)) {
    return {
      type: 'pair',
      cards: sorted,
      size: 2,
      strength: [rankValue(sorted[0].rank), suitValue(sorted[1].suit)],
      playedBy: player,
    };
  }
  if (sorted.length === 3 && sameRanks(sorted)) {
    return { type: 'triple', cards: sorted, size: 3, strength: [rankValue(sorted[0].rank)], playedBy: player };
  }
  if (sorted.length === 5) {
    return evaluateFiveCardHand(sorted, player);
  }
  return null;
}

export function compareCombinations(a: BigTwoCombination, b: BigTwoCombination): number {
  if (a.size !== b.size) {
    throw new Error('Cannot compare combinations with different sizes');
  }
  return compareStrength(a.strength, b.strength);
}

export function canBeatCombination(candidate: BigTwoCombination, target: BigTwoCombination | null): boolean {
  if (!target) return true;
  if (candidate.size !== target.size) return false;
  return compareCombinations(candidate, target) > 0;
}

export function createBigTwoBoard(firstPlayer: Player = 1, random: () => number = Math.random): BigTwoBoardState {
  const deck = shuffle(makeDeck(), random);
  const hands: Record<'1' | '2', BigTwoCard[]> = {
    '1': deck.slice(0, 26),
    '2': deck.slice(26, 52),
  };

  const firstKey = playerKey(firstPlayer);
  const otherKey = playerKey(otherPlayer(firstPlayer));
  const threeDiamonds = hands[firstKey].find((card) => card.id === '3D');
  if (!threeDiamonds) {
    const indexInOtherHand = hands[otherKey].findIndex((card) => card.id === '3D');
    if (indexInOtherHand >= 0) {
      const swapCard = hands[firstKey][0];
      hands[firstKey][0] = hands[otherKey][indexInOtherHand];
      hands[otherKey][indexInOtherHand] = swapCard;
    }
  }

  return {
    hands: {
      '1': sortCards(hands['1']),
      '2': sortCards(hands['2']),
    },
    currentTrick: {
      leader: firstPlayer,
      activeCombination: null,
      lastPlayedBy: null,
      passesInRow: 0,
      plays: [],
    },
    discards: [],
    playedCardCounts: { '1': 0, '2': 0 },
    scores: { '1': 0, '2': 0 },
    lastAction: null,
    moveCount: 0,
  };
}

function assertPlayerOwnsCards(board: BigTwoBoardState, player: Player, cardIds: string[]): BigTwoCard[] {
  const hand = board.hands[playerKey(player)];
  const uniqueIds = new Set(cardIds);
  if (uniqueIds.size !== cardIds.length) {
    throw new Error('Select each card only once');
  }
  const selected = cardIds.map((id) => {
    const card = hand.find((candidate) => candidate.id === id);
    if (!card) throw new Error('Card is not in your hand');
    return card;
  });
  return selected;
}

function calculateScores(board: BigTwoBoardState, winner: Player): Record<'1' | '2', number> {
  const loser = otherPlayer(winner);
  const loserKey = playerKey(loser);
  const loserRemaining = board.hands[loserKey].length;
  const loserPlayed = board.playedCardCounts[loserKey] > 0;
  const penaltyPerCard = !loserPlayed ? 3 : loserRemaining >= 10 ? 2 : 1;
  const loserScore = -(loserRemaining * penaltyPerCard);
  return {
    [playerKey(winner)]: Math.abs(loserScore),
    [loserKey]: loserScore,
  } as Record<'1' | '2', number>;
}

export function playCards(board: BigTwoBoardState, player: Player, cardIds: string[]): { board: BigTwoBoardState; winner: Player | null } {
  const selected = assertPlayerOwnsCards(board, player, cardIds);
  const combination = evaluateCombination(selected, player);
  if (!combination) {
    throw new Error('That is not a valid Big 2 combination');
  }

  const activeCombination = board.currentTrick.activeCombination;
  if (!canBeatCombination(combination, activeCombination)) {
    throw new Error(activeCombination ? 'Play the same number of cards with a higher value' : 'That play is not high enough');
  }

  if (board.moveCount === 0 && !selected.some((card) => card.id === '3D')) {
    throw new Error('The opening play must include 3♦');
  }

  const key = playerKey(player);
  const remainingHand = board.hands[key].filter((card) => !cardIds.includes(card.id));
  const nextHands = {
    ...board.hands,
    [key]: sortCards(remainingHand),
  };
  const nextPlayedCardCounts = {
    ...board.playedCardCounts,
    [key]: board.playedCardCounts[key] + selected.length,
  };
  const winner = remainingHand.length === 0 ? player : null;
  const nextBoard: BigTwoBoardState = {
    ...board,
    hands: nextHands,
    currentTrick: {
      leader: board.currentTrick.leader,
      activeCombination: combination,
      lastPlayedBy: player,
      passesInRow: 0,
      plays: [
        ...board.currentTrick.plays,
        { player, action: 'play', cards: combination.cards, combinationType: combination.type },
      ],
    },
    playedCardCounts: nextPlayedCardCounts,
    scores: winner ? calculateScores({ ...board, hands: nextHands, playedCardCounts: nextPlayedCardCounts }, winner) : board.scores,
    lastAction: `Player ${player} played ${combination.type}`,
    moveCount: board.moveCount + 1,
  };

  return { board: nextBoard, winner };
}

export function passTurn(board: BigTwoBoardState, player: Player): BigTwoBoardState {
  const activeCombination = board.currentTrick.activeCombination;
  if (!activeCombination || !board.currentTrick.lastPlayedBy) {
    throw new Error('You cannot pass while leading a trick');
  }

  const passesInRow = board.currentTrick.passesInRow + 1;
  const trickFinished = passesInRow >= PLAYER_COUNT - 1;

  if (trickFinished) {
    const nextLeader = board.currentTrick.lastPlayedBy;
    return {
      ...board,
      currentTrick: {
        leader: nextLeader,
        activeCombination: null,
        lastPlayedBy: nextLeader,
        passesInRow: 0,
        plays: [],
      },
      discards: [...board.discards, ...activeCombination.cards],
      lastAction: `Player ${player} passed. Player ${nextLeader} leads the next trick.`,
      moveCount: board.moveCount + 1,
    };
  }

  return {
    ...board,
    currentTrick: {
      ...board.currentTrick,
      passesInRow,
      plays: [...board.currentTrick.plays, { player, action: 'pass', cards: [] }],
    },
    lastAction: `Player ${player} passed`,
    moveCount: board.moveCount + 1,
  };
}

export function getNextTurnAfterPlay(player: Player, winner: Player | null): Player {
  if (winner) return player;
  return otherPlayer(player);
}

export function getNextTurnAfterPass(board: BigTwoBoardState): Player {
  const activeCombination = board.currentTrick.activeCombination;
  if (!activeCombination || !board.currentTrick.lastPlayedBy) {
    throw new Error('Cannot advance turn after an invalid pass');
  }
  if (board.currentTrick.passesInRow + 1 >= PLAYER_COUNT - 1) {
    return board.currentTrick.lastPlayedBy;
  }
  return otherPlayer(activeCombination.playedBy);
}

export function describeCombination(type: BigTwoCombinationType): string {
  switch (type) {
    case 'single': return 'Single';
    case 'pair': return 'Pair';
    case 'triple': return 'Triple';
    case 'straight': return 'Straight';
    case 'flush': return 'Flush';
    case 'full-house': return 'Full house';
    case 'four-kind': return 'Four of a kind';
    case 'straight-flush': return 'Straight flush';
  }
}

export function getCardLabel(card: BigTwoCard): string {
  const suit = card.suit === 'S' ? '♠' : card.suit === 'H' ? '♥' : card.suit === 'C' ? '♣' : '♦';
  return `${card.rank}${suit}`;
}

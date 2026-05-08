import type { Player } from './types';

export type ChaoticBigTwoSuit = 'D' | 'C' | 'H' | 'S';
export type ChaoticBigTwoRank = '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A' | '2';
export type ChaoticBigTwoCombinationType =
  | 'single'
  | 'pair'
  | 'triple'
  | 'straight'
  | 'tube'
  | 'plate'
  | 'full-house'
  | 'bomb-n-kind'
  | 'bomb-straight-flush';

export interface ChaoticBigTwoCard {
  id: string;
  rank: ChaoticBigTwoRank;
  suit: ChaoticBigTwoSuit;
  deck: 1 | 2;
}

export interface ChaoticBigTwoCombination {
  type: ChaoticBigTwoCombinationType;
  cards: ChaoticBigTwoCard[];
  size: number;
  strength: number[];
  playedBy: Player;
  isBomb: boolean;
}

export interface ChaoticBigTwoTrickPlay {
  player: Player;
  action: 'play' | 'pass';
  cards: ChaoticBigTwoCard[];
  combinationType?: ChaoticBigTwoCombinationType;
}

export interface ChaoticBigTwoTrickState {
  leader: Player;
  activeCombination: ChaoticBigTwoCombination | null;
  lastPlayedBy: Player | null;
  passesInRow: number;
  plays: ChaoticBigTwoTrickPlay[];
}

export interface ChaoticBigTwoBoardState {
  ruleset?: 'chaotic';
  level: ChaoticBigTwoRank;
  hands: Record<'1' | '2', ChaoticBigTwoCard[]>;
  burnedCards: ChaoticBigTwoCard[];
  currentTrick: ChaoticBigTwoTrickState;
  discards: ChaoticBigTwoCard[];
  playedCardCounts: Record<'1' | '2', number>;
  scores: Record<'1' | '2', number>;
  lastAction: string | null;
  moveCount: number;
}

export interface CombinationValidationResult {
  valid: boolean;
  combination?: ChaoticBigTwoCombination;
  error?: string;
}

const RANK_ORDER: ChaoticBigTwoRank[] = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];
const SUIT_ORDER: ChaoticBigTwoSuit[] = ['D', 'C', 'H', 'S'];
const NON_BOMB_TYPE_ORDER: ChaoticBigTwoCombinationType[] = ['single', 'pair', 'triple', 'straight', 'tube', 'plate', 'full-house'];
const STRAIGHT_SEQUENCES: ChaoticBigTwoRank[][] = [
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
const PLAYER_COUNT = 2;
const TOTAL_CARDS = 104;
const BURNED_CARD_COUNT = TOTAL_CARDS / 4; // 26
const HAND_SIZE = (TOTAL_CARDS - BURNED_CARD_COUNT) / PLAYER_COUNT; // 39

export const CHAOTIC_COMBINATION_DISPLAY_ORDER = [
  'single',
  'pair',
  'triple',
  'straight',
  'tube',
  'plate',
  'full-house',
  'bomb-n-kind',
  'bomb-straight-flush',
];

function rankValue(rank: ChaoticBigTwoRank): number {
  return RANK_ORDER.indexOf(rank);
}

function suitValue(suit: ChaoticBigTwoSuit): number {
  return SUIT_ORDER.indexOf(suit);
}

function compareStrength(a: number[], b: number[]): number {
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i++) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

function compareCards(a: ChaoticBigTwoCard, b: ChaoticBigTwoCard): number {
  const rankDiff = rankValue(a.rank) - rankValue(b.rank);
  if (rankDiff !== 0) return rankDiff;
  const suitDiff = suitValue(a.suit) - suitValue(b.suit);
  if (suitDiff !== 0) return suitDiff;
  return a.deck - b.deck;
}

function sortCards(cards: ChaoticBigTwoCard[]): ChaoticBigTwoCard[] {
  return [...cards].sort(compareCards);
}

export function nextTurn(player: Player): Player {
  return player === 1 ? 2 : 1;
}

function playerKey(player: Player): '1' | '2' {
  return player === 1 ? '1' : '2';
}

function isWildcard(card: ChaoticBigTwoCard, level: ChaoticBigTwoRank): boolean {
  return card.rank === level && card.suit === 'H';
}

function isOpeningCard(card: ChaoticBigTwoCard): boolean {
  return card.rank === '3' && card.suit === 'D';
}

function makeDoubleDeck(): ChaoticBigTwoCard[] {
  const deck: ChaoticBigTwoCard[] = [];
  for (const copy of [1, 2] as const) {
    for (const rank of RANK_ORDER) {
      for (const suit of SUIT_ORDER) {
        deck.push({
          id: `${rank}${suit}-${copy}`,
          rank,
          suit,
          deck: copy,
        });
      }
    }
  }
  return deck;
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function topSuitDeck(cards: ChaoticBigTwoCard[], allowWildcardBoost: boolean): [number, number] {
  if (allowWildcardBoost) return [suitValue('S'), 2];
  if (cards.length === 0) return [suitValue('D'), 1];
  const best = [...cards].sort(compareCards).at(-1)!;
  return [suitValue(best.suit), best.deck];
}

function groupByRank(cards: ChaoticBigTwoCard[]): Map<ChaoticBigTwoRank, ChaoticBigTwoCard[]> {
  const groups = new Map<ChaoticBigTwoRank, ChaoticBigTwoCard[]>();
  for (const card of cards) {
    const list = groups.get(card.rank) ?? [];
    list.push(card);
    groups.set(card.rank, list);
  }
  return groups;
}

function evaluateSingle(cards: ChaoticBigTwoCard[], player: Player, level: ChaoticBigTwoRank): ChaoticBigTwoCombination | null {
  if (cards.length !== 1) return null;
  const [card] = cards;
  if (isWildcard(card, level)) {
    return {
      type: 'single',
      cards: sortCards(cards),
      size: 1,
      strength: [rankValue('2'), suitValue('S'), 2],
      playedBy: player,
      isBomb: false,
    };
  }
  return {
    type: 'single',
    cards: sortCards(cards),
    size: 1,
    strength: [rankValue(card.rank), suitValue(card.suit), card.deck],
    playedBy: player,
    isBomb: false,
  };
}

function evaluateSameRankGroup(
  cards: ChaoticBigTwoCard[],
  player: Player,
  level: ChaoticBigTwoRank,
  size: 2 | 3
): ChaoticBigTwoCombination | null {
  if (cards.length !== size) return null;
  const nonWild = cards.filter((card) => !isWildcard(card, level));
  const wildCount = cards.length - nonWild.length;
  const rankGroups = groupByRank(nonWild);
  if (rankGroups.size > 1) return null;

  const rank = rankGroups.keys().next().value ?? '2';
  const matchingCards = rankGroups.get(rank) ?? [];
  if (matchingCards.length > size) return null;

  const type: ChaoticBigTwoCombinationType = size === 2 ? 'pair' : 'triple';
  const [topSuit, topDeck] = topSuitDeck(matchingCards, wildCount > 0);
  return {
    type,
    cards: sortCards(cards),
    size,
    strength: [rankValue(rank), topSuit, topDeck],
    playedBy: player,
    isBomb: false,
  };
}

function evaluateNKindBomb(
  cards: ChaoticBigTwoCard[],
  player: Player,
  level: ChaoticBigTwoRank
): ChaoticBigTwoCombination | null {
  const n = cards.length;
  if (n < 4 || n > 10) return null;

  const nonWild = cards.filter((card) => !isWildcard(card, level));
  const wildCount = cards.length - nonWild.length;
  const rankGroups = groupByRank(nonWild);
  if (rankGroups.size > 1) return null;

  const rank = rankGroups.keys().next().value ?? '2';
  const matchingCards = rankGroups.get(rank) ?? [];
  if (matchingCards.length + wildCount !== n) return null;

  const [topSuit, topDeck] = topSuitDeck(matchingCards, wildCount > 0);
  return {
    type: 'bomb-n-kind',
    cards: sortCards(cards),
    size: n,
    strength: [0, n, rankValue(rank), topSuit, topDeck],
    playedBy: player,
    isBomb: true,
  };
}

function evaluateFullHouse(cards: ChaoticBigTwoCard[], player: Player, level: ChaoticBigTwoRank): ChaoticBigTwoCombination | null {
  if (cards.length !== 5) return null;
  const nonWild = cards.filter((card) => !isWildcard(card, level));
  const wildCount = cards.length - nonWild.length;
  const rankGroups = groupByRank(nonWild);

  let bestStrength: number[] | null = null;
  for (let i = RANK_ORDER.length - 1; i >= 0; i--) {
    const tripleRank = RANK_ORDER[i];
    for (let j = RANK_ORDER.length - 1; j >= 0; j--) {
      const pairRank = RANK_ORDER[j];
      if (pairRank === tripleRank) continue;

      let outside = false;
      for (const rank of rankGroups.keys()) {
        if (rank !== tripleRank && rank !== pairRank) {
          outside = true;
          break;
        }
      }
      if (outside) continue;

      const tripleCount = rankGroups.get(tripleRank)?.length ?? 0;
      const pairCount = rankGroups.get(pairRank)?.length ?? 0;
      if (tripleCount > 3 || pairCount > 2) continue;

      const need = (3 - tripleCount) + (2 - pairCount);
      if (need !== wildCount) continue;

      const strength: number[] = [rankValue(tripleRank), rankValue(pairRank)];
      if (!bestStrength || compareStrength(strength, bestStrength) > 0) {
        bestStrength = strength;
      }
    }
  }

  if (!bestStrength) return null;
  return {
    type: 'full-house',
    cards: sortCards(cards),
    size: 5,
    strength: bestStrength,
    playedBy: player,
    isBomb: false,
  };
}

function evaluateStraight(cards: ChaoticBigTwoCard[], player: Player, level: ChaoticBigTwoRank): ChaoticBigTwoCombination | null {
  if (cards.length !== 5) return null;
  const nonWild = cards.filter((card) => !isWildcard(card, level));
  const wildCount = cards.length - nonWild.length;
  const rankGroups = groupByRank(nonWild);
  if ([...rankGroups.values()].some((group) => group.length > 1)) return null;

  let bestStrength: number[] | null = null;
  for (let sequenceIndex = STRAIGHT_SEQUENCES.length - 1; sequenceIndex >= 0; sequenceIndex--) {
    const sequence = STRAIGHT_SEQUENCES[sequenceIndex];
    const allowed = new Set(sequence);

    let fits = true;
    for (const rank of rankGroups.keys()) {
      if (!allowed.has(rank)) {
        fits = false;
        break;
      }
    }
    if (!fits) continue;

    const needed = sequence.filter((rank) => !rankGroups.has(rank)).length;
    if (needed !== wildCount) continue;

    const topRank = sequence[sequence.length - 1];
    const topCards = rankGroups.get(topRank) ?? [];
    const [topSuit, topDeck] = topSuitDeck(topCards, topCards.length === 0);
    const strength = [sequenceIndex, topSuit, topDeck];
    if (!bestStrength || compareStrength(strength, bestStrength) > 0) {
      bestStrength = strength;
    }
  }

  if (!bestStrength) return null;
  return {
    type: 'straight',
    cards: sortCards(cards),
    size: 5,
    strength: bestStrength,
    playedBy: player,
    isBomb: false,
  };
}

function evaluateConsecutiveGroupedHand(
  cards: ChaoticBigTwoCard[],
  player: Player,
  level: ChaoticBigTwoRank,
  groupSize: 2 | 3,
  groupCount: 2 | 3,
  type: 'tube' | 'plate'
): ChaoticBigTwoCombination | null {
  const requiredSize = groupSize * groupCount;
  if (cards.length !== requiredSize) return null;
  const nonWild = cards.filter((card) => !isWildcard(card, level));
  const wildCount = cards.length - nonWild.length;
  const rankGroups = groupByRank(nonWild);

  let bestStrength: number[] | null = null;
  for (let startIndex = 0; startIndex <= RANK_ORDER.length - groupCount; startIndex++) {
    const ranks = RANK_ORDER.slice(startIndex, startIndex + groupCount);
    const allowed = new Set(ranks);
    let outside = false;
    for (const rank of rankGroups.keys()) {
      if (!allowed.has(rank)) {
        outside = true;
        break;
      }
    }
    if (outside) continue;

    let needWild = 0;
    let invalid = false;
    for (const rank of ranks) {
      const count = rankGroups.get(rank)?.length ?? 0;
      if (count > groupSize) {
        invalid = true;
        break;
      }
      needWild += groupSize - count;
    }
    if (invalid || needWild !== wildCount) continue;

    const topRank = ranks[ranks.length - 1];
    const topCount = rankGroups.get(topRank)?.length ?? 0;
    const topCards = rankGroups.get(topRank) ?? [];
    const [topSuit, topDeck] = topSuitDeck(topCards, topCount < groupSize);
    const strength = [rankValue(topRank), topSuit, topDeck];
    if (!bestStrength || compareStrength(strength, bestStrength) > 0) {
      bestStrength = strength;
    }
  }

  if (!bestStrength) return null;
  return {
    type,
    cards: sortCards(cards),
    size: requiredSize,
    strength: bestStrength,
    playedBy: player,
    isBomb: false,
  };
}

function evaluateStraightFlushBomb(
  cards: ChaoticBigTwoCard[],
  player: Player,
  level: ChaoticBigTwoRank
): ChaoticBigTwoCombination | null {
  const size = cards.length;
  if (size < 5 || size > 10) return null;

  const nonWild = cards.filter((card) => !isWildcard(card, level));
  const wildCount = cards.length - nonWild.length;
  const naturalSuits = new Set(nonWild.map((card) => card.suit));
  if (naturalSuits.size > 1) return null;

  const suitCandidates: ChaoticBigTwoSuit[] = naturalSuits.size === 1
    ? [...naturalSuits] as ChaoticBigTwoSuit[]
    : SUIT_ORDER;

  let bestStrength: number[] | null = null;
  for (const suit of suitCandidates) {
    const suitedNaturals = nonWild.filter((card) => card.suit === suit);
    const rankGroups = groupByRank(suitedNaturals);
    if ([...rankGroups.values()].some((group) => group.length > 1)) continue;

    for (let start = 0; start <= RANK_ORDER.length - size; start++) {
      const sequence = RANK_ORDER.slice(start, start + size);
      const allowed = new Set(sequence);

      let fits = true;
      for (const rank of rankGroups.keys()) {
        if (!allowed.has(rank)) {
          fits = false;
          break;
        }
      }
      if (!fits) continue;

      const neededWild = sequence.filter((rank) => !rankGroups.has(rank)).length;
      if (neededWild !== wildCount) continue;

      const highRank = sequence[sequence.length - 1];
      const strength = [1, size, rankValue(highRank), suitValue(suit)];
      if (!bestStrength || compareStrength(strength, bestStrength) > 0) {
        bestStrength = strength;
      }
    }
  }

  if (!bestStrength) return null;
  return {
    type: 'bomb-straight-flush',
    cards: sortCards(cards),
    size,
    strength: bestStrength,
    playedBy: player,
    isBomb: true,
  };
}

function evaluateCombinationCandidates(
  cards: ChaoticBigTwoCard[],
  player: Player,
  level: ChaoticBigTwoRank
): ChaoticBigTwoCombination[] {
  const sorted = sortCards(cards);
  const candidates: ChaoticBigTwoCombination[] = [];
  const push = (combo: ChaoticBigTwoCombination | null): void => {
    if (combo) candidates.push(combo);
  };

  push(evaluateSingle(sorted, player, level));
  push(evaluateSameRankGroup(sorted, player, level, 2));
  push(evaluateSameRankGroup(sorted, player, level, 3));
  push(evaluateStraight(sorted, player, level));
  push(evaluateConsecutiveGroupedHand(sorted, player, level, 2, 3, 'tube'));
  push(evaluateConsecutiveGroupedHand(sorted, player, level, 3, 2, 'plate'));
  push(evaluateFullHouse(sorted, player, level));
  push(evaluateNKindBomb(sorted, player, level));
  push(evaluateStraightFlushBomb(sorted, player, level));

  const unique = new Map<string, ChaoticBigTwoCombination>();
  for (const combo of candidates) {
    const key = `${combo.type}:${combo.size}:${combo.strength.join('.')}`;
    if (!unique.has(key)) {
      unique.set(key, combo);
    }
  }
  return [...unique.values()];
}

function compareBombs(a: ChaoticBigTwoCombination, b: ChaoticBigTwoCombination): number {
  return compareStrength(a.strength, b.strength);
}

function compareForSelection(a: ChaoticBigTwoCombination, b: ChaoticBigTwoCombination): number {
  if (a.isBomb !== b.isBomb) return a.isBomb ? 1 : -1;
  if (a.isBomb && b.isBomb) return compareBombs(a, b);

  const typeDiff = NON_BOMB_TYPE_ORDER.indexOf(a.type) - NON_BOMB_TYPE_ORDER.indexOf(b.type);
  if (typeDiff !== 0) return typeDiff;
  return compareStrength(a.strength, b.strength);
}

export function evaluateCombination(
  cards: ChaoticBigTwoCard[],
  player: Player,
  level: ChaoticBigTwoRank = '2'
): ChaoticBigTwoCombination | null {
  const candidates = evaluateCombinationCandidates(cards, player, level);
  if (candidates.length === 0) return null;
  return [...candidates].sort(compareForSelection).at(-1)!;
}

export function validateCombination(
  cards: ChaoticBigTwoCard[],
  player: Player,
  level: ChaoticBigTwoRank = '2'
): CombinationValidationResult {
  if (cards.length === 0) {
    return { valid: false, error: 'Choose at least one card' };
  }
  const combination = evaluateCombination(cards, player, level);
  if (!combination) {
    return { valid: false, error: 'That is not a valid chaotic Big 2 combination' };
  }
  return { valid: true, combination };
}

export function canBeatCombination(candidate: ChaoticBigTwoCombination, target: ChaoticBigTwoCombination | null): boolean {
  if (!target) return true;

  if (candidate.isBomb || target.isBomb) {
    if (candidate.isBomb && target.isBomb) {
      return compareBombs(candidate, target) > 0;
    }
    return candidate.isBomb && !target.isBomb;
  }

  if (candidate.type !== target.type) return false;
  if (candidate.size !== target.size) return false;
  return compareStrength(candidate.strength, target.strength) > 0;
}

export function createChaoticBigTwoBoard(
  firstPlayer: Player = 1,
  random: () => number = Math.random,
  level: ChaoticBigTwoRank = '2'
): ChaoticBigTwoBoardState {
  const deck = shuffle(makeDoubleDeck(), random);
  const hands: Record<'1' | '2', ChaoticBigTwoCard[]> = {
    '1': deck.slice(0, HAND_SIZE),
    '2': deck.slice(HAND_SIZE, HAND_SIZE * 2),
  };
  const burnedCards = deck.slice(HAND_SIZE * 2, HAND_SIZE * 2 + BURNED_CARD_COUNT);

  const firstKey = playerKey(firstPlayer);
  const otherKey = playerKey(nextTurn(firstPlayer));
  const openingCardInFirstHand = hands[firstKey].some(isOpeningCard);
  if (!openingCardInFirstHand) {
    const otherIndex = hands[otherKey].findIndex(isOpeningCard);
    if (otherIndex >= 0) {
      const swap = hands[firstKey][0];
      hands[firstKey][0] = hands[otherKey][otherIndex];
      hands[otherKey][otherIndex] = swap;
    } else {
      const burnedIndex = burnedCards.findIndex(isOpeningCard);
      if (burnedIndex >= 0) {
        const swap = hands[firstKey][0];
        hands[firstKey][0] = burnedCards[burnedIndex];
        burnedCards[burnedIndex] = swap;
      }
    }
  }

  return {
    ruleset: 'chaotic',
    level,
    hands: {
      '1': sortCards(hands['1']),
      '2': sortCards(hands['2']),
    },
    burnedCards: sortCards(burnedCards),
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

function assertPlayerOwnsCards(board: ChaoticBigTwoBoardState, player: Player, cardIds: string[]): ChaoticBigTwoCard[] {
  const hand = board.hands[playerKey(player)];
  const unique = new Set(cardIds);
  if (unique.size !== cardIds.length) {
    throw new Error('Select each card only once');
  }
  return cardIds.map((id) => {
    const card = hand.find((candidate) => candidate.id === id);
    if (!card) throw new Error('Card is not in your hand');
    return card;
  });
}

function calculateScores(board: ChaoticBigTwoBoardState, winner: Player): Record<'1' | '2', number> {
  const loser = nextTurn(winner);
  const loserKey = playerKey(loser);
  const loserRemaining = board.hands[loserKey].length;
  const loserPlayed = board.playedCardCounts[loserKey] > 0;
  const penaltyPerCard = !loserPlayed ? 3 : loserRemaining >= 15 ? 2 : 1;
  const loserScore = -(loserRemaining * penaltyPerCard);
  return {
    [playerKey(winner)]: Math.abs(loserScore),
    [loserKey]: loserScore,
  } as Record<'1' | '2', number>;
}

export function playCards(
  board: ChaoticBigTwoBoardState,
  player: Player,
  cardIds: string[]
): { board: ChaoticBigTwoBoardState; winner: Player | null } {
  const selected = assertPlayerOwnsCards(board, player, cardIds);
  const candidates = evaluateCombinationCandidates(selected, player, board.level);
  if (candidates.length === 0) {
    throw new Error('That is not a valid chaotic Big 2 combination');
  }

  if (board.moveCount === 0 && !selected.some(isOpeningCard)) {
    throw new Error('The opening play must include 3D');
  }

  const activeCombination = board.currentTrick.activeCombination;
  const playable = candidates
    .filter((candidate) => canBeatCombination(candidate, activeCombination))
    .sort(compareForSelection);

  if (playable.length === 0) {
    throw new Error(activeCombination ? 'Play a stronger valid combination' : 'That play is not high enough');
  }
  const chosen = playable.at(-1)!;

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

  const nextBoard: ChaoticBigTwoBoardState = {
    ...board,
    hands: nextHands,
    currentTrick: {
      leader: board.currentTrick.leader,
      activeCombination: chosen,
      lastPlayedBy: player,
      passesInRow: 0,
      plays: [
        ...board.currentTrick.plays,
        { player, action: 'play', cards: chosen.cards, combinationType: chosen.type },
      ],
    },
    playedCardCounts: nextPlayedCardCounts,
    scores: winner ? calculateScores({ ...board, hands: nextHands, playedCardCounts: nextPlayedCardCounts }, winner) : board.scores,
    lastAction: `Player ${player} played ${chosen.type}`,
    moveCount: board.moveCount + 1,
  };

  return { board: nextBoard, winner };
}

export function passTurn(board: ChaoticBigTwoBoardState, player: Player): ChaoticBigTwoBoardState {
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
  return nextTurn(player);
}

export function getNextTurnAfterPass(board: ChaoticBigTwoBoardState): Player {
  const activeCombination = board.currentTrick.activeCombination;
  if (!activeCombination || !board.currentTrick.lastPlayedBy) {
    throw new Error('Cannot advance turn after an invalid pass');
  }
  if (board.currentTrick.passesInRow + 1 >= PLAYER_COUNT - 1) {
    return board.currentTrick.lastPlayedBy;
  }
  return nextTurn(activeCombination.playedBy);
}

function combinationsOfSize<T>(items: T[], size: number): T[][] {
  const results: T[][] = [];
  const current: T[] = [];

  function build(startIndex: number): void {
    if (current.length === size) {
      results.push([...current]);
      return;
    }

    const remaining = size - current.length;
    for (let i = startIndex; i <= items.length - remaining; i++) {
      current.push(items[i]);
      build(i + 1);
      current.pop();
    }
  }

  if (size > 0 && size <= items.length) {
    build(0);
  }
  return results;
}

export function getChaoticPlayableCombinations(
  cards: ChaoticBigTwoCard[],
  player: Player,
  activeCombination: ChaoticBigTwoCombination | null,
  moveCount: number,
  level: ChaoticBigTwoRank = '2'
): ChaoticBigTwoCombination[] {
  const sorted = sortCards(cards);
  const sizes = [1, 2, 3, 4, 5, 6];
  const results: ChaoticBigTwoCombination[] = [];
  const seen = new Set<string>();

  for (const size of sizes) {
    if (size > sorted.length) continue;
    for (const group of combinationsOfSize(sorted, size)) {
      const combo = evaluateCombination(group, player, level);
      if (!combo) continue;
      const key = `${combo.type}:${combo.cards.map((card) => card.id).join(',')}`;
      if (seen.has(key)) continue;
      seen.add(key);

      if (!canBeatCombination(combo, activeCombination)) continue;
      if (moveCount === 0 && !group.some(isOpeningCard)) continue;
      results.push(combo);
      if (results.length >= 120) {
        return results.sort(compareForSelection);
      }
    }
  }

  return results.sort(compareForSelection);
}

export function sortChaoticCards(cards: ChaoticBigTwoCard[], level: ChaoticBigTwoRank = '2'): ChaoticBigTwoCard[] {
  void level;
  return sortCards(cards);
}

export function evaluateChaoticCombination(
  cards: ChaoticBigTwoCard[],
  player: Player,
  level: ChaoticBigTwoRank = '2'
): ChaoticBigTwoCombination | null {
  return evaluateCombination(cards, player, level);
}

export function playChaoticCards(
  board: ChaoticBigTwoBoardState,
  player: Player,
  cardIds: string[]
): { board: ChaoticBigTwoBoardState; winner: Player | null } {
  return playCards(board, player, cardIds);
}

export function passChaoticTurn(board: ChaoticBigTwoBoardState, player: Player): ChaoticBigTwoBoardState {
  return passTurn(board, player);
}

export function getNextChaoticTurnAfterPlay(player: Player, winner: Player | null): Player {
  return getNextTurnAfterPlay(player, winner);
}

export function getNextChaoticTurnAfterPass(board: ChaoticBigTwoBoardState): Player {
  return getNextTurnAfterPass(board);
}

export function describeChaoticCombination(type: string): string {
  switch (type) {
    case 'single': return 'Single';
    case 'pair': return 'Pair';
    case 'triple': return 'Triple';
    case 'straight': return 'Straight';
    case 'tube': return 'Tube';
    case 'plate': return 'Plate';
    case 'full-house': return 'Full house';
    case 'bomb-n-kind': return 'N-of-a-kind bomb';
    case 'bomb-straight-flush': return 'Straight flush bomb';
    default: return type;
  }
}

export function getChaoticCardLabel(card: ChaoticBigTwoCard): string {
  const suit = card.suit === 'S' ? 'S' : card.suit === 'H' ? 'H' : card.suit === 'C' ? 'C' : 'D';
  return `${card.rank}${suit}`;
}

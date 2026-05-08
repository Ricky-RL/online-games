import type { Player } from './types';
import * as classic from './big-2-logic';
import * as chaotic from './big-2-chaotic-logic';

export type BigTwoRuleset = 'classic' | 'chaotic';

export interface BigTwoCard {
  id: string;
  rank: string;
  suit: string;
}

export interface BigTwoCombination {
  type: string;
  cards: BigTwoCard[];
  size: number;
  strength: number[];
  playedBy: Player;
}

export interface BigTwoTrickPlay {
  player: Player;
  action: 'play' | 'pass';
  cards: BigTwoCard[];
  combinationType?: string;
}

export interface BigTwoTrickState {
  leader: Player;
  activeCombination: BigTwoCombination | null;
  lastPlayedBy: Player | null;
  passesInRow: number;
  plays: BigTwoTrickPlay[];
}

export interface BigTwoBoardState {
  ruleset?: BigTwoRuleset;
  level?: string;
  hands: Record<'1' | '2', BigTwoCard[]>;
  currentTrick: BigTwoTrickState;
  discards: BigTwoCard[];
  playedCardCounts: Record<'1' | '2', number>;
  scores: Record<'1' | '2', number>;
  lastAction: string | null;
  moveCount: number;
  burnedCards?: BigTwoCard[];
}

export function resolveRuleset(board: BigTwoBoardState | null | undefined): BigTwoRuleset {
  if (!board?.ruleset) return 'classic';
  return board.ruleset;
}

export function createBigTwoBoard(
  firstPlayer: Player = 1,
  random: () => number = Math.random,
  ruleset: BigTwoRuleset = 'classic'
): BigTwoBoardState {
  if (ruleset === 'chaotic') {
    return chaotic.createChaoticBigTwoBoard(firstPlayer, random) as unknown as BigTwoBoardState;
  }
  return {
    ...(classic.createBigTwoBoard(firstPlayer, random) as unknown as BigTwoBoardState),
    ruleset: 'classic',
  };
}

export function sortCards(cards: BigTwoCard[], ruleset: BigTwoRuleset = 'classic', level = '2'): BigTwoCard[] {
  if (ruleset === 'chaotic') {
    return chaotic.sortChaoticCards(cards as unknown as chaotic.ChaoticBigTwoCard[], level) as unknown as BigTwoCard[];
  }
  return classic.sortCards(cards as unknown as classic.BigTwoCard[]) as unknown as BigTwoCard[];
}

export function evaluateCombination(
  cards: BigTwoCard[],
  player: Player,
  ruleset: BigTwoRuleset = 'classic',
  level = '2'
): BigTwoCombination | null {
  if (ruleset === 'chaotic') {
    return chaotic.evaluateChaoticCombination(cards as unknown as chaotic.ChaoticBigTwoCard[], player, level) as unknown as BigTwoCombination | null;
  }
  return classic.evaluateCombination(cards as unknown as classic.BigTwoCard[], player) as unknown as BigTwoCombination | null;
}

export function getPlayableCombinations(
  cards: BigTwoCard[],
  player: Player,
  activeCombination: BigTwoCombination | null,
  moveCount: number,
  ruleset: BigTwoRuleset = 'classic',
  level = '2'
): BigTwoCombination[] {
  if (ruleset === 'chaotic') {
    return chaotic.getChaoticPlayableCombinations(
      cards as unknown as chaotic.ChaoticBigTwoCard[],
      player,
      activeCombination as unknown as chaotic.ChaoticBigTwoCombination | null,
      moveCount,
      level
    ) as unknown as BigTwoCombination[];
  }
  return classic.getPlayableCombinations(
    cards as unknown as classic.BigTwoCard[],
    player,
    activeCombination as unknown as classic.BigTwoCombination | null,
    moveCount
  ) as unknown as BigTwoCombination[];
}

export function playCards(
  board: BigTwoBoardState,
  player: Player,
  cardIds: string[]
): { board: BigTwoBoardState; winner: Player | null } {
  if (resolveRuleset(board) === 'chaotic') {
    return chaotic.playChaoticCards(
      board as unknown as chaotic.ChaoticBigTwoBoardState,
      player,
      cardIds
    ) as unknown as { board: BigTwoBoardState; winner: Player | null };
  }
  return classic.playCards(
    board as unknown as classic.BigTwoBoardState,
    player,
    cardIds
  ) as unknown as { board: BigTwoBoardState; winner: Player | null };
}

export function passTurn(board: BigTwoBoardState, player: Player): BigTwoBoardState {
  if (resolveRuleset(board) === 'chaotic') {
    return chaotic.passChaoticTurn(board as unknown as chaotic.ChaoticBigTwoBoardState, player) as unknown as BigTwoBoardState;
  }
  return classic.passTurn(board as unknown as classic.BigTwoBoardState, player) as unknown as BigTwoBoardState;
}

export function getNextTurnAfterPlay(
  board: BigTwoBoardState,
  player: Player,
  winner: Player | null
): Player {
  if (resolveRuleset(board) === 'chaotic') {
    return chaotic.getNextChaoticTurnAfterPlay(player, winner);
  }
  return classic.getNextTurnAfterPlay(player, winner);
}

export function getNextTurnAfterPass(board: BigTwoBoardState): Player {
  if (resolveRuleset(board) === 'chaotic') {
    return chaotic.getNextChaoticTurnAfterPass(board as unknown as chaotic.ChaoticBigTwoBoardState);
  }
  return classic.getNextTurnAfterPass(board as unknown as classic.BigTwoBoardState);
}

export function describeCombination(type: string, ruleset: BigTwoRuleset = 'classic'): string {
  if (ruleset === 'chaotic') return chaotic.describeChaoticCombination(type);
  return classic.describeCombination(type as classic.BigTwoCombinationType);
}

export function getCardLabel(card: BigTwoCard, ruleset: BigTwoRuleset = 'classic'): string {
  if (ruleset === 'chaotic') {
    return chaotic.getChaoticCardLabel(card as unknown as chaotic.ChaoticBigTwoCard);
  }
  return classic.getCardLabel(card as unknown as classic.BigTwoCard);
}

export function getRulesetHandOrder(ruleset: BigTwoRuleset): string[] {
  if (ruleset === 'chaotic') {
    return chaotic.CHAOTIC_COMBINATION_DISPLAY_ORDER;
  }
  return ['single', 'pair', 'triple', 'straight', 'flush', 'full-house', 'four-kind', 'straight-flush'];
}

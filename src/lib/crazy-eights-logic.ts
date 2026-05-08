import type { Player } from './types';

export type CrazyEightsSuit = 'clubs' | 'diamonds' | 'hearts' | 'spades';
export type CrazyEightsRank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export interface CrazyEightsCard {
  id: string;
  suit: CrazyEightsSuit;
  rank: CrazyEightsRank;
}

export interface CrazyEightsLastAction {
  player: Player;
  type: 'play' | 'draw' | 'pass';
  cardId?: string;
  chosenSuit?: CrazyEightsSuit;
  drawCount?: number;
  note: string;
}

export interface CrazyEightsBoardState {
  hands: Record<'1' | '2', CrazyEightsCard[]>;
  drawPile: CrazyEightsCard[];
  discardPile: CrazyEightsCard[];
  activeSuit: CrazyEightsSuit;
  activePlayer: Player;
  hasDrawnThisTurn: boolean;
  drawnCardId: string | null;
  lastAction: CrazyEightsLastAction | null;
  moveCount: number;
  turnSequence: number;
  scores: Record<'1' | '2', number>;
}

const SUIT_SYMBOLS: Record<CrazyEightsSuit, string> = {
  clubs: '♣',
  diamonds: '♦',
  hearts: '♥',
  spades: '♠',
};

const SUITS: CrazyEightsSuit[] = ['clubs', 'diamonds', 'hearts', 'spades'];
const RANKS: CrazyEightsRank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const HAND_SIZE = 7;

function playerKey(player: Player): '1' | '2' {
  return player === 1 ? '1' : '2';
}

function otherPlayer(player: Player): Player {
  return player === 1 ? 2 : 1;
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function buildDeck(): CrazyEightsCard[] {
  const deck: CrazyEightsCard[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ id: `${rank}-${suit}`, suit, rank });
    }
  }
  return deck;
}

function dealCards(deck: CrazyEightsCard[], count: number): { dealt: CrazyEightsCard[]; remaining: CrazyEightsCard[] } {
  return {
    dealt: deck.slice(0, count),
    remaining: deck.slice(count),
  };
}

function pickStartingDiscard(drawPile: CrazyEightsCard[]): { starter: CrazyEightsCard; drawPile: CrazyEightsCard[] } {
  const starterIndex = drawPile.findIndex((card) => card.rank !== '8');
  const safeIndex = starterIndex >= 0 ? starterIndex : 0;
  const starter = drawPile[safeIndex];
  const nextDrawPile = [...drawPile.slice(0, safeIndex), ...drawPile.slice(safeIndex + 1)];
  return { starter, drawPile: nextDrawPile };
}

function cardPointValue(card: CrazyEightsCard): number {
  if (card.rank === '8') return 50;
  if (card.rank === 'A') return 1;
  if (card.rank === 'J' || card.rank === 'Q' || card.rank === 'K' || card.rank === '10') return 10;
  return Number(card.rank);
}

function handScore(cards: CrazyEightsCard[]): number {
  return cards.reduce((sum, card) => sum + cardPointValue(card), 0);
}

function topCard(board: CrazyEightsBoardState): CrazyEightsCard {
  return board.discardPile[board.discardPile.length - 1];
}

function assertTurn(board: CrazyEightsBoardState, player: Player): void {
  if (board.activePlayer !== player) {
    throw new Error('Not your turn');
  }
}

function canStillDraw(board: CrazyEightsBoardState): boolean {
  return board.drawPile.length > 0 || board.discardPile.length > 1;
}

function replenishDrawPile(board: CrazyEightsBoardState, random: () => number): CrazyEightsBoardState {
  if (board.drawPile.length > 0) return board;
  if (board.discardPile.length <= 1) return board;

  const topDiscard = board.discardPile[board.discardPile.length - 1];
  const recyclable = board.discardPile.slice(0, -1);
  const shuffled = shuffle(recyclable, random);

  return {
    ...board,
    drawPile: shuffled,
    discardPile: [topDiscard],
  };
}

function drawOneCard(
  board: CrazyEightsBoardState,
  player: Player,
  random: () => number
): { board: CrazyEightsBoardState; drawn: CrazyEightsCard | null } {
  const nextBoard = replenishDrawPile(board, random);
  if (nextBoard.drawPile.length === 0) {
    return { board: nextBoard, drawn: null };
  }

  const drawn = nextBoard.drawPile[0];
  const key = playerKey(player);
  return {
    drawn,
    board: {
      ...nextBoard,
      drawPile: nextBoard.drawPile.slice(1),
      hands: {
        ...nextBoard.hands,
        [key]: [...nextBoard.hands[key], drawn],
      },
    },
  };
}

export function getCardLabel(card: CrazyEightsCard): string {
  return `${card.rank}${SUIT_SYMBOLS[card.suit]}`;
}

export function getSuitSymbol(suit: CrazyEightsSuit): string {
  return SUIT_SYMBOLS[suit];
}

function matchesCurrentPlay(board: CrazyEightsBoardState, card: CrazyEightsCard): boolean {
  if (card.rank === '8') return true;

  const activeTop = topCard(board);
  if (card.suit === board.activeSuit) return true;
  if (card.rank === activeTop.rank) return true;
  return false;
}

export function canPlayCard(board: CrazyEightsBoardState, player: Player, card: CrazyEightsCard): boolean {
  const key = playerKey(player);
  if (!board.hands[key].some((candidate) => candidate.id === card.id)) return false;

  if (board.hasDrawnThisTurn) {
    if (board.drawnCardId === null) return false;
    if (board.drawnCardId !== card.id) return false;
  }

  return matchesCurrentPlay(board, card);
}

export function getPlayableCards(board: CrazyEightsBoardState, player: Player): CrazyEightsCard[] {
  const key = playerKey(player);
  return board.hands[key].filter((card) => canPlayCard(board, player, card));
}

export function createCrazyEightsBoard(
  firstPlayer: Player = 1,
  random: () => number = Math.random
): CrazyEightsBoardState {
  const deck = shuffle(buildDeck(), random);
  const p1 = dealCards(deck, HAND_SIZE);
  const p2 = dealCards(p1.remaining, HAND_SIZE);
  const starter = pickStartingDiscard(p2.remaining);

  return {
    hands: {
      '1': p1.dealt,
      '2': p2.dealt,
    },
    drawPile: starter.drawPile,
    discardPile: [starter.starter],
    activeSuit: starter.starter.suit,
    activePlayer: firstPlayer,
    hasDrawnThisTurn: false,
    drawnCardId: null,
    lastAction: null,
    moveCount: 0,
    turnSequence: 0,
    scores: { '1': 0, '2': 0 },
  };
}

export function playCrazyEightsCard(
  board: CrazyEightsBoardState,
  player: Player,
  cardId: string,
  chosenSuit?: CrazyEightsSuit
): { board: CrazyEightsBoardState; winner: Player | null } {
  assertTurn(board, player);

  const key = playerKey(player);
  const card = board.hands[key].find((candidate) => candidate.id === cardId);
  if (!card) throw new Error('Card is not in your hand');
  if (!canPlayCard(board, player, card)) throw new Error('Card cannot be played right now');

  if (card.rank === '8' && !chosenSuit) {
    throw new Error('Choose a suit when playing an eight');
  }
  if (card.rank !== '8' && chosenSuit) {
    throw new Error('Choose a suit only when playing an eight');
  }

  const remainingHand = board.hands[key].filter((candidate) => candidate.id !== cardId);
  let nextBoard: CrazyEightsBoardState = {
    ...board,
    hands: {
      ...board.hands,
      [key]: remainingHand,
    },
    discardPile: [...board.discardPile, card],
    activeSuit: card.rank === '8' ? (chosenSuit as CrazyEightsSuit) : card.suit,
    activePlayer: otherPlayer(player),
    hasDrawnThisTurn: false,
    drawnCardId: null,
    moveCount: board.moveCount + 1,
    turnSequence: board.turnSequence + 1,
    lastAction: {
      player,
      type: 'play',
      cardId: card.id,
      chosenSuit: card.rank === '8' ? chosenSuit : undefined,
      note: card.rank === '8' ? `Played ${getCardLabel(card)} and called ${chosenSuit}` : `Played ${getCardLabel(card)}`,
    },
  };

  if (remainingHand.length === 0) {
    const loser = otherPlayer(player);
    const loserKey = playerKey(loser);
    const score = handScore(nextBoard.hands[loserKey]);
    nextBoard = {
      ...nextBoard,
      activePlayer: player,
      scores: {
        ...nextBoard.scores,
        [playerKey(player)]: score,
        [loserKey]: -score,
      },
    };
    return { board: nextBoard, winner: player };
  }

  return { board: nextBoard, winner: null };
}

export function drawCardForTurn(
  board: CrazyEightsBoardState,
  player: Player,
  random: () => number = Math.random
): { board: CrazyEightsBoardState; drawnCard: CrazyEightsCard | null; playable: boolean } {
  assertTurn(board, player);
  if (board.drawnCardId !== null) {
    throw new Error('Play the drawn playable card before drawing again');
  }

  const drawResult = drawOneCard(board, player, random);
  const drawnCard = drawResult.drawn;
  const playable = !!(drawnCard && matchesCurrentPlay(drawResult.board, drawnCard));

  const nextBoard: CrazyEightsBoardState = {
    ...drawResult.board,
    hasDrawnThisTurn: true,
    drawnCardId: playable ? drawnCard!.id : null,
    moveCount: board.moveCount + 1,
    turnSequence: board.turnSequence + 1,
    lastAction: {
      player,
      type: 'draw',
      cardId: playable ? drawnCard!.id : undefined,
      drawCount: drawnCard ? 1 : 0,
      note: drawnCard
        ? playable
          ? `Drew playable ${getCardLabel(drawnCard)}`
          : `Drew ${getCardLabel(drawnCard)}`
        : 'No cards left to draw',
    },
  };

  return {
    board: nextBoard,
    drawnCard: playable ? drawnCard : null,
    playable,
  };
}

export function passAfterDraw(board: CrazyEightsBoardState, player: Player): CrazyEightsBoardState {
  assertTurn(board, player);
  if (!board.hasDrawnThisTurn) {
    throw new Error('Draw first before passing');
  }
  if (board.drawnCardId) {
    throw new Error('You must play the drawn playable card');
  }
  if (canStillDraw(board)) {
    throw new Error('Keep drawing until you find a playable card');
  }

  return {
    ...board,
    activePlayer: otherPlayer(player),
    hasDrawnThisTurn: false,
    drawnCardId: null,
    moveCount: board.moveCount + 1,
    turnSequence: board.turnSequence + 1,
    lastAction: {
      player,
      type: 'pass',
      note: 'Passed turn',
    },
  };
}

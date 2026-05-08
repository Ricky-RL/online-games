import type { Player } from './types';

export type UnoColor = 'red' | 'yellow' | 'green' | 'blue';
export type UnoCardColor = UnoColor | 'wild';
export type UnoRank =
  | '0'
  | '1'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | 'skip'
  | 'reverse'
  | 'draw2'
  | 'wild'
  | 'wild-draw4';

export interface UnoCard {
  id: string;
  color: UnoCardColor;
  rank: UnoRank;
}

export interface UnoLastAction {
  player: Player;
  type: 'play' | 'draw' | 'pass';
  cardId?: string;
  chosenColor?: UnoColor;
  drawCount?: number;
  note: string;
}

export interface UnoBoardState {
  hands: Record<'1' | '2', UnoCard[]>;
  drawPile: UnoCard[];
  discardPile: UnoCard[];
  activeColor: UnoColor;
  activePlayer: Player;
  hasDrawnThisTurn: boolean;
  drawnCardId: string | null;
  lastAction: UnoLastAction | null;
  moveCount: number;
  turnSequence: number;
  scores: Record<'1' | '2', number>;
}

const COLORS: UnoColor[] = ['red', 'yellow', 'green', 'blue'];
const NUMBER_RANKS: Array<UnoRank> = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
const ACTION_RANKS: Array<UnoRank> = ['skip', 'reverse', 'draw2'];

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

function buildDeck(): UnoCard[] {
  const cards: UnoCard[] = [];
  let id = 1;

  for (const color of COLORS) {
    cards.push({ id: `uno-${id++}`, color, rank: '0' });
    for (const rank of NUMBER_RANKS.slice(1)) {
      cards.push({ id: `uno-${id++}`, color, rank });
      cards.push({ id: `uno-${id++}`, color, rank });
    }
    for (const rank of ACTION_RANKS) {
      cards.push({ id: `uno-${id++}`, color, rank });
      cards.push({ id: `uno-${id++}`, color, rank });
    }
  }

  for (let i = 0; i < 4; i++) {
    cards.push({ id: `uno-${id++}`, color: 'wild', rank: 'wild' });
    cards.push({ id: `uno-${id++}`, color: 'wild', rank: 'wild-draw4' });
  }

  return cards;
}

function dealCards(deck: UnoCard[], count: number): { dealt: UnoCard[]; remaining: UnoCard[] } {
  return {
    dealt: deck.slice(0, count),
    remaining: deck.slice(count),
  };
}

function pickStartingDiscard(drawPile: UnoCard[]): { starter: UnoCard; drawPile: UnoCard[] } {
  const starterIndex = drawPile.findIndex(
    (card) => card.color !== 'wild' && NUMBER_RANKS.includes(card.rank)
  );
  const safeIndex = starterIndex >= 0 ? starterIndex : 0;
  const starter = drawPile[safeIndex];
  const nextDrawPile = [...drawPile.slice(0, safeIndex), ...drawPile.slice(safeIndex + 1)];
  return { starter, drawPile: nextDrawPile };
}

function cardPointValue(card: UnoCard): number {
  if (NUMBER_RANKS.includes(card.rank)) {
    return Number(card.rank);
  }
  if (card.rank === 'wild' || card.rank === 'wild-draw4') return 50;
  return 20;
}

function handScore(cards: UnoCard[]): number {
  return cards.reduce((sum, card) => sum + cardPointValue(card), 0);
}

function replenishDrawPile(board: UnoBoardState, random: () => number): UnoBoardState {
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

function drawNCards(
  board: UnoBoardState,
  player: Player,
  count: number,
  random: () => number
): { board: UnoBoardState; drawn: UnoCard[] } {
  let nextBoard = board;
  const drawn: UnoCard[] = [];

  for (let i = 0; i < count; i++) {
    nextBoard = replenishDrawPile(nextBoard, random);
    if (nextBoard.drawPile.length === 0) break;

    const card = nextBoard.drawPile[0];
    const key = playerKey(player);
    drawn.push(card);
    nextBoard = {
      ...nextBoard,
      drawPile: nextBoard.drawPile.slice(1),
      hands: {
        ...nextBoard.hands,
        [key]: [...nextBoard.hands[key], card],
      },
    };
  }

  return { board: nextBoard, drawn };
}

function assertTurn(board: UnoBoardState, player: Player): void {
  if (board.activePlayer !== player) {
    throw new Error('Not your turn');
  }
}

function topCard(board: UnoBoardState): UnoCard {
  return board.discardPile[board.discardPile.length - 1];
}

export function getCardLabel(card: UnoCard): string {
  if (card.color === 'wild') {
    return card.rank === 'wild' ? 'Color Change' : 'Wild Draw 4';
  }
  const color = card.color[0].toUpperCase() + card.color.slice(1);
  const rank = card.rank === 'draw2' ? 'Draw 2' : card.rank === 'reverse' ? 'Reverse' : card.rank === 'skip' ? 'Skip' : card.rank;
  return `${color} ${rank}`;
}

export function canPlayCard(board: UnoBoardState, player: Player, card: UnoCard): boolean {
  const key = playerKey(player);
  if (!board.hands[key].some((candidate) => candidate.id === card.id)) return false;

  if (board.hasDrawnThisTurn && board.drawnCardId !== card.id) {
    return false;
  }

  if (card.rank === 'wild') return true;

  const activeTop = topCard(board);

  if (card.rank === 'wild-draw4') {
    return true;
  }

  if (card.color === board.activeColor) return true;
  if (activeTop.rank === card.rank) return true;
  return false;
}

export function getPlayableCards(board: UnoBoardState, player: Player): UnoCard[] {
  const key = playerKey(player);
  return board.hands[key].filter((card) => canPlayCard(board, player, card));
}

export function createUnoBoard(firstPlayer: Player = 1, random: () => number = Math.random): UnoBoardState {
  const deck = shuffle(buildDeck(), random);
  const p1 = dealCards(deck, 7);
  const p2 = dealCards(p1.remaining, 7);
  const starter = pickStartingDiscard(p2.remaining);

  return {
    hands: {
      '1': p1.dealt,
      '2': p2.dealt,
    },
    drawPile: starter.drawPile,
    discardPile: [starter.starter],
    activeColor: starter.starter.color as UnoColor,
    activePlayer: firstPlayer,
    hasDrawnThisTurn: false,
    drawnCardId: null,
    lastAction: null,
    moveCount: 0,
    turnSequence: 0,
    scores: { '1': 0, '2': 0 },
  };
}

export function playUnoCard(
  board: UnoBoardState,
  player: Player,
  cardId: string,
  chosenColor?: UnoColor,
  random: () => number = Math.random
): { board: UnoBoardState; winner: Player | null } {
  assertTurn(board, player);
  const key = playerKey(player);
  const card = board.hands[key].find((candidate) => candidate.id === cardId);
  if (!card) throw new Error('Card is not in your hand');
  if (!canPlayCard(board, player, card)) throw new Error('Card cannot be played right now');

  if ((card.rank === 'wild' || card.rank === 'wild-draw4') && !chosenColor) {
    throw new Error('Choose a color for wild cards');
  }

  const remainingHand = board.hands[key].filter((candidate) => candidate.id !== cardId);
  let nextBoard: UnoBoardState = {
    ...board,
    hands: {
      ...board.hands,
      [key]: remainingHand,
    },
    discardPile: [...board.discardPile, card],
    activeColor: card.color === 'wild' ? (chosenColor as UnoColor) : (card.color as UnoColor),
    hasDrawnThisTurn: false,
    drawnCardId: null,
    moveCount: board.moveCount + 1,
    turnSequence: board.turnSequence + 1,
  };

  let nextPlayer: Player = otherPlayer(player);
  let actionNote = `${getCardLabel(card)} played`;

  if (card.rank === 'skip' || card.rank === 'reverse') {
    nextPlayer = player;
  } else if (card.rank === 'draw2') {
    const drawResult = drawNCards(nextBoard, otherPlayer(player), 2, random);
    nextBoard = drawResult.board;
    nextPlayer = player;
    actionNote = 'Draw 2 played';
  } else if (card.rank === 'wild-draw4') {
    const drawResult = drawNCards(nextBoard, otherPlayer(player), 4, random);
    nextBoard = drawResult.board;
    nextPlayer = player;
    actionNote = 'Wild Draw 4 played';
  }

  nextBoard = {
    ...nextBoard,
    activePlayer: nextPlayer,
    lastAction: {
      player,
      type: 'play',
      cardId: card.id,
      chosenColor: card.color === 'wild' ? chosenColor : undefined,
      note: actionNote,
    },
  };

  if (remainingHand.length === 0) {
    const loser = otherPlayer(player);
    const loserKey = playerKey(loser);
    const score = handScore(nextBoard.hands[loserKey]);
    nextBoard = {
      ...nextBoard,
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
  board: UnoBoardState,
  player: Player,
  random: () => number = Math.random
): { board: UnoBoardState; drawnCard: UnoCard | null; playable: boolean } {
  assertTurn(board, player);
  if (board.hasDrawnThisTurn) {
    throw new Error('You already drew this turn');
  }

  let workingBoard = board;
  let drawnCount = 0;
  let playableCard: UnoCard | null = null;

  while (!playableCard) {
    const drawResult = drawNCards(workingBoard, player, 1, random);
    const drawnCard = drawResult.drawn[0] ?? null;
    workingBoard = drawResult.board;
    if (!drawnCard) break;

    drawnCount += 1;
    if (canPlayCard(workingBoard, player, drawnCard)) {
      playableCard = drawnCard;
      break;
    }
  }

  const nextBoard: UnoBoardState = {
    ...workingBoard,
    hasDrawnThisTurn: true,
    drawnCardId: playableCard?.id ?? null,
    moveCount: board.moveCount + 1,
    turnSequence: board.turnSequence + 1,
    lastAction: {
      player,
      type: 'draw',
      cardId: playableCard?.id,
      drawCount: drawnCount,
      note: playableCard ? `Drew ${drawnCount} card${drawnCount === 1 ? '' : 's'} to find a playable card` : 'No playable card found in draw pile',
    },
  };

  return {
    board: nextBoard,
    drawnCard: playableCard,
    playable: !!playableCard,
  };
}

export function passAfterDraw(board: UnoBoardState, player: Player): UnoBoardState {
  assertTurn(board, player);
  if (!board.hasDrawnThisTurn) {
    throw new Error('Draw first before passing');
  }
  if (board.drawnCardId) {
    throw new Error('You must play the drawn playable card');
  }

  const nextPlayer = otherPlayer(player);
  return {
    ...board,
    activePlayer: nextPlayer,
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

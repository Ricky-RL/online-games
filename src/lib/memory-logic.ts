import type { MemoryBoardState, MemoryCard } from './memory-types';

export const EMOJI_POOL = {
  animals: ['🐶', '🐱', '🐸', '🦊', '🐼', '🐨', '🦁', '🐮', '🐷', '🐵', '🐔', '🐙'],
  food: ['🍕', '🍔', '🍟', '🍣', '🧁', '🍩', '🍉', '🍓', '🥑', '🌮', '🍪', '🧀'],
  objects: ['⭐', '🎈', '🎸', '🚀', '💎', '🏀', '🎯', '🔮', '🎪', '🧲', '🎭', '🛸'],
};

function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function createMemoryBoard(): MemoryBoardState {
  const allEmojis = [...EMOJI_POOL.animals, ...EMOJI_POOL.food, ...EMOJI_POOL.objects];
  const selected = shuffle(allEmojis).slice(0, 10);
  const pairs = [...selected, ...selected];
  const shuffled = shuffle(pairs);

  const cards: MemoryCard[] = shuffled.map((emoji, index) => ({
    id: index,
    emoji,
    matched: false,
    matchedBy: null,
  }));

  return {
    cards,
    player1Score: 0,
    player2Score: 0,
    lastFlipped: null,
    lastFlipResult: null,
  };
}

export function canFlipCard(board: MemoryBoardState, cardIndex: number): boolean {
  if (cardIndex < 0 || cardIndex > 19) return false;
  return !board.cards[cardIndex].matched;
}

export function processFlip(
  board: MemoryBoardState,
  cardIndex1: number,
  cardIndex2: number,
  currentPlayer: 1 | 2
): MemoryBoardState {
  const card1 = board.cards[cardIndex1];
  const card2 = board.cards[cardIndex2];

  if (card1.emoji === card2.emoji) {
    const cards = board.cards.map((card, i) => {
      if (i === cardIndex1 || i === cardIndex2) {
        return { ...card, matched: true, matchedBy: currentPlayer };
      }
      return card;
    });

    return {
      cards,
      player1Score: currentPlayer === 1 ? board.player1Score + 1 : board.player1Score,
      player2Score: currentPlayer === 2 ? board.player2Score + 1 : board.player2Score,
      lastFlipped: [cardIndex1, cardIndex2],
      lastFlipResult: 'match',
    };
  }

  return {
    ...board,
    lastFlipped: [cardIndex1, cardIndex2],
    lastFlipResult: 'no-match',
  };
}

export function getNextTurn(lastFlipResult: 'match' | 'no-match', currentPlayer: 1 | 2): 1 | 2 {
  if (lastFlipResult === 'match') return currentPlayer;
  return currentPlayer === 1 ? 2 : 1;
}

export function isGameOver(board: MemoryBoardState): boolean {
  return board.cards.every((card) => card.matched);
}

export function getWinner(board: MemoryBoardState): 1 | 2 | null {
  if (board.player1Score > board.player2Score) return 1;
  if (board.player2Score > board.player1Score) return 2;
  return null;
}

export function isDraw(board: MemoryBoardState): boolean {
  return board.player1Score === board.player2Score && isGameOver(board);
}

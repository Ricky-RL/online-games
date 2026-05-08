export type GameCategory = 'strategy' | 'cooperative' | 'word' | 'chance' | 'sports' | 'creative' | 'trivia';

export interface GameDefinition {
  slug: string;
  title: string;
  description: string;
  color: string;
  categories: GameCategory[];
  /** Cooperative games have no turns — both players play simultaneously. */
  cooperative?: boolean;
}

export const DEFAULT_GAME_ORDER: GameDefinition[] = [
  {
    slug: 'connect-four',
    title: 'Connect Four',
    description: 'Drop pieces, connect four in a row. Classic strategy for two.',
    color: '#E63946',
    categories: ['strategy'],
  },
  {
    slug: 'wordle',
    title: 'Wordle',
    description: 'Guess the word together. Share clues, solve as a team.',
    color: '#538D4E',
    categories: ['cooperative', 'word'],
  },
  {
    slug: 'tic-tac-toe',
    title: 'Tic Tac Toe',
    description: 'X and O, three in a row. Quick rounds, pure fun.',
    color: '#FFBE0B',
    categories: ['strategy'],
  },
  {
    slug: 'checkers',
    title: 'Checkers',
    description: 'Jump and capture across the board. Classic strategy for two.',
    color: '#A0724A',
    categories: ['strategy'],
  },
  {
    slug: 'whiteboard',
    title: 'Whiteboard',
    description: 'Shared sticky notes and doodles. Think together, draw together.',
    color: '#FFBE0B',
    categories: ['creative', 'cooperative'],
  },
  {
    slug: 'battleship',
    title: 'Battleship',
    description: 'Hunt and sink the fleet. Fire shots, track hits, claim the sea.',
    color: '#1D3557',
    categories: ['strategy'],
  },
  {
    slug: 'mini-golf',
    title: 'Mini Golf',
    description: '3 holes, lowest score wins. Aim, shoot, and sink it.',
    color: '#06D6A0',
    categories: ['sports'],
  },
  {
    slug: 'jenga',
    title: 'Jenga',
    description: "Pull blocks, don't topple the tower. Nerve and strategy for two.",
    color: '#D97706',
    categories: ['chance'],
  },
  {
    slug: 'snakes-and-ladders',
    title: 'Snakes & Ladders',
    description: 'Roll the dice, climb ladders, dodge snakes. Race to square 100.',
    color: '#538D4E',
    categories: ['chance'],
  },
  {
    slug: 'word-search',
    title: 'Word Search',
    description: 'Find hidden words in a grid. Race against each other on the same puzzle.',
    color: '#6B48FF',
    categories: ['word'],
  },
  {
    slug: 'monopoly',
    title: 'Monopoly',
    description: 'Vancouver-themed property trading. Roll, buy, build, and bankrupt.',
    color: '#008000',
    categories: ['strategy', 'chance'],
  },
  {
    slug: 'memory',
    title: 'Memory',
    description: 'Flip cards, find pairs. Best memory wins the match.',
    color: '#9B59B6',
    categories: ['strategy'],
  },
  {
    slug: 'big-2',
    title: 'Big 2',
    description: 'Shed cards with poker hands. Pass, beat the table, empty your hand.',
    color: '#C2410C',
    categories: ['strategy'],
  },
  {
    slug: 'uno',
    title: 'UNO',
    description: 'Match colors and symbols. Use action cards to empty your hand first.',
    color: '#DC2626',
    categories: ['strategy', 'chance'],
  },
  {
    slug: 'crazy-eights',
    title: 'Crazy Eights',
    description: 'Match suit or rank, play eights wild, and be first to empty your hand.',
    color: '#0EA5E9',
    categories: ['strategy', 'chance'],
  },
  {
    slug: 'math-trivia',
    title: 'Math Trivia',
    description: '15 math questions — fastest correct answers wins.',
    color: '#F97316',
    categories: ['trivia'],
  },
  {
    slug: 'jeopardy',
    title: 'Jeopardy',
    description: 'Pick categories, answer trivia. Highest score wins the board.',
    color: '#1A3A7A',
    categories: ['trivia'],
  },
  {
    slug: 'pool',
    title: 'Pool',
    description: 'Classic 8-ball pool. Sink your balls, pocket the 8-ball last.',
    color: '#1B5E20',
    categories: ['sports'],
  },
  {
    slug: 'cup-pong',
    title: 'Cup Pong',
    description: 'Throw balls, sink cups. Classic beer pong for two.',
    color: '#FF6B35',
    categories: ['sports', 'chance'],
  },
  {
    slug: 'reaction',
    title: 'Reaction',
    description: 'Test your reflexes. Tap targets as fast as you can. Lowest average time wins.',
    color: '#FF6B35',
    categories: ['sports'],
  },
  {
    slug: 'sudoku',
    title: 'Sudoku',
    description: 'Solve puzzles together. Fill cells, share marks, beat the board as a team.',
    color: '#4A90D9',
    categories: ['cooperative', 'strategy'],
    cooperative: true,
  },
  {
    slug: 'solitaire',
    title: 'Solitaire',
    description: 'Classic Klondike, competitive twist. Beat your opponent on the same deal.',
    color: '#2D5016',
    categories: ['strategy'],
  },
];

export const DEFAULT_SLUG_ORDER = DEFAULT_GAME_ORDER.map((g) => g.slug);

/** Set of game slugs that are cooperative (no turns). */
export const COOPERATIVE_GAMES = new Set(
  DEFAULT_GAME_ORDER.filter((g) => g.cooperative).map((g) => g.slug)
);

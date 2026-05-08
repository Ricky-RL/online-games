'use client';

import { motion } from 'framer-motion';
import type { InboxGame, InboxGameType } from '@/lib/inbox-types';

interface InboxGameItemProps {
  game: InboxGame;
  onClick: () => void;
  onDismiss: () => void;
  playerName: string;
}

function ConnectFourMini() {
  return (
    <div className="w-8 h-8 rounded-lg bg-[#E63946]/10 flex items-center justify-center">
      <div className="w-3.5 h-3.5 rounded-full bg-[#E63946]/80" />
    </div>
  );
}

function TicTacToeMini() {
  return (
    <div className="w-8 h-8 rounded-lg bg-[#FFBE0B]/10 flex items-center justify-center">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        {/* Grid lines */}
        <line x1="5.5" y1="1" x2="5.5" y2="15" stroke="#FFBE0B" strokeWidth="1.2" opacity="0.6" />
        <line x1="10.5" y1="1" x2="10.5" y2="15" stroke="#FFBE0B" strokeWidth="1.2" opacity="0.6" />
        <line x1="1" y1="5.5" x2="15" y2="5.5" stroke="#FFBE0B" strokeWidth="1.2" opacity="0.6" />
        <line x1="1" y1="10.5" x2="15" y2="10.5" stroke="#FFBE0B" strokeWidth="1.2" opacity="0.6" />
      </svg>
    </div>
  );
}

function CheckersMini() {
  return (
    <div className="w-8 h-8 rounded-lg bg-[#8B4513]/10 flex items-center justify-center">
      <div className="w-3.5 h-3.5 rounded-full bg-[#8B4513]/80 border border-[#8B4513]/40" />
    </div>
  );
}

function BattleshipMini() {
  return (
    <div className="w-8 h-8 rounded-lg bg-[#1D3557]/10 flex items-center justify-center">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        {/* Waves */}
        <path d="M1 10 Q4 8 8 10 Q12 12 15 10" stroke="#1D3557" strokeWidth="1.2" opacity="0.7" fill="none" />
        <path d="M1 13 Q4 11 8 13 Q12 15 15 13" stroke="#1D3557" strokeWidth="1.2" opacity="0.4" fill="none" />
        {/* Target crosshair */}
        <circle cx="8" cy="6" r="3" stroke="#E63946" strokeWidth="1" opacity="0.7" fill="none" />
        <line x1="8" y1="3" x2="8" y2="4" stroke="#E63946" strokeWidth="1" opacity="0.7" />
        <line x1="8" y1="8" x2="8" y2="9" stroke="#E63946" strokeWidth="1" opacity="0.7" />
        <line x1="5" y1="6" x2="6" y2="6" stroke="#E63946" strokeWidth="1" opacity="0.7" />
        <line x1="10" y1="6" x2="11" y2="6" stroke="#E63946" strokeWidth="1" opacity="0.7" />
      </svg>
    </div>
  );
}

function MiniGolfMini() {
  return (
    <div className="w-8 h-8 rounded-lg bg-[#06D6A0]/10 flex items-center justify-center">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#06D6A0" strokeWidth="2">
        <circle cx="12" cy="18" r="3" />
        <path d="M12 15V3l6 4" />
      </svg>
    </div>
  );
}

function JengaMini() {
  return (
    <div className="w-8 h-8 rounded-lg bg-[#D97706]/10 flex items-center justify-center">
      <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
        <rect x="4" y="14" width="12" height="3" rx="0.5" fill="#D97706" opacity="0.8" />
        <rect x="5" y="10" width="3" height="4" rx="0.5" fill="#D97706" opacity="0.6" />
        <rect x="9" y="10" width="3" height="4" rx="0.5" fill="#D97706" opacity="0.7" />
        <rect x="13" y="10" width="3" height="4" rx="0.5" fill="#D97706" opacity="0.6" />
        <rect x="4" y="6" width="12" height="3" rx="0.5" fill="#D97706" opacity="0.5" />
        <rect x="5" y="2" width="3" height="4" rx="0.5" fill="#D97706" opacity="0.4" />
        <rect x="9" y="2" width="3" height="4" rx="0.5" fill="#D97706" opacity="0.4" />
      </svg>
    </div>
  );
}

function SnakesAndLaddersMini() {
  return (
    <div className="w-8 h-8 rounded-lg bg-[#538D4E]/10 flex items-center justify-center">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M3 13L7 3" stroke="#538D4E" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M5 13L9 3" stroke="#538D4E" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="3.5" y1="11" x2="5.5" y2="11" stroke="#538D4E" strokeWidth="1" />
        <line x1="4.5" y1="8" x2="6.5" y2="8" stroke="#538D4E" strokeWidth="1" />
        <line x1="5.5" y1="5" x2="7.5" y2="5" stroke="#538D4E" strokeWidth="1" />
        <path d="M10 4C11 3 13 3 13 5C13 7 10 7 11 9C11.5 10 12 10.5 13 10" stroke="#E63946" strokeWidth="1.2" strokeLinecap="round" fill="none" />
      </svg>
    </div>
  );
}

function WordSearchMini() {
  return (
    <div className="w-8 h-8 rounded-lg bg-[#6B48FF]/10 flex items-center justify-center">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="1" width="14" height="14" rx="2" stroke="#6B48FF" strokeWidth="1.2" opacity="0.6" />
        <text x="3" y="7" fontSize="4" fill="#6B48FF" opacity="0.8" fontFamily="monospace">AB</text>
        <text x="3" y="12" fontSize="4" fill="#6B48FF" opacity="0.8" fontFamily="monospace">CD</text>
        <line x1="3" y1="5" x2="10" y2="5" stroke="#6B48FF" strokeWidth="1.5" opacity="0.9" strokeLinecap="round" />
      </svg>
    </div>
  );
}

function MonopolyMini() {
  return (
    <div className="w-8 h-8 rounded-lg bg-[#008000]/10 flex items-center justify-center">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#008000" strokeWidth="2">
        <path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" />
      </svg>
    </div>
  );
}

function MemoryMini() {
  return (
    <div className="w-8 h-8 rounded-lg bg-[#9B59B6]/10 flex items-center justify-center">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="1" width="6" height="6" rx="1" fill="#9B59B6" opacity="0.7" />
        <rect x="9" y="1" width="6" height="6" rx="1" fill="#9B59B6" opacity="0.5" />
        <rect x="1" y="9" width="6" height="6" rx="1" fill="#9B59B6" opacity="0.5" />
        <rect x="9" y="9" width="6" height="6" rx="1" fill="#9B59B6" opacity="0.7" />
      </svg>
    </div>
  );
}

function MathTriviaMini() {
  return (
    <div className="w-8 h-8 rounded-lg bg-[#F97316]/10 flex items-center justify-center">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <text x="2" y="7" fontSize="5" fill="#F97316" opacity="0.9" fontFamily="monospace" fontWeight="bold">1+2</text>
        <text x="2" y="14" fontSize="5" fill="#F97316" opacity="0.7" fontFamily="monospace" fontWeight="bold">3×4</text>
      </svg>
    </div>
  );
}

function JeopardyMini() {
  return (
    <div className="w-8 h-8 rounded-lg bg-[#1A3A7A]/10 flex items-center justify-center">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <text x="2" y="13" fontSize="13" fill="#1A3A7A" opacity="0.8" fontFamily="serif" fontWeight="bold">J!</text>
      </svg>
    </div>
  );
}

function PoolMini() {
  return (
    <div className="w-8 h-8 rounded-lg bg-[#1B5E20]/10 flex items-center justify-center">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="6" stroke="#1B5E20" strokeWidth="1.5" fill="none" opacity="0.6" />
        <circle cx="6" cy="7" r="2" fill="#FFD700" opacity="0.9" />
        <circle cx="10" cy="7" r="2" fill="#FF0000" opacity="0.9" />
        <circle cx="8" cy="10" r="2" fill="#000" opacity="0.9" />
      </svg>
    </div>
  );
}

function CupPongMini() {
  return (
    <div className="w-8 h-8 rounded-lg bg-[#FF6B35]/10 flex items-center justify-center">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M4 3h8l-1.5 10h-5L4 3z" fill="#FF6B35" opacity="0.7" />
        <circle cx="8" cy="6" r="2" fill="white" opacity="0.6" />
      </svg>
    </div>
  );
}

function ReactionMini() {
  return (
    <div className="w-8 h-8 rounded-lg bg-[#FF6B35]/10 flex items-center justify-center">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M9.5 2L5 9h3.5l-1 5L12 7H8.5l1-5z" fill="#FF6B35" opacity="0.9" />
      </svg>
    </div>
  );
}

function SudokuMini() {
  return (
    <div className="w-8 h-8 rounded-lg bg-[#4A90D9]/10 flex items-center justify-center">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="1" width="4" height="4" rx="0.5" stroke="#4A90D9" strokeWidth="0.8" opacity="0.8" />
        <rect x="6" y="1" width="4" height="4" rx="0.5" stroke="#4A90D9" strokeWidth="0.8" opacity="0.6" />
        <rect x="11" y="1" width="4" height="4" rx="0.5" stroke="#4A90D9" strokeWidth="0.8" opacity="0.8" />
        <rect x="1" y="6" width="4" height="4" rx="0.5" stroke="#4A90D9" strokeWidth="0.8" opacity="0.6" />
        <rect x="6" y="6" width="4" height="4" rx="0.5" stroke="#4A90D9" strokeWidth="0.8" opacity="0.8" />
        <rect x="11" y="6" width="4" height="4" rx="0.5" stroke="#4A90D9" strokeWidth="0.8" opacity="0.6" />
        <rect x="1" y="11" width="4" height="4" rx="0.5" stroke="#4A90D9" strokeWidth="0.8" opacity="0.8" />
        <rect x="6" y="11" width="4" height="4" rx="0.5" stroke="#4A90D9" strokeWidth="0.8" opacity="0.6" />
        <rect x="11" y="11" width="4" height="4" rx="0.5" stroke="#4A90D9" strokeWidth="0.8" opacity="0.8" />
      </svg>
    </div>
  );
}

function DailyWordleMini() {
  return (
    <div className="w-8 h-8 rounded-lg bg-[#538D4E]/10 flex items-center justify-center">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="2" width="4" height="4" rx="0.5" fill="#538D4E" opacity="0.9" />
        <rect x="6" y="2" width="4" height="4" rx="0.5" fill="#B59F3B" opacity="0.9" />
        <rect x="11" y="2" width="4" height="4" rx="0.5" fill="#3A3A3C" opacity="0.6" />
        <rect x="1" y="7" width="4" height="4" rx="0.5" fill="#B59F3B" opacity="0.9" />
        <rect x="6" y="7" width="4" height="4" rx="0.5" fill="#538D4E" opacity="0.9" />
        <rect x="11" y="7" width="4" height="4" rx="0.5" fill="#538D4E" opacity="0.9" />
      </svg>
    </div>
  );
}

function SolitaireMini() {
  return (
    <div className="w-8 h-8 rounded-lg bg-[#2D5016]/10 flex items-center justify-center">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M8 2C8 2 4 5 4 8C4 10.2 5.8 12 8 12C10.2 12 12 10.2 12 8C12 5 8 2 8 2Z" fill="#2D5016" opacity="0.8" />
        <rect x="7" y="11" width="2" height="3" rx="0.5" fill="#2D5016" opacity="0.6" />
      </svg>
    </div>
  );
}

function Big2Mini() {
  return (
    <div className="w-8 h-8 rounded-lg bg-[#C2410C]/10 flex items-center justify-center">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="3" y="4" width="6" height="9" rx="1" fill="white" stroke="#C2410C" strokeWidth="1" transform="rotate(-10 3 4)" />
        <rect x="7" y="3" width="6" height="9" rx="1" fill="white" stroke="#C2410C" strokeWidth="1" transform="rotate(8 7 3)" />
        <text x="5" y="10" fontSize="5" fill="#C2410C" fontFamily="serif" fontWeight="bold">2</text>
      </svg>
    </div>
  );
}

function UnoMini() {
  return (
    <div className="w-8 h-8 rounded-lg bg-[#DC2626]/10 flex items-center justify-center">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <ellipse cx="8" cy="8" rx="6" ry="4.5" fill="#DC2626" opacity="0.85" />
        <text x="5.2" y="10" fontSize="5" fill="white" fontFamily="sans-serif" fontWeight="bold">U</text>
      </svg>
    </div>
  );
}

function CrazyEightsMini() {
  return (
    <div className="w-8 h-8 rounded-lg bg-[#0EA5E9]/10 flex items-center justify-center">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="3" y="4" width="6" height="9" rx="1" fill="white" stroke="#0EA5E9" strokeWidth="1" transform="rotate(-8 3 4)" />
        <rect x="7" y="3" width="6" height="9" rx="1" fill="white" stroke="#0EA5E9" strokeWidth="1" transform="rotate(8 7 3)" />
        <text x="8" y="10" fontSize="5" fill="#0EA5E9" fontFamily="serif" fontWeight="bold">8</text>
      </svg>
    </div>
  );
}

function GameIcon({ gameType }: { gameType: InboxGameType }) {
  switch (gameType) {
    case 'connect-four': return <ConnectFourMini />;
    case 'tic-tac-toe': return <TicTacToeMini />;
    case 'checkers': return <CheckersMini />;
    case 'battleship': return <BattleshipMini />;
    case 'mini-golf': return <MiniGolfMini />;
    case 'jenga': return <JengaMini />;
    case 'snakes-and-ladders': return <SnakesAndLaddersMini />;
    case 'word-search': return <WordSearchMini />;
    case 'monopoly': return <MonopolyMini />;
    case 'memory': return <MemoryMini />;
    case 'math-trivia': return <MathTriviaMini />;
    case 'jeopardy': return <JeopardyMini />;
    case 'pool': return <PoolMini />;
    case 'reaction': return <ReactionMini />;
    case 'solitaire': return <SolitaireMini />;
    case 'big-2': return <Big2Mini />;
    case 'uno': return <UnoMini />;
    case 'crazy-eights': return <CrazyEightsMini />;
    case 'daily-wordle': return <DailyWordleMini />;
    case 'cup-pong': return <CupPongMini />;
    case 'sudoku': return <SudokuMini />;
  }
}

function gameLabel(gameType: InboxGameType): string {
  switch (gameType) {
    case 'connect-four': return 'Connect Four';
    case 'tic-tac-toe': return 'Tic Tac Toe';
    case 'checkers': return 'Checkers';
    case 'battleship': return 'Battleship';
    case 'mini-golf': return 'Mini Golf';
    case 'jenga': return 'Jenga';
    case 'snakes-and-ladders': return 'Snakes & Ladders';
    case 'word-search': return 'Word Search';
    case 'monopoly': return 'Monopoly';
    case 'memory': return 'Memory';
    case 'math-trivia': return 'Math Trivia';
    case 'jeopardy': return 'Jeopardy';
    case 'pool': return 'Pool';
    case 'reaction': return 'Reaction';
    case 'solitaire': return 'Solitaire';
    case 'big-2': return 'Big 2';
    case 'uno': return 'UNO';
    case 'crazy-eights': return 'Crazy Eights';
    case 'daily-wordle': return 'Daily Wordle';
    case 'cup-pong': return 'Cup Pong';
    case 'sudoku': return 'Sudoku';
  }
}

function TurnBadge({ game }: { game: InboxGame }) {
  if (game.isWaitingForOpponent) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium rounded-full bg-border text-text-secondary/70">
        Waiting to join...
      </span>
    );
  }

  if (game.isCooperative) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold rounded-full bg-[#4A90D9]/10 text-[#4A90D9]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#4A90D9]" />
        Playing
      </span>
    );
  }

  if (game.isMyTurn) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold rounded-full bg-[#E63946]/10 text-[#E63946]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#E63946] animate-pulse" />
        Your turn
      </span>
    );
  }

  // Their turn
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium rounded-full bg-border text-text-secondary">
      Waiting...
    </span>
  );
}

function getOpponentName(game: InboxGame, playerName: string): string {
  if (game.player1_name === playerName) {
    return game.player2_name ?? 'Waiting...';
  }
  if (game.player2_name === playerName) {
    return game.player1_name ?? 'Waiting...';
  }
  // Player hasn't joined yet — opponent is whichever slot is filled
  return game.player1_name ?? game.player2_name ?? 'Waiting...';
}

export function InboxGameItem({ game, onClick, onDismiss, playerName }: InboxGameItemProps) {
  const opponentName = getOpponentName(game, playerName);

  return (
    <div className="relative group/item">
      <motion.button
        onClick={onClick}
        className="w-full flex items-center gap-3 p-3 rounded-xl border border-border bg-surface/50 hover:bg-surface hover:border-border/80 transition-all cursor-pointer text-left group"
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      >
        {/* Game icon */}
        <GameIcon gameType={game.game_type} />

        {/* Game info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-text-primary truncate">
              {gameLabel(game.game_type)}
            </span>
          </div>
          <span className="text-xs text-text-secondary">
            vs {opponentName}
          </span>
        </div>

        {/* Turn badge */}
        <TurnBadge game={game} />
      </motion.button>

      {/* Dismiss button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDismiss();
        }}
        className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-opacity bg-surface border border-border hover:bg-red-50 hover:border-red-200 hover:text-red-500 text-text-secondary/60"
        aria-label="Dismiss notification"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M2.5 2.5L7.5 7.5M7.5 2.5L2.5 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

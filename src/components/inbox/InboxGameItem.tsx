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

function JeopardyMini() {
  return (
    <div className="w-8 h-8 rounded-lg bg-[#1A3A7A]/10 flex items-center justify-center">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <text x="2" y="13" fontSize="13" fill="#1A3A7A" opacity="0.8" fontFamily="serif" fontWeight="bold">J!</text>
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
    case 'jeopardy': return <JeopardyMini />;
    case 'daily-wordle': return <DailyWordleMini />;
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
    case 'jeopardy': return 'Jeopardy';
    case 'daily-wordle': return 'Daily Wordle';
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

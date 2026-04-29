'use client';

import { motion } from 'framer-motion';
import type { InboxGame, InboxGameType } from '@/lib/inbox-types';

interface InboxGameItemProps {
  game: InboxGame;
  onClick: () => void;
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

function GameIcon({ gameType }: { gameType: InboxGameType }) {
  switch (gameType) {
    case 'connect-four': return <ConnectFourMini />;
    case 'tic-tac-toe': return <TicTacToeMini />;
    case 'checkers': return <CheckersMini />;
    case 'battleship': return <BattleshipMini />;
    case 'mini-golf': return <MiniGolfMini />;
  }
}

function gameLabel(gameType: InboxGameType): string {
  switch (gameType) {
    case 'connect-four': return 'Connect Four';
    case 'tic-tac-toe': return 'Tic Tac Toe';
    case 'checkers': return 'Checkers';
    case 'battleship': return 'Battleship';
    case 'mini-golf': return 'Mini Golf';
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
  return game.player1_name ?? 'Waiting...';
}

export function InboxGameItem({ game, onClick, playerName }: InboxGameItemProps) {
  const opponentName = getOpponentName(game, playerName);

  return (
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
  );
}

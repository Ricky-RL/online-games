'use client';

import { motion } from 'framer-motion';
import type { InboxGame } from '@/lib/inbox-types';

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
      {game.game_type === 'connect-four' ? <ConnectFourMini /> : <TicTacToeMini />}

      {/* Game info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text-primary truncate">
            {game.game_type === 'connect-four' ? 'Connect Four' : 'Tic Tac Toe'}
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

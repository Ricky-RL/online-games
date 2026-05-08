'use client';

import { motion } from 'framer-motion';
import type { InboxGame } from '@/lib/inbox-types';
import { InboxGameItem } from './InboxGameItem';

interface InboxGamesSectionProps {
  games: InboxGame[];
  onGameClick: (game: InboxGame) => void;
  onDismiss: (gameId: string) => void;
  playerName: string;
}

const listContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
    },
  },
};

const listItem = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.21, 0.47, 0.32, 0.98] as const } },
};

function sortGames(games: InboxGame[]): InboxGame[] {
  return [...games].sort((a, b) => {
    // your-turn first, then waiting-for-opponent, then their-turn
    const scoreA = a.isMyTurn ? 0 : a.isWaitingForOpponent ? 1 : 2;
    const scoreB = b.isMyTurn ? 0 : b.isWaitingForOpponent ? 1 : 2;
    return scoreA - scoreB;
  });
}

export function InboxGamesSection({ games, onGameClick, onDismiss, playerName }: InboxGamesSectionProps) {
  const sorted = sortGames(games);

  return (
    <div>
      {/* Section header */}
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-sm font-semibold text-text-primary tracking-wide uppercase">
          Games
        </h3>
      </div>

      {/* Game list */}
      {sorted.length === 0 ? (
        <p className="text-sm text-text-secondary/60 py-2">No active games</p>
      ) : (
        <motion.div
          className="flex max-h-[13.5rem] flex-col gap-2 overflow-y-auto pr-1"
          variants={listContainer}
          initial="hidden"
          animate="show"
        >
          {sorted.map((game) => (
            <motion.div key={game.id} variants={listItem}>
              <InboxGameItem game={game} onClick={() => onGameClick(game)} onDismiss={() => onDismiss(game.id)} playerName={playerName} />
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}

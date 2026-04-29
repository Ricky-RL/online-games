'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useInbox } from '@/hooks/useInbox';
import type { InboxGame } from '@/lib/inbox-types';
import { InboxGamesSection } from './InboxGamesSection';
import { InboxWhiteboardSection } from './InboxWhiteboardSection';

interface InboxProps {
  playerName: string;
}

export function Inbox({ playerName }: InboxProps) {
  const router = useRouter();
  const {
    games,
    gamesLoading,
    whiteboardActivity,
    whiteboardLoading,
    unreadGamesCount,
    unreadWhiteboardCount,
    markGamesRead,
    markWhiteboardRead,
  } = useInbox();

  const totalUnread = unreadGamesCount + unreadWhiteboardCount;
  const isEmpty = games.length === 0 && whiteboardActivity.length === 0;
  const isLoading = gamesLoading || whiteboardLoading;

  const handleGameClick = (game: InboxGame) => {
    markGamesRead();
    const path = game.game_type === 'connect-four'
      ? `/connect-four/${game.id}`
      : `/tic-tac-toe/${game.id}`;
    router.push(path);
  };

  const handleWhiteboardClick = () => {
    markWhiteboardRead();
    router.push('/whiteboard');
  };

  if (isLoading) {
    return null;
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.21, 0.47, 0.32, 0.98] }}
      className="max-w-3xl mx-auto mb-10"
    >
      <div className="rounded-2xl border border-border bg-surface/60 p-5 sm:p-6">
        {/* Header */}
        <div className="flex items-center gap-2.5 mb-5">
          <h2 className="text-lg font-bold text-text-primary">
            Your Inbox
          </h2>
          {totalUnread > 0 && (
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-bold rounded-full bg-[#E63946] text-white">
              {totalUnread}
            </span>
          )}
        </div>

        {/* Content */}
        {isEmpty ? (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-sm text-text-secondary/60 text-center py-4"
          >
            All caught up!
          </motion.p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <InboxGamesSection
              games={games}
              unreadCount={unreadGamesCount}
              onGameClick={handleGameClick}
              playerName={playerName}
            />
            <InboxWhiteboardSection
              activity={whiteboardActivity}
              unreadCount={unreadWhiteboardCount}
              onItemClick={handleWhiteboardClick}
            />
          </div>
        )}
      </div>
    </motion.section>
  );
}

'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useInbox } from '@/hooks/useInbox';
import { supabase } from '@/lib/supabase';
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
    markGamesRead,
    markWhiteboardRead,
    dismissItem,
  } = useInbox();

  const isEmpty = games.length === 0 && whiteboardActivity.length === 0;
  const isLoading = gamesLoading || whiteboardLoading;

  const handleGameClick = async (game: InboxGame) => {
    markGamesRead();
    const iAmInGame = game.player1_name === playerName || game.player2_name === playerName;

    if (!iAmInGame) {
      // Player hasn't joined yet — join the game directly, then navigate to it
      if (game.game_type === 'connect-four' || game.game_type === 'battleship') {
        // These games don't have a separate lobby page; join via supabase directly
        const isPlayer1Slot = game.player1_name === null;
        const myId = playerName === 'Ricky'
          ? '00000000-0000-0000-0000-000000000001'
          : '00000000-0000-0000-0000-000000000002';

        const updateField = isPlayer1Slot
          ? { player1_id: myId, player1_name: playerName }
          : { player2_id: myId, player2_name: playerName };

        await supabase
          .from('games')
          .update({ ...updateField, updated_at: new Date().toISOString() })
          .eq('id', game.id);

        router.push(`/${game.game_type}/${game.id}`);
      } else {
        // Tic-tac-toe and checkers have lobby pages that handle joining
        router.push(`/${game.game_type}`);
      }
      return;
    }

    const path = game.game_type === 'connect-four'
      ? `/connect-four/${game.id}`
      : `/${game.game_type}/${game.id}`;
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
              onGameClick={handleGameClick}
              onDismiss={(gameId) => dismissItem('game', gameId)}
              playerName={playerName}
            />
            <InboxWhiteboardSection
              activity={whiteboardActivity}
              onItemClick={handleWhiteboardClick}
              onDismiss={(itemId) => dismissItem('whiteboard', itemId)}
            />
          </div>
        )}
      </div>
    </motion.section>
  );
}

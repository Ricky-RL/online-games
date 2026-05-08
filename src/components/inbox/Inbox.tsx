'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useInbox } from '@/hooks/useInbox';
import { getStoredUser } from '@/lib/players';
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
    const currentUser = getStoredUser();
    if (!currentUser) return;
    const user = currentUser;
    const iAmInGame =
      game.player1_id === user.id ||
      game.player2_id === user.id ||
      game.player1_name === playerName ||
      game.player2_name === playerName;
    const joiningPlayer1 = game.player1_id === null && game.player1_name === null;

    async function joinIfStillPairScoped(table: 'games' | 'wordle_games') {
      if (!user.boundUserId) return false;
      const { supabase } = await import('@/lib/supabase');
      const updateField = joiningPlayer1
        ? { player1_id: user.id, player1_name: user.name }
        : { player2_id: user.id, player2_name: user.name };

      let query = supabase
        .from(table)
        .update({ ...updateField, updated_at: new Date().toISOString() })
        .eq('id', game.id);

      query = table === 'wordle_games'
        ? query.in('status', ['waiting', 'playing'])
        : query.eq('game_type', game.game_type).is('winner', null);

      query = joiningPlayer1
        ? query.eq('player2_id', user.boundUserId).is('player1_id', null).is('player1_name', null)
        : query.eq('player1_id', user.boundUserId).is('player2_id', null).is('player2_name', null);

      const { data, error } = await query.select('id').maybeSingle();
      return !error && !!data;
    }

    if (game.game_type === 'daily-wordle') {
      if (!iAmInGame) {
        await joinIfStillPairScoped('wordle_games');
      }
      router.push(`/wordle/${game.id}`);
      return;
    }

    if (!iAmInGame) {
      if (game.game_type === 'connect-four' || game.game_type === 'battleship' || game.game_type === 'monopoly') {
        await joinIfStillPairScoped('games');
        router.push(`/${game.game_type}/${game.id}`);
      } else {
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


'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { getStoredUser } from '@/lib/players';
import { findOrCreateBoundGame, type GameTable } from '@/lib/matchmaking';

interface AutoMatchmakingPageProps {
  gameType: string;
  label: string;
  table?: GameTable;
  createData: () => Record<string, unknown> | Promise<Record<string, unknown>>;
  joinData?: (game: unknown) => Record<string, unknown> | Promise<Record<string, unknown>>;
  statusFilter?: 'winner' | 'wordle';
  filterGame?: (game: unknown) => boolean;
}

export function AutoMatchmakingPage({
  gameType,
  label,
  table = 'games',
  createData,
  joinData,
  statusFilter,
  filterGame,
}: AutoMatchmakingPageProps) {
  const router = useRouter();
  const [message, setMessage] = useState('Finding a game...');
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    async function connect() {
      const currentUser = getStoredUser();
      if (!currentUser) {
        router.push('/');
        return;
      }
      if (!currentUser.boundUserId) {
        setMessage('Bind with another user before starting a game.');
        router.push('/');
        return;
      }

      const gameId = await findOrCreateBoundGame({
        table,
        gameType,
        currentUser,
        createData,
        joinData,
        statusFilter,
        filterGame,
      });

      if (gameId) {
        router.push(`/${gameType}/${gameId}`);
      } else {
        setMessage('Could not connect to a game. Try again in a moment.');
      }
    }

    connect();
  }, [createData, filterGame, gameType, joinData, router, statusFilter, table]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center"
      >
        <div className="w-8 h-8 border-2 border-board border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-text-secondary">{message}</p>
        <p className="text-xs text-text-secondary/50 mt-2">{label}</p>
      </motion.div>
    </div>
  );
}

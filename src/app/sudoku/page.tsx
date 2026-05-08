'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createInitialBoard, type Difficulty } from '@/lib/sudoku-logic';
import { getStoredUser, type StoredUser } from '@/lib/players';
import { findOrCreateBoundGame } from '@/lib/matchmaking';
import { DifficultySelector } from '@/components/sudoku/DifficultySelector';

export default function SudokuLobby() {
  const router = useRouter();
  const [connecting, setConnecting] = useState(false);
  const [showDifficulty, setShowDifficulty] = useState(false);
  const [currentUser, setCurrentUser] = useState<StoredUser | null>(null);
  const startedRef = useRef(false);

  const connect = useCallback(
    async (user: StoredUser, difficulty?: Difficulty) => {
      setConnecting(true);

      const gameId = await findOrCreateBoundGame({
        gameType: 'sudoku',
        currentUser: user,
        createData: () => {
          if (!difficulty) throw new Error('Sudoku difficulty is required');
          return {
            game_type: 'sudoku',
            board: createInitialBoard(difficulty),
            current_turn: 1,
            winner: null,
          };
        },
      });

      if (gameId) {
        router.push(`/sudoku/${gameId}`);
        return;
      }

      setConnecting(false);
    },
    [router]
  );

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    async function start() {
      const user = getStoredUser();
      if (!user?.boundUserId) {
        router.push('/');
        return;
      }

      setCurrentUser(user);

      try {
        await connect(user);
      } catch {
        setConnecting(false);
        setShowDifficulty(true);
      }
    }

    start();
  }, [connect, router]);

  const handleDifficultySelect = useCallback(
    (difficulty: Difficulty) => {
      if (currentUser) connect(currentUser, difficulty);
    },
    [connect, currentUser]
  );

  if (showDifficulty) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-8">
        <div className="space-y-3 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-text-primary">Sudoku</h1>
          <p className="text-text-secondary">New cooperative puzzle</p>
        </div>
        <DifficultySelector onSelect={handleDifficultySelect} />
        <button
          onClick={() => router.push('/')}
          className="text-sm text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
        >
          Back to games
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-text-secondary text-sm">
        {connecting ? 'Connecting...' : 'Preparing Sudoku...'}
      </div>
    </div>
  );
}

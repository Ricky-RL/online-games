'use client';

import { use, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useReactionGame } from '@/hooks/useReactionGame';
import { ReactionBoard } from '@/components/reaction/ReactionBoard';
import { ReactionResults } from '@/components/reaction/ReactionResults';
import { WinCelebration } from '@/components/WinCelebration';
import { EndGameDialog } from '@/components/EndGameDialog';
import { isGameComplete, computeWinner } from '@/lib/reaction-logic';
import type { Player } from '@/lib/types';

function getMyName(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('player-name') || localStorage.getItem('player-name');
}

export default function ReactionGamePage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = use(params);
  const { game, loading, deleted, recordRound, resetGame } = useReactionGame(gameId);
  const router = useRouter();
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [myName, setMyName] = useState<string | null>(null);

  useEffect(() => {
    setMyName(getMyName());
  }, []);

  useEffect(() => {
    if (deleted) router.push('/');
  }, [deleted, router]);

  const board = game?.board ?? null;

  const myPlayerNumber: Player | null = useMemo(() => {
    if (!game || !myName) return null;
    if (game.player1_name === myName) return 1;
    if (game.player2_name === myName) return 2;
    return null;
  }, [game, myName]);

  const isMyTurn = useMemo(() => {
    if (!board || !myPlayerNumber) return false;
    if (myPlayerNumber === 1) return board.phase === 'p1_playing';
    if (myPlayerNumber === 2) return board.phase === 'p2_playing';
    return false;
  }, [board, myPlayerNumber]);

  const opponentName = useMemo(() => {
    if (!game || !myPlayerNumber) return null;
    return myPlayerNumber === 1 ? game.player2_name : game.player1_name;
  }, [game, myPlayerNumber]);

  const handleEndGame = useCallback(async () => {
    await resetGame();
    router.push('/');
  }, [resetGame, router]);

  const handleEndGameClick = useCallback(() => {
    setShowEndDialog(true);
  }, []);

  const handleEndGameCancel = useCallback(() => {
    setShowEndDialog(false);
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-text-secondary text-sm">Loading game...</div>
      </div>
    );
  }

  if (!game || !board) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-text-secondary text-sm">Game not found</div>
      </div>
    );
  }

  const gameComplete = isGameComplete(board);
  const winner = gameComplete ? computeWinner(board) : null;

  if (gameComplete && winner) {
    const winnerName = winner === 1 ? game.player1_name : game.player2_name;
    const isMe = winner === myPlayerNumber;

    return (
      <motion.div
        className="flex-1 flex flex-col items-center justify-center gap-8 p-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <WinCelebration
          winner={winner as Player}
          winnerName={winnerName}
          isMe={isMe}
          onPlayAgain={handleEndGame}
          onHome={handleEndGame}
        />
        <ReactionResults board={board} game={game} />
      </motion.div>
    );
  }

  if (gameComplete && !winner) {
    // Draw — both have same average
    return (
      <motion.div
        className="flex-1 flex flex-col items-center justify-center gap-6 p-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <div className="text-center">
          <p className="text-2xl font-semibold text-text-secondary mb-2">
            It&apos;s a tie!
          </p>
          <p className="text-sm text-text-secondary">Identical reflexes.</p>
        </div>
        <ReactionResults board={board} game={game} />
        <button
          onClick={handleEndGame}
          className="px-6 py-3 text-base font-medium rounded-xl bg-board text-white hover:bg-board-surface transition-colors cursor-pointer"
        >
          Home
        </button>
      </motion.div>
    );
  }

  return (
    <>
      <motion.div
        className="flex-1 flex flex-col items-center justify-center gap-6 p-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <ReactionBoard
          board={board}
          game={game}
          isMyTurn={isMyTurn}
          myPlayerNumber={myPlayerNumber}
          opponentName={opponentName}
          onRecordRound={recordRound}
        />

        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 text-sm font-medium rounded-xl border border-border bg-surface text-text-secondary hover:text-text-primary hover:border-text-secondary/30 shadow-sm hover:shadow transition-all cursor-pointer"
          >
            Home
          </button>
          <button
            onClick={handleEndGameClick}
            className="px-4 py-2 text-sm font-medium rounded-xl border border-player1/20 bg-player1/5 text-player1/80 hover:bg-player1/10 hover:border-player1/40 hover:text-player1 shadow-sm hover:shadow transition-all cursor-pointer"
          >
            End Game
          </button>
        </div>
      </motion.div>
      <EndGameDialog
        open={showEndDialog}
        onConfirm={handleEndGame}
        onCancel={handleEndGameCancel}
      />
    </>
  );
}

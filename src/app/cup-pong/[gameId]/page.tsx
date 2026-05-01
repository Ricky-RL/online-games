'use client';

import { use, useCallback, useMemo, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useCupPongGame } from '@/hooks/useCupPongGame';
import { getCupsRemaining } from '@/lib/cup-pong-logic';
import { Table } from '@/components/cup-pong/Table';
import { SettingsButton } from '@/components/SettingsButton';
import { TurnIndicator } from '@/components/TurnIndicator';
import { WinCelebration } from '@/components/WinCelebration';
import { EndGameDialog } from '@/components/EndGameDialog';
import { NotificationControls } from '@/components/NotificationControls';
import { useNotifications } from '@/hooks/useNotifications';
import type { Player } from '@/lib/types';
import type { ThrowVector, ThrowResult } from '@/lib/cup-pong-types';

function getMyName(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('player-name') || localStorage.getItem('player-name');
}

export default function CupPongGamePage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = use(params);
  const router = useRouter();
  const { game, loading, error, deleted, firstThrow, makeThrow, endGame } = useCupPongGame(gameId);
  const [myName, setMyName] = useState<string | null>(null);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [displayedThrow, setDisplayedThrow] = useState<ThrowResult | null>(null);

  useEffect(() => {
    setMyName(getMyName());
  }, []);

  useEffect(() => {
    if (deleted) router.push('/');
  }, [deleted, router]);

  // When firstThrow arrives from the hook, trigger the animation
  useEffect(() => {
    if (firstThrow) {
      setDisplayedThrow(firstThrow);
      setAnimating(true);
    }
  }, [firstThrow]);

  const myPlayerNumber: Player | null = useMemo(() => {
    if (!game || !myName) return null;
    if (game.player1_name === myName) return 1;
    if (game.player2_name === myName) return 2;
    return null;
  }, [game, myName]);

  const isMyTurn = useMemo(() => {
    if (!game || !myPlayerNumber) return false;
    return game.current_turn === myPlayerNumber;
  }, [game, myPlayerNumber]);

  const opponentName = useMemo(() => {
    if (!game || !myPlayerNumber) return null;
    return myPlayerNumber === 1 ? game.player2_name : game.player1_name;
  }, [game, myPlayerNumber]);

  const winnerName = useMemo(() => {
    if (!game || !game.winner) return null;
    return game.winner === 1 ? game.player1_name : game.player2_name;
  }, [game]);

  const { permissionState, requestPermission, isMuted, toggleMute } = useNotifications({
    gameId,
    isMyTurn,
    opponentName,
    gameType: 'cup-pong',
  });

  const handleThrow = useCallback(
    async (direction: ThrowVector, power: number) => {
      setAnimating(true);
      await makeThrow(direction, power);
    },
    [makeThrow]
  );

  const handleAnimationComplete = useCallback(() => {
    setAnimating(false);
    setDisplayedThrow(null);
  }, []);

  const handleEndGameClick = useCallback(() => {
    setShowEndDialog(true);
  }, []);

  const handleEndGameCancel = useCallback(() => {
    setShowEndDialog(false);
  }, []);

  const handleEndGameConfirm = useCallback(async () => {
    setShowEndDialog(false);
    await endGame();
    router.push('/');
  }, [endGame, router]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <div className="text-text-secondary text-sm">Loading game...</div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <div className="text-text-secondary text-sm">Game not found</div>
      </div>
    );
  }

  const p1Remaining = getCupsRemaining(game.board, 1);
  const p2Remaining = getCupsRemaining(game.board, 2);

  // Game won state — show celebration with disabled table
  if (game.winner) {
    const isMe = game.winner === myPlayerNumber;
    return (
      <>
        <motion.div
          className="flex-1 flex flex-col items-center justify-center min-h-screen p-4 gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          <SettingsButton />

          <WinCelebration
            winner={game.winner}
            winnerName={winnerName}
            isMe={isMe}
            onPlayAgain={handleEndGameClick}
            onHome={() => router.push('/')}
          />

          {/* Score display */}
          <div className="flex items-center gap-6 text-sm font-medium">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-player1" />
              <span className="text-text-primary">
                {game.player1_name}: {10 - p1Remaining} hit
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-player2" />
              <span className="text-text-primary">
                {game.player2_name ?? 'Waiting...'}: {10 - p2Remaining} hit
              </span>
            </div>
          </div>

          {/* Disabled table showing final state */}
          {myPlayerNumber && (
            <div className="opacity-60">
              <Table
                player1Cups={game.board.player1Cups}
                player2Cups={game.board.player2Cups}
                currentTurn={game.current_turn}
                myPlayer={myPlayerNumber}
                isMyTurn={false}
                throwsRemaining={0}
                onThrow={() => {}}
                lastThrowResult={null}
                animating={false}
                onAnimationComplete={() => {}}
                winner={game.winner}
              />
            </div>
          )}
        </motion.div>

        <EndGameDialog
          open={showEndDialog}
          onConfirm={handleEndGameConfirm}
          onCancel={handleEndGameCancel}
        />
      </>
    );
  }

  // Active game (waiting for opponent or playing)
  return (
    <>
      <motion.div
        className="flex-1 flex flex-col items-center justify-center min-h-screen p-4 gap-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <SettingsButton />

        <div className="flex items-center gap-4">
          <TurnIndicator
            currentPlayer={game.current_turn}
            isMyTurn={isMyTurn}
            playerName={opponentName}
            label={!isMyTurn && !game.player2_name ? 'Waiting for opponent to join...' : undefined}
          />
          <NotificationControls
            permissionState={permissionState}
            requestPermission={requestPermission}
            isMuted={isMuted}
            toggleMute={toggleMute}
          />
        </div>

        {/* Score display — cups remaining for each player */}
        <div className="flex items-center gap-6 text-sm font-medium">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-player1" />
            <span className="text-text-primary">
              {game.player1_name}: {10 - p1Remaining} hit
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-player2" />
            <span className="text-text-primary">
              {game.player2_name ?? 'Waiting...'}: {10 - p2Remaining} hit
            </span>
          </div>
        </div>

        {/* Game Table */}
        {myPlayerNumber && (
          <Table
            player1Cups={game.board.player1Cups}
            player2Cups={game.board.player2Cups}
            currentTurn={game.current_turn}
            myPlayer={myPlayerNumber}
            isMyTurn={isMyTurn}
            throwsRemaining={game.board.throwsRemaining}
            onThrow={handleThrow}
            lastThrowResult={displayedThrow}
            animating={animating}
            onAnimationComplete={handleAnimationComplete}
            winner={game.winner}
          />
        )}

        {error && (
          <motion.p className="text-red-400 text-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {error}
          </motion.p>
        )}

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
        onConfirm={handleEndGameConfirm}
        onCancel={handleEndGameCancel}
      />
    </>
  );
}

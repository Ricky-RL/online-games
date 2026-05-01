'use client';

import { use, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { usePoolGame } from '@/hooks/usePoolGame';
import { useGameSounds } from '@/hooks/useSound';
import { useNotifications } from '@/hooks/useNotifications';
import { PoolCanvas } from '@/components/pool/Canvas';
import { BallInHandOverlay } from '@/components/pool/BallInHandOverlay';
import { TurnIndicator } from '@/components/TurnIndicator';
import { SettingsButton } from '@/components/SettingsButton';
import { NotificationControls } from '@/components/NotificationControls';
import { EndGameDialog } from '@/components/EndGameDialog';
import { Shot, BallState, isSolid, isStripe } from '@/lib/pool/types';
import { isValidCueBallPlacement } from '@/lib/pool/physics';
import { Player } from '@/lib/types';

export default function PoolGamePage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = use(params);
  const router = useRouter();
  const {
    game, loading, error, deleted,
    takeShot, placeCueBall, forfeit, resetGame,
    replayShot, isReplaying, triggerReplay,
  } = usePoolGame(gameId);
  const { play } = useGameSounds();
  const [showForfeitDialog, setShowForfeitDialog] = useState(false);
  const [replayDone, setReplayDone] = useState(false);
  const previousBallsRef = useRef<BallState[] | null>(null);

  const getMyPlayer = useCallback((): Player | null => {
    const name = sessionStorage.getItem('player-name') || localStorage.getItem('player-name');
    if (!game) return null;
    if (name === game.player1_name) return 1;
    if (name === game.player2_name) return 2;
    return null;
  }, [game]);

  const myPlayer = getMyPlayer();
  const isMyTurn = game?.current_turn === myPlayer;
  const opponentName = myPlayer === 1 ? game?.player2_name : game?.player1_name;

  const { permissionState, requestPermission, isMuted, toggleMute } = useNotifications({
    gameId,
    isMyTurn: isMyTurn ?? false,
    opponentName: opponentName ?? null,
    gameType: 'pool',
  });

  const handleShotTaken = useCallback(async (shot: Shot) => {
    play('shot');
    previousBallsRef.current = game?.board.balls ?? null;
    await takeShot(shot);
  }, [takeShot, play, game]);

  const handleBallPlaced = useCallback(async (x: number, y: number) => {
    if (!game) return;
    if (!isValidCueBallPlacement(x, y, game.board.balls)) return;
    await placeCueBall(x, y);
  }, [placeCueBall, game]);

  const handleReplayComplete = useCallback(() => {
    setReplayDone(true);
  }, []);

  const handleForfeit = useCallback(async () => {
    await forfeit();
    setShowForfeitDialog(false);
  }, [forfeit]);

  const handlePlayAgain = useCallback(async () => {
    await resetGame();
    router.push('/pool');
  }, [resetGame, router]);

  const handleHome = useCallback(() => {
    router.push('/');
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-board border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || deleted || !game || !myPlayer) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-text-secondary mb-4">{error || 'Game not found'}</p>
          <button onClick={handleHome} className="px-4 py-2 bg-board text-white rounded-full">Home</button>
        </div>
      </div>
    );
  }

  const { board } = game;
  const myGroup = myPlayer === 1 ? board.player1Group : board.player2Group;

  if (board.phase === 'finished') {
    const winnerName = game.winner === 1 ? game.player1_name : game.player2_name;
    const iWon = game.winner === myPlayer;
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-surface border border-border rounded-3xl p-8 text-center max-w-sm w-full space-y-6"
        >
          <div className="text-4xl">{iWon ? '🏆' : '😔'}</div>
          <h2 className="text-2xl font-bold text-text-primary">
            {iWon ? 'You won!' : `${winnerName} wins!`}
          </h2>
          <div className="flex gap-3 justify-center">
            <button
              onClick={handlePlayAgain}
              className="px-6 py-3 bg-[#1B5E20] text-white font-medium rounded-xl hover:bg-[#2E7D32] transition-colors cursor-pointer"
            >
              Play Again
            </button>
            <button
              onClick={handleHome}
              className="px-6 py-3 border border-border text-text-primary font-medium rounded-xl hover:bg-surface-hover transition-colors cursor-pointer"
            >
              Home
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  const turnLabel = isMyTurn
    ? board.phase === 'ball-in-hand'
      ? 'Place the cue ball'
      : 'Your shot'
    : `${opponentName}'s turn`;

  return (
    <div className="h-dvh bg-background flex flex-col overflow-hidden" style={{ overscrollBehavior: 'none' }}>
      <header className="flex items-center justify-between px-4 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <button
            onClick={handleHome}
            className="p-1.5 rounded-lg hover:bg-surface transition-colors"
            aria-label="Home"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-secondary">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </button>
          <SettingsButton />
          <NotificationControls
            isMuted={isMuted}
            toggleMute={toggleMute}
            permissionState={permissionState}
            requestPermission={requestPermission}
          />
        </div>
        <div className="flex items-center gap-3">
          {myGroup && (
            <span className="text-xs font-medium px-2 py-1 rounded-full bg-surface border border-border text-text-secondary">
              You: {myGroup === 'solids' ? 'Solids (1-7)' : 'Stripes (9-15)'}
            </span>
          )}
          {board.lastShot && !isReplaying && (
            <button
              onClick={triggerReplay}
              className="text-xs font-medium px-2 py-1 rounded-full bg-surface border border-border text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors cursor-pointer"
            >
              Replay
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 relative flex items-center justify-center p-2 overflow-hidden">
        <BallInHandOverlay visible={board.phase === 'ball-in-hand' && isMyTurn} />
        <PoolCanvas
          balls={board.balls}
          isMyTurn={isMyTurn && !isReplaying}
          phase={board.phase}
          playerNumber={myPlayer}
          onShotTaken={handleShotTaken}
          onBallPlaced={handleBallPlaced}
          replayShot={replayShot}
          isReplaying={isReplaying}
          onReplayComplete={handleReplayComplete}
          previousBalls={previousBallsRef.current ?? undefined}
        />
      </main>

      <footer className="flex items-center justify-between px-4 py-2 border-t border-border">
        <TurnIndicator
          currentPlayer={game.current_turn}
          isMyTurn={isMyTurn}
          playerName={opponentName}
          label={turnLabel}
        />
        <button
          onClick={() => setShowForfeitDialog(true)}
          className="px-4 py-2 text-sm font-medium rounded-xl border border-player1/20 bg-player1/5 text-player1/80 hover:bg-player1/10 hover:border-player1/40 hover:text-player1 shadow-sm hover:shadow transition-all cursor-pointer"
        >
          End Game
        </button>
      </footer>

      <EndGameDialog
        open={showForfeitDialog}
        onConfirm={handleForfeit}
        onCancel={() => setShowForfeitDialog(false)}
      />
    </div>
  );
}

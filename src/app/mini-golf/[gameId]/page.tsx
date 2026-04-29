'use client';

import { use, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useMiniGolfGame } from '@/hooks/useMiniGolfGame';
import { useGameSounds } from '@/hooks/useSound';
import { useNotifications } from '@/hooks/useNotifications';
import { MiniGolfCanvas } from '@/components/mini-golf/Canvas';
import { StrokeCounter } from '@/components/mini-golf/StrokeCounter';
import { Scoreboard } from '@/components/mini-golf/Scoreboard';
import { EndGameScreen } from '@/components/mini-golf/EndGameScreen';
import { TurnIndicator } from '@/components/TurnIndicator';
import { SettingsButton } from '@/components/SettingsButton';
import { NotificationControls } from '@/components/NotificationControls';
import { EndGameDialog } from '@/components/EndGameDialog';
import { LEVELS } from '@/lib/mini-golf/levels';
import { Shot, GameStats, PENALTY_SCORE } from '@/lib/mini-golf/types';
import { playerIndex } from '@/lib/mini-golf/logic';
import { Player } from '@/lib/types';

export default function MiniGolfGamePage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = use(params);
  const router = useRouter();
  const { game, loading, error, deleted, takeShot, recordHoleResult, setReady, forfeit, resetGame } = useMiniGolfGame(gameId);
  const { play } = useGameSounds();
  const [showForfeitDialog, setShowForfeitDialog] = useState(false);
  const [stats, setStats] = useState<GameStats>({ holesInOne: [], mostBounces: { hole: 0, count: 0 }, closestCall: { hole: 0, speed: 0 } });
  const bounceCountRef = useRef(0);

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
    gameType: 'mini-golf',
  });

  const handleShotTaken = useCallback(async (shot: Shot) => {
    play('shot');
    bounceCountRef.current = 0;
    await takeShot(shot);
  }, [takeShot, play]);

  const handleHoleComplete = useCallback(async (strokes: number) => {
    if (strokes <= 1) {
      setStats(prev => ({ ...prev, holesInOne: [...prev.holesInOne, game!.board.currentHole] }));
    }
    if (bounceCountRef.current > stats.mostBounces.count) {
      setStats(prev => ({ ...prev, mostBounces: { hole: game!.board.currentHole, count: bounceCountRef.current } }));
    }
    await recordHoleResult(strokes);
  }, [recordHoleResult, game, stats.mostBounces.count]);

  const handleBounce = useCallback(() => {
    play('bounce');
    bounceCountRef.current++;
  }, [play]);

  const handleSink = useCallback(() => {
    play('sink');
  }, [play]);

  const handleSplash = useCallback(() => {
    play('splash');
  }, [play]);

  const handleForfeit = useCallback(async () => {
    await forfeit();
    setShowForfeitDialog(false);
  }, [forfeit]);

  const handlePlayAgain = useCallback(async () => {
    await resetGame();
    router.push('/mini-golf');
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
          <button onClick={handleHome} className="px-4 py-2 bg-board text-white rounded-full">
            Home
          </button>
        </div>
      </div>
    );
  }

  const { board } = game;
  const currentLevel = LEVELS[board.levels[board.currentHole]];

  if (board.phase === 'waiting') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
          <div className="w-8 h-8 border-2 border-board border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-secondary">Waiting for opponent...</p>
        </motion.div>
      </div>
    );
  }

  if (board.phase === 'finished') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <EndGameScreen
          board={board}
          winner={game.winner}
          player1Name={game.player1_name || 'Player 1'}
          player2Name={game.player2_name || 'Player 2'}
          myPlayer={myPlayer}
          stats={stats}
          onPlayAgain={handlePlayAgain}
          onHome={handleHome}
        />
      </div>
    );
  }

  if (board.phase === 'scoreboard') {
    const myIdx = playerIndex(myPlayer);
    const oppIdx = playerIndex(myPlayer === 1 ? 2 : 1);
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Scoreboard
          board={board}
          player1Name={game.player1_name || 'Player 1'}
          player2Name={game.player2_name || 'Player 2'}
          myPlayer={myPlayer}
          myReady={board.ready[myIdx]}
          opponentReady={board.ready[oppIdx]}
          onReady={setReady}
        />
      </div>
    );
  }

  const turnLabel = isMyTurn
    ? `Your turn · Hole ${board.currentHole + 1}/3`
    : `${opponentName} is playing · Hole ${board.currentHole + 1}/3 · Stroke ${board.currentStroke}`;

  return (
    <div className="min-h-screen bg-background flex flex-col" style={{ overscrollBehavior: 'none' }}>
      <header className="flex items-center justify-between px-4 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <SettingsButton />
          <NotificationControls
            isMuted={isMuted}
            toggleMute={toggleMute}
            permissionState={permissionState}
            requestPermission={requestPermission}
          />
        </div>
        <span className="text-sm font-medium text-text-primary">
          {currentLevel.name}
        </span>
      </header>

      <main className="flex-1 relative flex items-center justify-center p-2">
        <StrokeCounter
          stroke={board.currentStroke}
          holeNumber={board.currentHole + 1}
          totalHoles={3}
        />
        <MiniGolfCanvas
          levelId={board.levels[board.currentHole]}
          isMyTurn={isMyTurn}
          currentStroke={board.currentStroke}
          playerNumber={myPlayer}
          onShotTaken={handleShotTaken}
          onHoleComplete={handleHoleComplete}
          onBounce={handleBounce}
          onSink={handleSink}
          onSplash={handleSplash}
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
          className="text-sm text-text-secondary hover:text-text-primary transition-colors"
        >
          Forfeit
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

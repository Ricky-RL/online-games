'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useSnakesAndLaddersGame } from '@/hooks/useSnakesAndLaddersGame';
import { Board } from '@/components/snakes-and-ladders/Board';
import { DiceRoll } from '@/components/snakes-and-ladders/DiceRoll';
import { TurnReplay } from '@/components/snakes-and-ladders/TurnReplay';
import { PowerupToast } from '@/components/snakes-and-ladders/PowerupToast';
import { TurnIndicator } from '@/components/TurnIndicator';
import { WinCelebration } from '@/components/WinCelebration';
import { EndGameDialog } from '@/components/EndGameDialog';
import { useNotifications } from '@/hooks/useNotifications';
import type { SnakesAndLaddersState } from '@/lib/types';
import { useState, useEffect, useCallback } from 'react';

export default function SnakesAndLaddersGamePage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = use(params);
  const router = useRouter();
  const { game, loading, error, lastMove, deleted, replayEvents, isReplaying, activePowerup, replayLastMove, setReplayLastMove, replayAgain, rollDice, resetGame, skipReplay, dismissPowerup } = useSnakesAndLaddersGame(gameId);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [playerName, setPlayerName] = useState<string | null>(null);

  useEffect(() => {
    const name = sessionStorage.getItem('player-name') || localStorage.getItem('player-name');
    setPlayerName(name);
  }, []);

  const isPlayer1 = game?.player1_name === playerName;
  const isPlayer2 = game?.player2_name === playerName;
  const isParticipant = isPlayer1 || isPlayer2;
  const myPlayerNumber = isPlayer1 ? 1 : 2;
  const isMyTurn = isParticipant && game?.current_turn === myPlayerNumber && !game?.winner;
  const opponentName = isPlayer1 ? (game?.player2_name ?? null) : (game?.player1_name ?? null);

  useNotifications({
    gameId,
    isMyTurn: isMyTurn ?? false,
    opponentName,
    gameType: 'snakes-and-ladders',
  });

  useEffect(() => {
    if (deleted) {
      router.push('/');
    }
  }, [deleted, router]);

  const [canReplayAgain, setCanReplayAgain] = useState(false);

  const handleReplayComplete = useCallback(() => {
    skipReplay();
    setCanReplayAgain(true);
  }, [skipReplay]);

  useEffect(() => {
    if (isReplaying) {
      setCanReplayAgain(false);
    }
  }, [isReplaying]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-text-secondary"
        >
          Loading...
        </motion.div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-text-secondary">Game not found</p>
      </div>
    );
  }

  const board = game.board as SnakesAndLaddersState;

  return (
    <div className="flex flex-col items-center min-h-screen px-4 py-8 gap-6">
      {/* Turn replay overlay */}
      {isReplaying && replayEvents.length > 0 && (
        <TurnReplay events={replayEvents} onComplete={handleReplayComplete} onReplayMove={setReplayLastMove} />
      )}

      {/* Own-move powerup toast (non-blocking) */}
      {!isReplaying && (
        <PowerupToast powerup={activePowerup} onDismiss={dismissPowerup} />
      )}

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4"
      >
        <button
          onClick={() => setShowEndDialog(true)}
          className="text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-text-primary">Snakes & Ladders</h1>
      </motion.div>

      {/* Turn indicator */}
      {!game.winner && (
        <TurnIndicator
          currentPlayer={game.current_turn}
          isMyTurn={isMyTurn}
          playerName={opponentName}
        />
      )}

      {/* Board */}
      <Board board={board} lastMove={isReplaying ? replayLastMove : lastMove} />

      {/* Dice */}
      {!game.winner && (
        <>
          {/* Watch again button */}
          {canReplayAgain && !isReplaying && !game.winner && isMyTurn && (
            <motion.button
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              onClick={() => { setCanReplayAgain(false); replayAgain(); }}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-surface border border-border text-text-secondary hover:text-text-primary hover:border-text-secondary/30 transition-all cursor-pointer"
            >
              ↺ Watch again
            </motion.button>
          )}
          <DiceRoll
            lastRoll={board.lastRoll}
            isMyTurn={isMyTurn}
            onRoll={rollDice}
            disabled={isReplaying || !!game.winner}
          />
        </>
      )}

      {/* Player positions */}
      <div className="flex gap-6 text-sm text-text-secondary">
        <span>{game.player1_name || 'Player 1'}: square {board.players[1]}</span>
        <span>{game.player2_name || 'Player 2'}: square {board.players[2]}</span>
      </div>

      {/* Home / End Game buttons */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/')}
          className="px-4 py-2 text-sm font-medium rounded-xl border border-border bg-surface text-text-secondary hover:text-text-primary hover:border-text-secondary/30 shadow-sm hover:shadow transition-all cursor-pointer"
        >
          Home
        </button>
        {isParticipant && !game.winner && (
          <button
            onClick={() => setShowEndDialog(true)}
            className="px-4 py-2 text-sm font-medium rounded-xl border border-player1/20 bg-player1/5 text-player1/80 hover:bg-player1/10 hover:border-player1/40 hover:text-player1 shadow-sm hover:shadow transition-all cursor-pointer"
          >
            End Game
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}

      {/* Win celebration */}
      {game.winner && (
        <WinCelebration
          winner={game.winner}
          winnerName={game.winner === 1 ? game.player1_name : game.player2_name}
          isMe={isParticipant && game.winner === myPlayerNumber}
          onPlayAgain={resetGame}
          onHome={() => router.push('/')}
        />
      )}

      {/* End game dialog */}
      <EndGameDialog
        open={showEndDialog}
        onConfirm={async () => {
          await resetGame();
          router.push('/');
        }}
        onCancel={() => setShowEndDialog(false)}
      />
    </div>
  );
}

'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useSnakesAndLaddersGame } from '@/hooks/useSnakesAndLaddersGame';
import { Board } from '@/components/snakes-and-ladders/Board';
import { DiceRoll } from '@/components/snakes-and-ladders/DiceRoll';
import { TurnIndicator } from '@/components/TurnIndicator';
import { WinCelebration } from '@/components/WinCelebration';
import { EndGameDialog } from '@/components/EndGameDialog';
import { SettingsButton } from '@/components/SettingsButton';
import { useNotifications } from '@/hooks/useNotifications';
import type { SnakesAndLaddersState } from '@/lib/types';
import { useState, useEffect } from 'react';

export default function SnakesAndLaddersGamePage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = use(params);
  const router = useRouter();
  const { game, loading, error, lastMove, deleted, rollDice, resetGame } = useSnakesAndLaddersGame(gameId);
  const [showEndDialog, setShowEndDialog] = useState(false);

  const playerName = typeof window !== 'undefined'
    ? (sessionStorage.getItem('player-name') || localStorage.getItem('player-name'))
    : null;

  const isPlayer1 = game?.player1_name === playerName;
  const myPlayerNumber = isPlayer1 ? 1 : 2;
  const isMyTurn = game?.current_turn === myPlayerNumber && !game?.winner;
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
      <SettingsButton />

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
      <Board board={board} lastMove={lastMove} />

      {/* Dice */}
      {!game.winner && (
        <DiceRoll
          lastRoll={board.lastRoll}
          isMyTurn={isMyTurn}
          onRoll={rollDice}
          disabled={!!game.winner}
        />
      )}

      {/* Player positions */}
      <div className="flex gap-6 text-sm text-text-secondary">
        <span>{game.player1_name || 'Player 1'}: square {board.players[1]}</span>
        <span>{game.player2_name || 'Player 2'}: square {board.players[2]}</span>
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
          isMe={game.winner === myPlayerNumber}
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

'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useMonopolyGame } from '@/hooks/useMonopolyGame';
import { useGameSounds } from '@/hooks/useSound';
import { MonopolyBoardView } from '@/components/monopoly/MonopolyBoard';
import { PlayerPanel } from '@/components/monopoly/PlayerPanel';
import { DiceDisplay } from '@/components/monopoly/DiceDisplay';
import { PropertyCard } from '@/components/monopoly/PropertyCard';
import { JailDecision } from '@/components/monopoly/JailDecision';
import { GameOverSummary } from '@/components/monopoly/GameOverSummary';
import { BuildMenu } from '@/components/monopoly/BuildMenu';
import { TurnIndicator } from '@/components/TurnIndicator';
import { SettingsButton } from '@/components/SettingsButton';

export default function MonopolyGamePage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = use(params);
  const router = useRouter();
  const {
    game, loading, error, myPlayer, isMyTurn,
    roll, buy, pass, build, endMyTurn, payJailFee, rollForDoubles,
    buildableProperties, resetGame,
  } = useMonopolyGame(gameId);
  const { play } = useGameSounds();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-text-secondary">Loading game...</p>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">{error ?? 'Game not found'}</p>
      </div>
    );
  }

  const { board } = game;
  const player1Name = game.player1_name ?? 'Waiting...';
  const player2Name = game.player2_name ?? 'Waiting...';

  return (
    <div className="min-h-screen p-4 sm:p-6">
      <SettingsButton />

      {/* Back button */}
      <button
        onClick={() => router.push('/')}
        className="mb-4 text-sm text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
      >
        &larr; Back
      </button>

      <div className="max-w-7xl mx-auto">
        {/* Turn Indicator */}
        {board.phase !== 'game-over' && (
          <div className="mb-4">
            <TurnIndicator
              currentPlayer={board.activePlayer}
              isMyTurn={isMyTurn}
              playerName={board.activePlayer === 1 ? player1Name : player2Name}
            />
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left panel: Player info */}
          <div className="lg:w-64 space-y-4">
            <PlayerPanel board={board} player={1} name={player1Name} isActive={board.activePlayer === 1} />
            <PlayerPanel board={board} player={2} name={player2Name} isActive={board.activePlayer === 2} />
          </div>

          {/* Center: Board */}
          <div className="flex-1 flex flex-col items-center">
            <div className="overflow-auto">
              <MonopolyBoardView board={board} />
            </div>
          </div>

          {/* Right panel: Actions */}
          <div className="lg:w-72 space-y-4">
            {/* Dice display */}
            {board.lastRoll && <DiceDisplay lastRoll={board.lastRoll} />}

            {/* Phase-specific actions */}
            {board.phase === 'game-over' && (
              <GameOverSummary
                board={board}
                player1Name={player1Name}
                player2Name={player2Name}
                onPlayAgain={resetGame}
              />
            )}

            {board.phase === 'jail-decision' && isMyTurn && (
              <JailDecision
                board={board}
                player={myPlayer!}
                onPayFee={payJailFee}
                onRollForDoubles={rollForDoubles}
              />
            )}

            {board.phase === 'buy-decision' && isMyTurn && (
              <PropertyCard board={board} player={myPlayer!} onBuy={() => { play('bounce'); buy(); }} onPass={pass} />
            )}

            {board.phase === 'roll' && isMyTurn && (
              <motion.button
                onClick={() => { play('drop'); roll(); }}
                className="w-full px-6 py-3 rounded-xl bg-player1 text-white font-semibold hover:opacity-90 transition-opacity cursor-pointer"
                whileTap={{ scale: 0.95 }}
              >
                Roll Dice
              </motion.button>
            )}

            {board.phase === 'end-turn' && isMyTurn && (
              <div className="space-y-3">
                {buildableProperties.length > 0 && (
                  <BuildMenu
                    board={board}
                    buildableProperties={buildableProperties}
                    onBuild={build}
                    onDone={endMyTurn}
                  />
                )}
                {buildableProperties.length === 0 && (
                  <motion.button
                    onClick={endMyTurn}
                    className="w-full px-6 py-3 rounded-xl bg-surface border border-border text-text-primary font-medium hover:bg-background transition-colors cursor-pointer"
                    whileTap={{ scale: 0.95 }}
                  >
                    {board.lastRoll && board.lastRoll.dice[0] === board.lastRoll.dice[1] ? 'Roll Again (Doubles!)' : 'End Turn'}
                  </motion.button>
                )}
              </div>
            )}

            {!isMyTurn && board.phase !== 'game-over' && (
              <p className="text-center text-sm text-text-secondary py-4">
                Waiting for opponent...
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

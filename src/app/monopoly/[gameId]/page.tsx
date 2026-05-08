'use client';

import { use, useEffect, useRef, useState } from 'react';
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
import { CardDisplay } from '@/components/monopoly/CardDisplay';
import { TurnIndicator } from '@/components/TurnIndicator';
import type { MonopolyBoard as MonopolyBoardState } from '@/lib/monopoly/types';

function formatDelta(delta: number): string {
  if (delta === 0) return '$0';
  return `${delta > 0 ? '+' : '-'}$${Math.abs(delta)}`;
}

export default function MonopolyGamePage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = use(params);
  const router = useRouter();
  const previousBoardRef = useRef<MonopolyBoardState | null>(null);
  const previousTurnKeyRef = useRef<string | null>(null);
  const [lastCashDelta, setLastCashDelta] = useState<[number, number]>([0, 0]);
  const [turnCashDelta, setTurnCashDelta] = useState<[number, number]>([0, 0]);
  const {
    game, loading, error, deleted, myPlayer, isMyTurn, lastMove,
    roll, buy, pass, build, endMyTurn, payJailFee, rollForDoubles, dismissCard,
    buildableProperties, resetGame, forfeitGame,
  } = useMonopolyGame(gameId);
  const { play } = useGameSounds();

  useEffect(() => {
    if (!game) return;

    const currentBoard = game.board;
    const currentTurnKey = `${currentBoard.currentTurn}-${currentBoard.activePlayer}`;
    const previousBoard = previousBoardRef.current;

    if (!previousBoard) {
      previousBoardRef.current = currentBoard;
      previousTurnKeyRef.current = currentTurnKey;
      setTurnCashDelta([0, 0]);
      return;
    }

    const previousTurnKey = previousTurnKeyRef.current;
    const isNewTurn = previousTurnKey !== currentTurnKey;
    const deltaOne = currentBoard.players[0].cash - previousBoard.players[0].cash;
    const deltaTwo = currentBoard.players[1].cash - previousBoard.players[1].cash;

    if (isNewTurn) {
      setTurnCashDelta([0, 0]);
    }

    if (deltaOne !== 0 || deltaTwo !== 0) {
      setLastCashDelta([deltaOne, deltaTwo]);
      setTurnCashDelta((previous) => {
        const base = isNewTurn ? ([0, 0] as [number, number]) : previous;
        return [base[0] + deltaOne, base[1] + deltaTwo];
      });
    }

    previousBoardRef.current = currentBoard;
    previousTurnKeyRef.current = currentTurnKey;
  }, [game]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-text-secondary">Loading game...</p>
      </div>
    );
  }

  if (deleted) {
    router.push('/');
    return null;
  }

  if (error || !game) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-text-secondary mb-4">{error ?? 'Game not found'}</p>
          <button onClick={() => router.push('/')} className="px-4 py-2 bg-board text-white rounded-full cursor-pointer">Home</button>
        </div>
      </div>
    );
  }

  const { board } = game;
  const player1Name = game.player1_name ?? 'Waiting...';
  const player2Name = game.player2_name ?? 'Waiting...';

  return (
    <div className="min-h-screen p-2 sm:p-4 md:p-6">
      {/* Back button */}
      <button
        onClick={() => router.push('/')}
        className="mb-2 sm:mb-4 text-sm text-text-secondary hover:text-text-primary transition-colors cursor-pointer min-h-[44px] flex items-center"
      >
        &larr; Back
      </button>

      <div className="max-w-7xl mx-auto">
        {/* Turn Indicator */}
        {board.phase !== 'game-over' && (
          <div className="mb-2 sm:mb-4">
            <TurnIndicator
              currentPlayer={board.activePlayer}
              isMyTurn={isMyTurn}
              playerName={board.activePlayer === 1 ? player1Name : player2Name}
            />
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-3 sm:gap-4 lg:gap-6">
          {/* Player panels - horizontal on mobile, vertical sidebar on desktop */}
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-2 sm:gap-4 lg:w-64">
            <PlayerPanel
              board={board}
              player={1}
              name={player1Name}
              isActive={board.activePlayer === 1}
              lastCashDelta={lastCashDelta[0]}
              turnCashDelta={turnCashDelta[0]}
            />
            <PlayerPanel
              board={board}
              player={2}
              name={player2Name}
              isActive={board.activePlayer === 2}
              lastCashDelta={lastCashDelta[1]}
              turnCashDelta={turnCashDelta[1]}
            />
          </div>

          {/* Center: Board */}
          <div className="flex-1 flex flex-col items-center overflow-visible">
            <MonopolyBoardView board={board} lastMove={lastMove} />
            <div className="mt-2 sm:mt-3 w-full max-w-md grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-border bg-surface/60 px-2.5 py-2 text-center">
                <p className="text-[10px] sm:text-xs text-text-secondary">{player1Name} turn change</p>
                <p className={`text-sm sm:text-base font-semibold ${turnCashDelta[0] > 0 ? 'text-emerald-600' : turnCashDelta[0] < 0 ? 'text-red-500' : 'text-text-primary'}`}>
                  {formatDelta(turnCashDelta[0])}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-surface/60 px-2.5 py-2 text-center">
                <p className="text-[10px] sm:text-xs text-text-secondary">{player2Name} turn change</p>
                <p className={`text-sm sm:text-base font-semibold ${turnCashDelta[1] > 0 ? 'text-emerald-600' : turnCashDelta[1] < 0 ? 'text-red-500' : 'text-text-primary'}`}>
                  {formatDelta(turnCashDelta[1])}
                </p>
              </div>
            </div>
          </div>

          {/* Actions panel */}
          <div className="lg:w-72 space-y-3 sm:space-y-4">
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

            {board.phase === 'card-drawn' && board.drawnCard && (
              <CardDisplay
                card={board.drawnCard}
                isMyTurn={isMyTurn}
                onAcknowledge={dismissCard}
              />
            )}

            {board.phase === 'buy-decision' && isMyTurn && (
              <PropertyCard board={board} player={myPlayer!} onBuy={() => { play('bounce'); buy(); }} onPass={pass} />
            )}

            {board.phase === 'roll' && isMyTurn && (
              <motion.button
                onClick={() => { play('drop'); roll(); }}
                className="w-full px-6 py-3 min-h-[48px] rounded-xl bg-player1 text-white font-semibold hover:opacity-90 transition-opacity cursor-pointer"
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
                    className="w-full px-6 py-3 min-h-[48px] rounded-xl bg-surface border border-border text-text-primary font-medium hover:bg-background transition-colors cursor-pointer"
                    whileTap={{ scale: 0.95 }}
                  >
                    {board.lastRoll && board.lastRoll.dice[0] === board.lastRoll.dice[1] ? 'Roll Again (Doubles!)' : 'End Turn'}
                  </motion.button>
                )}
              </div>
            )}

            {!isMyTurn && board.phase !== 'game-over' && (
              <p className="text-center text-sm text-text-secondary py-3 sm:py-4">
                Waiting for opponent...
              </p>
            )}

            {board.phase !== 'game-over' && myPlayer && (
              <motion.button
                onClick={() => { if (window.confirm('Are you sure you want to forfeit? This cannot be undone.')) forfeitGame(); }}
                className="w-full mt-3 sm:mt-4 px-4 py-2 min-h-[44px] rounded-xl border border-red-500/30 text-red-400 text-sm font-medium hover:bg-red-500/10 transition-colors cursor-pointer"
                whileTap={{ scale: 0.95 }}
              >
                Forfeit Game
              </motion.button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

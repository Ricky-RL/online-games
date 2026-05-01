'use client';

import { use, useMemo, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMemoryGame, type MemoryGame } from '@/hooks/useMemoryGame';
import { useGameSounds } from '@/hooks/useSound';
import { useNotifications } from '@/hooks/useNotifications';
import { NotificationControls } from '@/components/NotificationControls';
import { MemoryBoard } from '@/components/memory/MemoryBoard';
import { ScoreDisplay } from '@/components/memory/ScoreDisplay';
import { TurnIndicator } from '@/components/TurnIndicator';
import { WinCelebration } from '@/components/WinCelebration';
import { EndGameDialog } from '@/components/EndGameDialog';
import { isGameOver, getWinner, isDraw } from '@/lib/memory-logic';
import type { Player } from '@/lib/types';

type GameStatus = 'waiting' | 'playing' | 'finished';

function getGameStatus(game: MemoryGame): GameStatus {
  if (game.winner !== null || isGameOver(game.board)) return 'finished';
  if (game.player1_id && game.player2_id) return 'playing';
  return 'waiting';
}

function getMyName(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('player-name') || localStorage.getItem('player-name');
}

const REVEAL_DURATION_MS = 2500;

export default function MemoryGamePage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = use(params);
  const { game, loading, error, deleted, firstFlip, flipCard, resetGame } = useMemoryGame(gameId);
  const { play } = useGameSounds();
  const router = useRouter();
  const [myName, setMyName] = useState<string | null>(null);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [revealedCards, setRevealedCards] = useState<[number, number] | null>(null);
  const prevLastFlipped = useRef<[number, number] | null>(null);
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevStatus = useRef<string | null>(null);

  useEffect(() => {
    setMyName(getMyName());
  }, []);

  useEffect(() => {
    if (deleted) router.push('/');
  }, [deleted, router]);

  const gameStatus = useMemo(() => {
    if (!game) return null;
    return getGameStatus(game);
  }, [game]);

  // Play win sound when game transitions to finished
  useEffect(() => {
    if (gameStatus === 'finished' && prevStatus.current === 'playing') {
      play('win');
    }
    prevStatus.current = gameStatus;
  }, [gameStatus, play]);

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

  // 2.5 second reveal timer for non-matching cards
  // The opponent (whose turn it now is) sees cards for 2.5s to memorize.
  // The flipper's cards go back immediately since they already saw them.
  useEffect(() => {
    if (!game) return;

    const { lastFlipped, lastFlipResult } = game.board;

    // Detect a new lastFlipped value (different from previous)
    const isNewFlip =
      lastFlipped !== null &&
      (prevLastFlipped.current === null ||
        prevLastFlipped.current[0] !== lastFlipped[0] ||
        prevLastFlipped.current[1] !== lastFlipped[1]);

    prevLastFlipped.current = lastFlipped;

    if (isNewFlip && lastFlipResult === 'no-match' && lastFlipped) {
      if (revealTimerRef.current) {
        clearTimeout(revealTimerRef.current);
        revealTimerRef.current = null;
      }

      // I'm the opponent (it's now my turn) — show cards for 2.5s
      if (isMyTurn) {
        setRevealedCards(lastFlipped);
        revealTimerRef.current = setTimeout(() => {
          setRevealedCards(null);
          revealTimerRef.current = null;
        }, REVEAL_DURATION_MS);
      } else {
        // I'm the flipper — cards go back immediately
        setRevealedCards(null);
      }
    } else if (isNewFlip && lastFlipResult === 'match') {
      setRevealedCards(null);
      if (revealTimerRef.current) {
        clearTimeout(revealTimerRef.current);
        revealTimerRef.current = null;
      }
    }
  }, [game, isMyTurn]);

  // Cleanup timer only on unmount
  useEffect(() => {
    return () => {
      if (revealTimerRef.current) {
        clearTimeout(revealTimerRef.current);
      }
    };
  }, []);

  const { permissionState, requestPermission, isMuted, toggleMute } = useNotifications({
    gameId,
    isMyTurn,
    opponentName,
    gameType: 'memory',
  });

  // Determine turn indicator label
  const turnLabel = useMemo(() => {
    if (!game) return '';
    if (game.board.lastFlipResult === 'match' && isMyTurn) {
      return 'You matched! Go again!';
    }
    if (isMyTurn) {
      return 'Your turn — flip two cards!';
    }
    return `Waiting for ${opponentName ?? 'opponent'}...`;
  }, [game, isMyTurn, opponentName]);

  const boardDisabled = useMemo(() => {
    if (!game || !myPlayerNumber) return true;
    if (!isMyTurn) return true;
    if (revealedCards !== null) return true;
    if (gameStatus === 'finished') return true;
    return false;
  }, [game, myPlayerNumber, isMyTurn, revealedCards, gameStatus]);

  const handleFlipCard = useCallback(
    async (cardIndex: number) => {
      play('drop');
      await flipCard(cardIndex);
    },
    [flipCard, play]
  );

  const handleReset = useCallback(async () => {
    await resetGame();
  }, [resetGame]);

  const handleEndGameClick = useCallback(() => {
    setShowEndDialog(true);
  }, []);

  const handleEndGameCancel = useCallback(() => {
    setShowEndDialog(false);
  }, []);

  const handleEndGameConfirm = useCallback(async () => {
    setShowEndDialog(false);
    await resetGame();
    router.push('/');
  }, [resetGame, router]);

  // Loading state
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-text-secondary text-sm">Loading game...</div>
      </div>
    );
  }

  // Error state
  if (error && !game) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <div className="text-player1 text-sm">Error: {error}</div>
        <button
          onClick={() => router.push('/memory')}
          className="px-4 py-2 text-sm font-medium rounded-xl border border-border bg-surface text-text-secondary hover:text-text-primary hover:border-text-secondary/30 shadow-sm hover:shadow transition-all cursor-pointer"
        >
          Back to Memory
        </button>
      </div>
    );
  }

  // Deleted state
  if (deleted || !game) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <div className="text-text-secondary text-sm">Game not found</div>
        <button
          onClick={() => router.push('/memory')}
          className="px-4 py-2 text-sm font-medium rounded-xl border border-border bg-surface text-text-secondary hover:text-text-primary hover:border-text-secondary/30 shadow-sm hover:shadow transition-all cursor-pointer"
        >
          Back to Memory
        </button>
      </div>
    );
  }

  // Game Over state
  if (gameStatus === 'finished') {
    const winner = getWinner(game.board);
    const gameDraw = isDraw(game.board);

    if (gameDraw) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center gap-6 p-4">
          <div className="text-center">
            <p className="text-2xl font-semibold text-text-secondary mb-2">
              It&apos;s a draw!
            </p>
            <p className="text-sm text-text-secondary">
              {game.board.player1Score} - {game.board.player2Score}. Good game!
            </p>
          </div>
          <ScoreDisplay
            player1Name={game.player1_name}
            player2Name={game.player2_name}
            player1Score={game.board.player1Score}
            player2Score={game.board.player2Score}
            currentTurn={game.current_turn}
            myPlayerNumber={myPlayerNumber}
            totalPairs={10}
          />
          <div className="opacity-60">
            <MemoryBoard
              board={game.board}
              firstFlip={null}
              revealedCards={null}
              isMyTurn={false}
              myPlayerNumber={myPlayerNumber}
              onCardClick={() => {}}
              disabled={true}
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/')}
              className="px-6 py-3 text-base font-medium rounded-xl border border-border bg-surface text-text-secondary hover:text-text-primary hover:border-text-secondary/30 shadow-sm hover:shadow transition-all cursor-pointer"
            >
              Home
            </button>
            <button
              onClick={handleReset}
              className="px-6 py-3 text-base font-medium rounded-xl text-white hover:opacity-90 transition-colors shadow-lg cursor-pointer"
              style={{ backgroundColor: '#9B59B6' }}
            >
              Play Again
            </button>
          </div>
        </div>
      );
    }

    // There is a winner
    const winnerName = winner === 1 ? game.player1_name : game.player2_name;
    const isMe = winner === myPlayerNumber;

    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 p-4">
        <WinCelebration
          winner={winner as Player}
          winnerName={winnerName}
          isMe={isMe}
          onPlayAgain={handleReset}
          onHome={() => router.push('/')}
        />
        <ScoreDisplay
          player1Name={game.player1_name}
          player2Name={game.player2_name}
          player1Score={game.board.player1Score}
          player2Score={game.board.player2Score}
          currentTurn={game.current_turn}
          myPlayerNumber={myPlayerNumber}
          totalPairs={10}
        />
        <div className="opacity-60">
          <MemoryBoard
            board={game.board}
            firstFlip={null}
            revealedCards={null}
            isMyTurn={false}
            myPlayerNumber={myPlayerNumber}
            onCardClick={() => {}}
            disabled={true}
          />
        </div>
      </div>
    );
  }

  // Active game (waiting or playing)
  return (
    <>
      <div className="flex-1 flex flex-col items-center justify-center gap-5 p-4">
        {/* Waiting for opponent banner */}
        {gameStatus === 'waiting' && (
          <div className="px-4 py-2 rounded-xl border border-[#9B59B6]/30 bg-[#9B59B6]/5 text-sm text-[#9B59B6]">
            Waiting for opponent to join...
          </div>
        )}

        {/* Score Display */}
        <ScoreDisplay
          player1Name={game.player1_name}
          player2Name={game.player2_name}
          player1Score={game.board.player1Score}
          player2Score={game.board.player2Score}
          currentTurn={game.current_turn}
          myPlayerNumber={myPlayerNumber}
          totalPairs={10}
        />

        {/* Turn Indicator + Notifications */}
        <div className="flex items-center gap-4">
          <TurnIndicator
            currentPlayer={game.current_turn}
            isMyTurn={isMyTurn}
            playerName={opponentName}
            label={turnLabel}
          />
          <NotificationControls
            permissionState={permissionState}
            requestPermission={requestPermission}
            isMuted={isMuted}
            toggleMute={toggleMute}
          />
        </div>

        {/* Game Board */}
        <MemoryBoard
          board={game.board}
          firstFlip={firstFlip}
          revealedCards={revealedCards}
          isMyTurn={isMyTurn}
          myPlayerNumber={myPlayerNumber}
          onCardClick={handleFlipCard}
          disabled={boardDisabled}
        />

        {/* Action buttons */}
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
      </div>
      <EndGameDialog
        open={showEndDialog}
        onConfirm={handleEndGameConfirm}
        onCancel={handleEndGameCancel}
      />
    </>
  );
}

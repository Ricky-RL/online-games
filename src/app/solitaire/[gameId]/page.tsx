'use client';

import { use, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSolitaireGame } from '@/hooks/useSolitaireGame';
import { SolitaireBoard } from '@/components/solitaire/Board';
import { EndGameDialog } from '@/components/EndGameDialog';
import { SolitaireHowToPlay } from '@/components/solitaire/SolitaireHowToPlay';
import { WinCelebration } from '@/components/WinCelebration';
import { determineSolitaireWinner } from '@/lib/solitaire-logic';
import type { SolitaireGameState, SolitaireResult } from '@/lib/solitaire-types';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function SolitaireGamePage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = use(params);
  const { game, loading, error, deleted, myPlayerNumber, isMyRound, submitResult, resetGame } = useSolitaireGame(gameId);
  const router = useRouter();
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (deleted) router.push('/');
  }, [deleted, router]);

  // localStorage persistence
  const storageKey = `solitaire-${gameId}-${myPlayerNumber}`;

  const getSavedState = useCallback((): SolitaireGameState | null => {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      parsed.faceUp = new Set(parsed.faceUp);
      return parsed;
    } catch { return null; }
  }, [storageKey]);

  const handleStateChange = useCallback((state: SolitaireGameState) => {
    localStorage.setItem(storageKey, JSON.stringify({
      ...state,
      faceUp: [...state.faceUp],
    }));
  }, [storageKey]);

  const handleWin = useCallback(async (moves: number, timeSeconds: number, startedAt: string) => {
    if (submitted) return;
    setSubmitted(true);
    localStorage.removeItem(storageKey);
    const result: SolitaireResult = {
      moves,
      time_seconds: timeSeconds,
      completed: true,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
    };
    await submitResult(result);
  }, [submitted, storageKey, submitResult]);


  const handleEndGame = useCallback(async () => {
    await resetGame();
    router.push('/');
  }, [resetGame, router]);

  if (loading) {
    return <div className="flex-1 flex items-center justify-center"><div className="text-text-secondary text-sm">Loading game...</div></div>;
  }

  if (error) {
    return <div className="flex-1 flex items-center justify-center"><div className="text-player1 text-sm">Error: {error}</div></div>;
  }

  if (!game) {
    return <div className="flex-1 flex items-center justify-center"><div className="text-text-secondary text-sm">Game not found</div></div>;
  }

  const myResult = myPlayerNumber === 1 ? game.board.player1_result : game.board.player2_result;

  // Both players have submitted — show comparison
  if (game.board.player1_result && game.board.player2_result) {
    const winner = determineSolitaireWinner(game.board.player1_result, game.board.player2_result);
    const winnerName = winner === 1 ? game.player1_name : winner === 2 ? game.player2_name : null;
    const isMe = winner === myPlayerNumber;

    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
        {winner === 0 ? (
          <div className="text-center">
            <p className="text-2xl font-semibold text-text-secondary mb-2">It&apos;s a draw!</p>
            <p className="text-sm text-text-secondary">Both players failed to complete the deal.</p>
          </div>
        ) : (
          <WinCelebration winner={winner} winnerName={winnerName} isMe={isMe} onPlayAgain={handleEndGame} onHome={handleEndGame} />
        )}
        <div className="flex gap-8 mt-4">
          <div className="text-center">
            <p className="text-xs text-text-secondary mb-1">{game.player1_name}</p>
            <p className="text-lg font-bold text-text-primary">
              {game.board.player1_result.completed ? `${game.board.player1_result.moves} moves` : 'Gave up'}
            </p>
            {game.board.player1_result.completed && (
              <p className="text-sm text-text-secondary">{formatTime(game.board.player1_result.time_seconds)}</p>
            )}
          </div>
          <div className="text-center">
            <p className="text-xs text-text-secondary mb-1">{game.player2_name}</p>
            <p className="text-lg font-bold text-text-primary">
              {game.board.player2_result.completed ? `${game.board.player2_result.moves} moves` : 'Gave up'}
            </p>
            {game.board.player2_result.completed && (
              <p className="text-sm text-text-secondary">{formatTime(game.board.player2_result.time_seconds)}</p>
            )}
          </div>
        </div>
        <button onClick={handleEndGame} className="mt-4 px-6 py-3 text-base font-medium rounded-xl bg-board text-white hover:bg-board-surface transition-colors cursor-pointer">
          Home
        </button>
      </div>
    );
  }

  // Current player already submitted — waiting screen
  if (myResult) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8 text-center">
        <div className="text-4xl">♠️</div>
        <h2 className="text-2xl font-bold text-text-primary">
          {myResult.completed ? `Completed in ${myResult.moves} moves (${formatTime(myResult.time_seconds)})` : `Gave up after ${myResult.moves} moves`}
        </h2>
        <p className="text-text-secondary">
          {game.player2_name ? `Waiting for ${myPlayerNumber === 1 ? game.player2_name : game.player1_name} to play...` : 'Challenge sent! Waiting for opponent to join...'}
        </p>
        <button onClick={() => router.push('/')} className="mt-4 px-6 py-3 text-base font-medium rounded-xl border border-border bg-surface text-text-secondary hover:text-text-primary transition-colors cursor-pointer">
          Back to Home
        </button>
      </div>
    );
  }

  // Not my round yet (Player 2 waiting for Player 1)
  if (!isMyRound) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8 text-center">
        <div className="text-4xl">♠️</div>
        <h2 className="text-2xl font-bold text-text-primary">Waiting for opponent...</h2>
        <p className="text-text-secondary">
          {game.player1_name} is playing their round. You&apos;ll be notified when it&apos;s your turn.
        </p>
        <button onClick={() => router.push('/')} className="mt-4 px-6 py-3 text-base font-medium rounded-xl border border-border bg-surface text-text-secondary hover:text-text-primary transition-colors cursor-pointer">
          Back to Home
        </button>
      </div>
    );
  }

  // Active play
  const savedState = getSavedState();

  return (
    <>
      <div className="flex-1 flex flex-col items-center justify-center p-2 sm:p-4 relative">
        {/* How to Play button */}
        <button
          onClick={() => setShowHowToPlay(true)}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full border border-border bg-surface text-text-secondary hover:text-text-primary hover:border-text-secondary/30 shadow-sm transition-all cursor-pointer text-sm font-semibold"
          aria-label="How to play"
        >
          ?
        </button>
        <SolitaireBoard
          deck={game.board.deck}
          onWin={handleWin}
          savedState={savedState}
          onStateChange={handleStateChange}
        />
        <div className="flex items-center gap-3 mt-4">
          <button onClick={() => router.push('/')} className="px-4 py-2 text-sm font-medium rounded-xl border border-border bg-surface text-text-secondary hover:text-text-primary hover:border-text-secondary/30 shadow-sm hover:shadow transition-all cursor-pointer">
            Home
          </button>
          <button onClick={() => setShowEndDialog(true)} className="px-4 py-2 text-sm font-medium rounded-xl border border-player1/20 bg-player1/5 text-player1/80 hover:bg-player1/10 hover:border-player1/40 hover:text-player1 shadow-sm hover:shadow transition-all cursor-pointer">
            End Game
          </button>
        </div>
      </div>
      <EndGameDialog open={showEndDialog} onConfirm={handleEndGame} onCancel={() => setShowEndDialog(false)} />
      <SolitaireHowToPlay
        open={showHowToPlay}
        onClose={() => setShowHowToPlay(false)}
      />
    </>
  );
}

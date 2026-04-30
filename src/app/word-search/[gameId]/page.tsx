'use client';

import { use, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useWordSearchGame } from '@/hooks/useWordSearchGame';
import { Grid } from '@/components/word-search/Grid';
import { WordList } from '@/components/word-search/WordList';
import { Timer, getElapsedSeconds } from '@/components/word-search/Timer';
import { Results } from '@/components/word-search/Results';
import { EndGameDialog } from '@/components/EndGameDialog';
import { SettingsButton } from '@/components/SettingsButton';
import type { WordSearchBoardState } from '@/lib/word-search-types';

export default function WordSearchGamePage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = use(params);
  const router = useRouter();
  const { game, loading, deleted, findWord, submitResult, resetGame, myResult, opponentResult, bothSubmitted } = useWordSearchGame(gameId);

  const [timerStarted, setTimerStarted] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const startTimeRef = useRef<number | null>(null);

  const playerName = typeof window !== 'undefined'
    ? (sessionStorage.getItem('player-name') || localStorage.getItem('player-name'))
    : null;

  const handleWordFound = useCallback((word: string) => {
    if (!timerStarted) {
      setTimerStarted(true);
      startTimeRef.current = Date.now();
    }
    findWord(word);
  }, [timerStarted, findWord]);

  const handleFirstInteraction = useCallback(() => {
    if (!timerStarted) {
      setTimerStarted(true);
      startTimeRef.current = Date.now();
    }
  }, [timerStarted]);

  const handleSubmit = useCallback(async () => {
    if (submitted || !startTimeRef.current || !game) return;
    setSubmitted(true);

    const board = game.board as WordSearchBoardState;
    const timeUsed = getElapsedSeconds(startTimeRef.current);
    await submitResult({
      foundWords: board.foundWords,
      timeUsed,
      startedAt: new Date(startTimeRef.current).toISOString(),
      submittedAt: new Date().toISOString(),
    });
  }, [submitted, game, submitResult]);

  const handleTimeUp = useCallback(() => {
    handleSubmit();
  }, [handleSubmit]);

  const handleEndGame = useCallback(async () => {
    await resetGame();
    router.push('/');
  }, [resetGame, router]);

  if (deleted) {
    router.push('/');
    return null;
  }

  if (loading || !game) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <div className="text-text-secondary">Loading...</div>
      </div>
    );
  }

  const board = game.board as WordSearchBoardState;
  if (!board.foundWords) board.foundWords = [];
  const myPlayerNumber = game.player1_name === playerName ? 1 : 2;
  const allWords = board.words.map((w) => w.word);

  // Already submitted — show waiting or results
  if (myResult || submitted) {
    if (bothSubmitted) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center min-h-screen px-4 py-8">
          <SettingsButton />
          <Results
            board={board}
            player1Name={game.player1_name || 'Player 1'}
            player2Name={game.player2_name || 'Player 2'}
            winner={game.winner as 1 | 2 | null}
            isDraw={game.winner === null && bothSubmitted}
          />
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            onClick={() => router.push('/')}
            className="mt-8 px-6 py-3 rounded-xl bg-surface border border-border text-text-primary font-medium hover:bg-background transition-colors cursor-pointer"
          >
            Home
          </motion.button>
        </div>
      );
    }

    // Waiting for opponent
    const opponentName = myPlayerNumber === 1 ? (game.player2_name || 'Opponent') : (game.player1_name || 'Opponent');
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen px-4 gap-4">
        <SettingsButton />
        <div className="text-2xl font-bold text-text-primary">
          You found {myResult?.foundWords.length ?? board.foundWords.length}/{allWords.length} words
        </div>
        <div className="text-text-secondary">
          {opponentName} hasn&apos;t played yet.
        </div>
        <button
          onClick={() => router.push('/')}
          className="mt-4 px-6 py-3 rounded-xl bg-surface border border-border text-text-primary font-medium hover:bg-background transition-colors cursor-pointer"
        >
          Home
        </button>
      </div>
    );
  }

  // Active game — playing
  return (
    <div className="flex-1 flex flex-col items-center min-h-screen px-4 py-6 gap-4">
      <SettingsButton />

      {/* Header: theme + timer */}
      <div className="flex items-center justify-between w-full max-w-md">
        <div className="text-sm text-text-secondary capitalize">{board.theme} pack</div>
        <Timer timeLimit={board.timeLimit} started={timerStarted} onTimeUp={handleTimeUp} />
      </div>

      {/* Grid */}
      <Grid
        grid={board.grid}
        words={board.words}
        foundWords={board.foundWords}
        onWordFound={handleWordFound}
        onFirstInteraction={handleFirstInteraction}
        disabled={submitted}
      />

      {/* Word list */}
      <WordList words={allWords} foundWords={board.foundWords} />

      {/* Submit button */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: timerStarted ? 1 : 0.5 }}
        onClick={handleSubmit}
        disabled={!timerStarted}
        className="mt-4 px-8 py-3 rounded-xl bg-green-600 text-white font-semibold hover:bg-green-500 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Done ({board.foundWords.length}/{allWords.length})
      </motion.button>

      <button
        onClick={() => setShowEndDialog(true)}
        className="mt-2 px-4 py-2 text-sm font-medium rounded-xl border border-player1/20 bg-player1/5 text-player1/80 hover:bg-player1/10 hover:border-player1/40 hover:text-player1 shadow-sm hover:shadow transition-all cursor-pointer"
      >
        End Game
      </button>

      {!timerStarted && (
        <p className="text-xs text-text-secondary">Click letters to select them</p>
      )}

      <EndGameDialog
        open={showEndDialog}
        onConfirm={handleEndGame}
        onCancel={() => setShowEndDialog(false)}
      />
    </div>
  );
}

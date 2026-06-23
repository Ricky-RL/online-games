'use client';

import { use, useMemo, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useWordleTogetherGame } from '@/hooks/useWordleTogetherGame';
import { evaluateGuess, isValidGuess } from '@/lib/wordle-logic';
import { WordleBoard } from '@/components/wordle/WordleBoard';
import { WordleKeyboard } from '@/components/wordle/WordleKeyboard';
import { SettingsButton } from '@/components/SettingsButton';
import { WinCelebration } from '@/components/WinCelebration';
import { EndGameDialog } from '@/components/EndGameDialog';
import { isDraw } from '@/lib/wordle-together-logic';
import type { LetterState, WordleGuess, KeyboardState } from '@/lib/wordle-types';

function getMyName(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('player-name') || localStorage.getItem('player-name');
}

export default function WordleTogetherGamePage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = use(params);
  const router = useRouter();
  const { game, loading, error, deleted, submitGuess, resetGame } = useWordleTogetherGame(gameId);

  const [currentInput, setCurrentInput] = useState('');
  const [shakeRow, setShakeRow] = useState(false);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [myName, setMyName] = useState<string | null>(null);

  useEffect(() => {
    setMyName(getMyName());
  }, []);

  useEffect(() => {
    if (deleted) {
      router.push('/');
    }
  }, [deleted, router]);

  const myPlayerNumber = useMemo(() => {
    if (!game || !myName) return null;
    if (game.player1_name === myName) return 1;
    if (game.player2_name === myName) return 2;
    return null;
  }, [game, myName]);

  const opponentName = useMemo(() => {
    if (!game || !myPlayerNumber) return 'Opponent';
    return myPlayerNumber === 1 ? game.player2_name : game.player1_name;
  }, [game, myPlayerNumber]);

  const answer = useMemo(() => {
    return game?.board.answer || '';
  }, [game]);

  const myGuesses = useMemo(() => {
    if (!game || !myPlayerNumber) return [];
    return myPlayerNumber === 1 ? game.board.player1_guesses : game.board.player2_guesses;
  }, [game, myPlayerNumber]);

  const opponentGuesses = useMemo(() => {
    if (!game || !myPlayerNumber) return [];
    return myPlayerNumber === 1 ? game.board.player2_guesses : game.board.player1_guesses;
  }, [game, myPlayerNumber]);

  const myFinished = useMemo(() => {
    if (!game || !myPlayerNumber) return false;
    return myPlayerNumber === 1 ? game.board.player1_finished : game.board.player2_finished;
  }, [game, myPlayerNumber]);

  const opponentFinished = useMemo(() => {
    if (!game || !myPlayerNumber) return false;
    return myPlayerNumber === 1 ? game.board.player2_finished : game.board.player1_finished;
  }, [game, myPlayerNumber]);

  const mappedMyGuesses: WordleGuess[] = useMemo(() => {
    if (!myPlayerNumber) return [];
    return myGuesses.map((word) => ({ word, player: myPlayerNumber }));
  }, [myGuesses, myPlayerNumber]);

  const myEvaluations: LetterState[][] = useMemo(() => {
    if (!answer) return [];
    return myGuesses.map((word) => evaluateGuess(word, answer));
  }, [myGuesses, answer]);

  const keyboardState = useMemo(() => {
    const state: KeyboardState = {};
    if (!answer) return state;

    // Build keyboard state based on player's guesses
    for (const word of myGuesses) {
      const evaluation = evaluateGuess(word, answer);
      for (let i = 0; i < 5; i++) {
        const letter = word[i];
        const current = state[letter];
        const next = evaluation[i];
        const priority = (s: LetterState) => (s === 'correct' ? 3 : s === 'present' ? 2 : 1);
        if (!current || priority(next) > priority(current)) {
          state[letter] = next;
        }
      }
    }
    return state;
  }, [myGuesses, answer]);

  const isGameOver = useMemo(() => {
    if (!game) return false;
    return game.winner !== null || isDraw(game.board);
  }, [game]);

  const handleKeyPress = useCallback((key: string) => {
    if (isGameOver || myFinished) return;
    setCurrentInput((prev) => {
      if (prev.length >= 5) return prev;
      return prev + key;
    });
  }, [isGameOver, myFinished]);

  const handleBackspace = useCallback(() => {
    if (isGameOver || myFinished) return;
    setCurrentInput((prev) => prev.slice(0, -1));
  }, [isGameOver, myFinished]);

  const handleEnter = useCallback(async () => {
    if (isGameOver || myFinished) return;
    if (currentInput.length !== 5) {
      setShakeRow(true);
      setTimeout(() => setShakeRow(false), 500);
      return;
    }

    const word = currentInput;
    setCurrentInput('');
    const success = await submitGuess(word);
    if (!success) {
      setCurrentInput(word);
      setShakeRow(true);
      setTimeout(() => setShakeRow(false), 500);
    }
  }, [currentInput, isGameOver, myFinished, submitGuess]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (isGameOver || myFinished) return;

      if (e.key === 'Enter') {
        e.preventDefault();
        handleEnter();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        handleKeyPress(e.key.toUpperCase());
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleEnter, handleBackspace, handleKeyPress, isGameOver, myFinished]);

  const handleEndGameClick = useCallback(() => {
    setShowEndDialog(true);
  }, []);

  const handleEndGameCancel = useCallback(() => {
    setShowEndDialog(false);
  }, []);

  const handleReset = useCallback(async () => {
    await resetGame();
  }, [resetGame]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <div className="text-text-secondary text-sm">Loading game...</div>
      </div>
    );
  }

  if (error && !game) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <div className="text-player1 text-sm">Error: {error}</div>
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

  const isMyWin = game.winner === myPlayerNumber;
  const winnerName = game.winner === 1 ? game.player1_name : game.player2_name;

  return (
    <>
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen p-4 gap-6 select-none max-w-6xl mx-auto">
        <SettingsButton />

        {/* Title / Turn header */}
        <div className="text-center">
          <h1 className="text-3xl font-black tracking-tight text-text-primary mb-1">
            Wordle Together
          </h1>
          {!isGameOver ? (
            <p className="text-sm font-semibold text-text-secondary flex items-center gap-1.5 justify-center">
              <span className="w-2.5 h-2.5 rounded-full bg-player1 animate-ping" />
              🏁 Race to guess the word!
            </p>
          ) : game.winner !== null ? (
            <p className="text-sm font-bold text-text-secondary">
              🏆 Match Finished!
            </p>
          ) : (
            <p className="text-sm font-bold text-text-secondary">
              🤝 Match Draw!
            </p>
          )}
        </div>

        {/* Side by side boards layout */}
        <div className="flex flex-col md:flex-row items-center md:items-start justify-center gap-8 w-full">
          {/* Left Column: Your board */}
          <div className="flex flex-col items-center gap-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
              Your Board {myFinished && !myGuesses.includes(answer) && ' (Failed)'}
            </h2>
            <WordleBoard
              guesses={mappedMyGuesses}
              evaluations={myEvaluations}
              currentInput={currentInput}
              opponentTyping={null}
              maxGuesses={6}
              gameOver={isGameOver || myFinished}
              shakeRow={shakeRow}
            />
          </div>

          {/* Right Column: Opponent board preview */}
          <div className="flex flex-col items-center gap-4 md:pt-0">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
              {opponentName ? `${opponentName}'s Board` : "Opponent's Board"} {opponentFinished && !opponentGuesses.includes(answer) && ' (Failed)'}
            </h2>
            <OpponentProgressBoard guesses={opponentGuesses} answer={answer} />
          </div>
        </div>

        {/* Error notifications */}
        {error && <p className="text-sm text-player1 animate-pulse">{error}</p>}

        {/* Keyboard section (only show if not game over and not finished) */}
        {!isGameOver && !myFinished ? (
          <div className="w-full flex justify-center mt-2">
            <WordleKeyboard
              keyboardState={keyboardState}
              onKeyPress={handleKeyPress}
              onEnter={handleEnter}
              onBackspace={handleBackspace}
              disabled={isGameOver || myFinished}
            />
          </div>
        ) : (
          <div className="text-center mt-4">
            {isGameOver && game.winner !== null && (
              <WinCelebration
                winner={game.winner}
                winnerName={winnerName}
                isMe={isMyWin}
                onPlayAgain={handleReset}
                onHome={() => router.push('/')}
              />
            )}
            {isGameOver && isDraw(game.board) && (
              <div className="flex flex-col items-center gap-6">
                <motion.h2
                  className="text-3xl font-bold text-text-secondary"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                >
                  It's a draw!
                </motion.h2>
                <p className="text-sm text-text-secondary">
                  The word was <span className="font-bold text-text-primary">{answer}</span>
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => router.push('/')}
                    className="px-6 py-3 text-base font-medium rounded-xl border border-border bg-surface text-text-secondary hover:text-text-primary hover:border-text-secondary/30 shadow-sm hover:shadow transition-all cursor-pointer"
                  >
                    Home
                  </button>
                  <button
                    onClick={handleReset}
                    className="px-6 py-3 text-base font-medium rounded-xl bg-board text-white hover:bg-board-surface transition-colors shadow-lg cursor-pointer"
                  >
                    Play Again
                  </button>
                </div>
              </div>
            )}
            {!isGameOver && myFinished && (
              <p className="text-sm text-text-secondary max-w-sm leading-relaxed">
                You've run out of guesses. Waiting for {opponentName || 'opponent'} to finish playing...
              </p>
            )}
          </div>
        )}

        {/* Action controls footer */}
        <div className="flex items-center gap-3 mt-4">
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
        onConfirm={handleReset}
        onCancel={handleEndGameCancel}
      />
    </>
  );
}

// Subcomponent to draw masked opponent progress grid
function OpponentProgressBoard({ guesses, answer }: { guesses: string[]; answer: string }) {
  const maxGuesses = 6;
  const rows = [];

  for (let i = 0; i < maxGuesses; i++) {
    if (i < guesses.length) {
      const evaluation = evaluateGuess(guesses[i], answer);
      rows.push(
        <div key={i} className="flex gap-[4px] sm:gap-[5px]">
          {evaluation.map((state, idx) => (
            <div
              key={idx}
              className="w-[30px] h-[30px] sm:w-[40px] sm:h-[40px] rounded-[6px]"
              style={{
                backgroundColor:
                  state === 'correct'
                    ? 'var(--color-wordle-correct)'
                    : state === 'present'
                      ? 'var(--color-wordle-present)'
                      : 'var(--color-wordle-absent)',
              }}
            />
          ))}
        </div>
      );
    } else {
      rows.push(
        <div key={i} className="flex gap-[4px] sm:gap-[5px]">
          {Array.from({ length: 5 }).map((_, idx) => (
            <div
              key={idx}
              className="w-[30px] h-[30px] sm:w-[40px] sm:h-[40px] rounded-[6px] border border-border bg-surface-hover/30"
            />
          ))}
        </div>
      );
    }
  }

  return (
    <div className="flex flex-col gap-[4px] sm:gap-[5px] p-3 rounded-2xl bg-surface border border-border shadow-sm">
      {rows}
    </div>
  );
}

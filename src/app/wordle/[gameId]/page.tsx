'use client';

import { use, useMemo, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { useWordleGame } from '@/hooks/useWordleGame';
import { evaluateGuess, getKeyboardState, isGameWon, isGameLost, getAnswer } from '@/lib/wordle-logic';
import { WordleBoard } from '@/components/wordle/WordleBoard';
import { WordleKeyboard } from '@/components/wordle/WordleKeyboard';
import { TypingPreview } from '@/components/wordle/TypingPreview';
import { EndGameDialog } from '@/components/EndGameDialog';
import type { LetterState } from '@/lib/wordle-types';

function getMyName(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('player-name') || localStorage.getItem('player-name');
}

export default function WordleGamePage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = use(params);
  const { game, loading, error, deleted, submitGuess, updateTyping, resetGame } = useWordleGame(gameId);
  const router = useRouter();
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

  const answer = useMemo(() => {
    if (!game) return '';
    return getAnswer(game.answer_index, game.answer_word);
  }, [game]);

  const evaluations: LetterState[][] = useMemo(() => {
    if (!game || !answer) return [];
    return game.guesses.map(({ word }) => evaluateGuess(word, answer));
  }, [game, answer]);

  const keyboardState = useMemo(() => {
    if (!game || !answer) return {};
    return getKeyboardState(game.guesses, answer);
  }, [game, answer]);

  const gameOver = useMemo(() => {
    if (!game || !answer) return false;
    return isGameWon(game.guesses, answer) || isGameLost(game.guesses);
  }, [game, answer]);

  const gameWon = useMemo(() => {
    if (!game || !answer) return false;
    return isGameWon(game.guesses, answer);
  }, [game, answer]);

  const myPlayerNumber = useMemo(() => {
    if (!game || !myName) return null;
    if (game.player1_name === myName) return 1;
    if (game.player2_name === myName) return 2;
    return null;
  }, [game, myName]);

  const opponentName = useMemo(() => {
    if (!game || !myPlayerNumber) return null;
    return myPlayerNumber === 1 ? game.player2_name : game.player1_name;
  }, [game, myPlayerNumber]);

  const opponentTyping = useMemo(() => {
    if (!game || !myPlayerNumber) return null;
    return myPlayerNumber === 1 ? game.player2_typing : game.player1_typing;
  }, [game, myPlayerNumber]);

  const handleKeyPress = useCallback((key: string) => {
    if (gameOver) return;
    setCurrentInput((prev) => {
      if (prev.length >= 5) return prev;
      const next = prev + key;
      updateTyping(next);
      return next;
    });
  }, [gameOver, updateTyping]);

  const handleBackspace = useCallback(() => {
    if (gameOver) return;
    setCurrentInput((prev) => {
      const next = prev.slice(0, -1);
      updateTyping(next);
      return next;
    });
  }, [gameOver, updateTyping]);

  const handleEnter = useCallback(async () => {
    if (gameOver) return;
    if (currentInput.length !== 5) {
      setShakeRow(true);
      setTimeout(() => setShakeRow(false), 500);
      return;
    }
    const word = currentInput;
    setCurrentInput('');
    updateTyping('');
    const success = await submitGuess(word);
    if (!success) {
      setCurrentInput(word);
      setShakeRow(true);
      setTimeout(() => setShakeRow(false), 500);
    }
  }, [currentInput, gameOver, submitGuess, updateTyping]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (gameOver) return;

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
  }, [handleEnter, handleBackspace, handleKeyPress, gameOver]);

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
      <div className="flex-1 flex items-center justify-center">
        <div className="text-text-secondary text-sm">Loading game...</div>
      </div>
    );
  }

  if (error && !game) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-player1 text-sm">Error: {error}</div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-text-secondary text-sm">Game not found</div>
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-4">
        {/* Game status header */}
        {gameOver && (
          <div className="text-center mb-2">
            {gameWon ? (
              <>
                <p className="text-2xl font-bold text-wordle-correct">Solved!</p>
                <p className="text-sm text-text-secondary mt-1">
                  in {game.guesses.length} guess{game.guesses.length !== 1 ? 'es' : ''}
                </p>
              </>
            ) : (
              <>
                <p className="text-2xl font-bold text-text-secondary">Not this time</p>
                <p className="text-sm text-text-secondary mt-1">
                  The word was <span className="font-bold text-text-primary">{answer}</span>
                </p>
              </>
            )}
            {/* Stats: who guessed what */}
            <div className="mt-3 flex flex-col gap-1 text-xs text-text-secondary">
              {game.guesses.map((g, i) => (
                <span key={i}>
                  <span className="font-medium" style={{ color: g.player === 1 ? 'var(--color-player1)' : 'var(--color-player2)' }}>
                    {g.player === 1 ? game.player1_name : game.player2_name}
                  </span>
                  {' guessed '}
                  <span className="font-mono font-medium">{g.word}</span>
                  {g.word === answer && ' ✓'}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Typing indicator */}
        <AnimatePresence>
          {opponentName && opponentTyping && !gameOver && (
            <TypingPreview playerName={opponentName} isTyping={true} />
          )}
        </AnimatePresence>

        {/* Board */}
        <WordleBoard
          guesses={game.guesses}
          evaluations={evaluations}
          currentInput={currentInput}
          opponentTyping={opponentTyping}
          maxGuesses={6}
          gameOver={gameOver}
          shakeRow={shakeRow}
        />

        {/* Error message */}
        {error && (
          <p className="text-sm text-player1 animate-pulse">{error}</p>
        )}

        {/* Keyboard */}
        <div className="mt-2 w-full flex justify-center">
          <WordleKeyboard
            keyboardState={keyboardState}
            onKeyPress={handleKeyPress}
            onEnter={handleEnter}
            onBackspace={handleBackspace}
            disabled={gameOver}
          />
        </div>

        {/* Action buttons */}
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

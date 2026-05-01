'use client';

import { use, useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useMathTriviaGame } from '@/hooks/useMathTriviaGame';
import { useNotifications } from '@/hooks/useNotifications';
import { NotificationControls } from '@/components/NotificationControls';
import { checkAnswer } from '@/lib/math-trivia-logic';
import { EndGameDialog } from '@/components/EndGameDialog';
import { SettingsButton } from '@/components/SettingsButton';
import type { MathTriviaBoardState, PlayerAnswer, PlayerResult } from '@/lib/math-trivia-types';

export default function MathTriviaGamePage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = use(params);
  const router = useRouter();
  const { game, loading, deleted, submitResult, resetGame, myResult, opponentResult, bothSubmitted } = useMathTriviaGame(gameId);

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<PlayerAnswer[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [timeLeft, setTimeLeft] = useState(180);
  const startTimeRef = useRef<number | null>(null);
  const questionStartRef = useRef<number>(Date.now());
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  // BUG 2 FIX: Track latest answers in a ref so the timer closure always has current state
  const answersRef = useRef<PlayerAnswer[]>(answers);

  // Keep the ref in sync with state
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  const playerName = typeof window !== 'undefined'
    ? (sessionStorage.getItem('player-name') || localStorage.getItem('player-name'))
    : null;

  const board = game?.board as MathTriviaBoardState | undefined;
  const myPlayerNumber = game ? (game.player1_name === playerName ? 1 : 2) : null;
  // Math Trivia: current_turn=0 means "no one has submitted yet" — both players can play.
  // current_turn=1 or 2 means that player is next (the other already submitted).
  const isMyTurn = game?.current_turn === 0 || myPlayerNumber === game?.current_turn;

  const opponentName = game && myPlayerNumber
    ? (myPlayerNumber === 1 ? game.player2_name : game.player1_name)
    : null;

  const { permissionState, requestPermission, isMuted, toggleMute } = useNotifications({
    gameId,
    isMyTurn: isMyTurn && !myResult && !submitted,
    opponentName,
    gameType: 'math-trivia',
  });

  // Start timer when it's my turn and I haven't submitted
  useEffect(() => {
    if (!isMyTurn || myResult || submitted || !board) return;

    if (!startTimeRef.current) {
      startTimeRef.current = Date.now();
      questionStartRef.current = Date.now();
    }

    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current!) / 1000);
      const remaining = board.timeLimit - elapsed;
      setTimeLeft(Math.max(0, remaining));

      if (remaining <= 0) {
        handleTimeUp();
      }
    }, 100);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMyTurn, myResult, submitted, board]);

  const handleTimeUp = useCallback(() => {
    if (submitted || !board || !startTimeRef.current) return;

    // BUG 2 FIX: Read from answersRef to get the latest answers, not the stale closure
    const currentAnswers = answersRef.current;
    const finalAnswers = [...currentAnswers];
    for (let i = finalAnswers.length; i < board.questions.length; i++) {
      finalAnswers.push({
        questionId: i,
        answer: null,
        correct: false,
        timeSpent: 0,
      });
    }

    const totalTime = Math.floor((Date.now() - startTimeRef.current) / 1000);
    const result: PlayerResult = {
      correctCount: finalAnswers.filter((a) => a.correct).length,
      answers: finalAnswers,
      totalTime,
      startedAt: new Date(startTimeRef.current).toISOString(),
      submittedAt: new Date().toISOString(),
    };

    setSubmitted(true);
    if (timerRef.current) clearInterval(timerRef.current);
    submitResult(result);
  }, [submitted, board, submitResult]);

  const handleAnswer = useCallback((answerValue: number) => {
    if (!board || submitted) return;

    const question = board.questions[currentQuestion];
    const isCorrect = checkAnswer(question, answerValue);
    const timeSpent = Math.round((Date.now() - questionStartRef.current) / 1000 * 10) / 10;

    const answer: PlayerAnswer = {
      questionId: currentQuestion,
      answer: answerValue,
      correct: isCorrect,
      timeSpent,
    };

    const newAnswers = [...answers, answer];
    setAnswers(newAnswers);

    // Move to next question or finish
    if (currentQuestion < board.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      questionStartRef.current = Date.now();
    } else {
      // All questions answered
      const totalTime = Math.floor((Date.now() - startTimeRef.current!) / 1000);
      const result: PlayerResult = {
        correctCount: newAnswers.filter((a) => a.correct).length,
        answers: newAnswers,
        totalTime,
        startedAt: new Date(startTimeRef.current!).toISOString(),
        submittedAt: new Date().toISOString(),
      };

      setSubmitted(true);
      if (timerRef.current) clearInterval(timerRef.current);
      submitResult(result);
    }
  }, [board, submitted, currentQuestion, answers, submitResult]);

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

  // Waiting for my turn (I'm player 2 and player 1 hasn't gone yet)
  if (!isMyTurn && !myResult && !submitted) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen px-4 py-8">
        <SettingsButton />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4 max-w-md"
        >
          <h1 className="text-2xl font-bold text-text-primary">Waiting for your turn...</h1>
          <p className="text-text-secondary">
            {game.player1_name || 'Your opponent'} is answering the questions. You&apos;ll get your turn next!
          </p>
          <NotificationControls
            permissionState={permissionState}
            requestPermission={requestPermission}
            isMuted={isMuted}
            toggleMute={toggleMute}
          />
          <button
            onClick={() => router.push('/')}
            className="mt-6 px-6 py-3 text-sm text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
          >
            Back to games
          </button>
        </motion.div>
      </div>
    );
  }

  // Show results when both have submitted
  if ((myResult || submitted) && bothSubmitted) {
    const p1Result = board!.player1Result!;
    const p2Result = board!.player2Result!;
    const winner = game.winner as 1 | 2 | 'draw' | null;

    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen px-4 py-8">
        <SettingsButton />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-lg space-y-6"
        >
          {/* Winner banner */}
          <div className="text-center">
            <div className="text-xs uppercase tracking-widest text-text-secondary mb-1">
              {winner === 'draw' || winner === null ? 'Result' : 'Winner'}
            </div>
            <div className="text-3xl font-bold text-text-primary">
              {winner === 'draw' || winner === null ? 'Draw!' : winner === 1 ? game.player1_name : game.player2_name}
            </div>
          </div>

          {/* Score comparison */}
          <div className="flex justify-between items-center p-5 bg-surface rounded-2xl border border-border">
            <div className="text-center flex-1">
              <div className="text-xs text-text-secondary mb-1">{game.player1_name}</div>
              <div className="text-3xl font-bold text-player1">{p1Result.correctCount}/15</div>
              <div className="text-sm text-text-secondary mt-1">{formatTime(p1Result.totalTime)}</div>
            </div>
            <div className="text-text-secondary text-sm">vs</div>
            <div className="text-center flex-1">
              <div className="text-xs text-text-secondary mb-1">{game.player2_name}</div>
              <div className="text-3xl font-bold text-player2">{p2Result.correctCount}/15</div>
              <div className="text-sm text-text-secondary mt-1">{formatTime(p2Result.totalTime)}</div>
            </div>
          </div>

          {/* Per-question detail */}
          <div className="bg-surface rounded-2xl border border-border p-4 max-h-[40vh] overflow-y-auto">
            <div className="text-xs uppercase tracking-wider text-text-secondary mb-3">
              Question Details
            </div>
            <div className="space-y-2">
              {board!.questions.map((q, i) => {
                const a1 = p1Result.answers[i];
                const a2 = p2Result.answers[i];
                return (
                  <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-background/50">
                    <span className="text-xs text-text-secondary w-5 shrink-0">#{i + 1}</span>
                    <span className="text-sm text-text-primary flex-1 font-mono">{q.text} = {q.correctAnswer}</span>
                    <div className="flex gap-4 text-xs">
                      <span className={a1?.correct ? 'text-green-400' : 'text-red-400'}>
                        {a1?.correct ? '✓' : '✗'} {a1?.timeSpent ? `${a1.timeSpent}s` : '—'}
                      </span>
                      <span className={a2?.correct ? 'text-green-400' : 'text-red-400'}>
                        {a2?.correct ? '✓' : '✗'} {a2?.timeSpent ? `${a2.timeSpent}s` : '—'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <button
            onClick={() => router.push('/')}
            className="w-full py-3 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
          >
            Back to games
          </button>
        </motion.div>
      </div>
    );
  }

  // Waiting for opponent after I've submitted
  if (myResult || submitted) {
    const myCorrect = myResult?.correctCount ?? answers.filter((a) => a.correct).length;
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen px-4 py-8">
        <SettingsButton />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4 max-w-md"
        >
          <div className="text-5xl font-bold text-[#F97316]">{myCorrect}/15</div>
          <h2 className="text-xl font-semibold text-text-primary">Nice work!</h2>
          <p className="text-text-secondary">
            Waiting for {myPlayerNumber === 1 ? (game.player2_name || 'your opponent') : (game.player1_name || 'your opponent')} to take their turn...
          </p>
          <button
            onClick={() => router.push('/')}
            className="mt-6 px-6 py-3 text-sm text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
          >
            Back to games
          </button>
        </motion.div>
      </div>
    );
  }

  // Active gameplay — answering questions
  const question = board!.questions[currentQuestion];
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-screen px-4 py-8">
      <SettingsButton />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-6"
      >
        {/* Header with timer and progress */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-text-secondary">
            Question {currentQuestion + 1}/15
          </div>
          <div className={`text-lg font-mono font-bold ${timeLeft <= 30 ? 'text-red-400' : 'text-text-primary'}`}>
            {minutes}:{seconds.toString().padStart(2, '0')}
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1.5 bg-border rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-[#F97316] rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${((currentQuestion) / 15) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Question card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="rounded-2xl border border-border bg-surface p-8 text-center"
          >
            <div className="text-4xl font-bold text-text-primary font-mono mb-2">
              {question.text}
            </div>
            <div className="text-sm text-text-secondary">= ?</div>
          </motion.div>
        </AnimatePresence>

        {/* Answer options */}
        <div className="grid grid-cols-2 gap-3">
          {question.options.map((option, idx) => (
            <motion.button
              key={`${currentQuestion}-${idx}`}
              onClick={() => handleAnswer(option)}
              className="py-4 px-6 rounded-xl border border-border bg-surface hover:bg-background hover:border-[#F97316]/50 transition-all cursor-pointer text-xl font-semibold text-text-primary"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {option}
            </motion.button>
          ))}
        </div>

        {/* End game button */}
        <button
          onClick={() => setShowEndDialog(true)}
          className="w-full py-2 text-xs text-text-secondary/50 hover:text-red-400 transition-colors cursor-pointer"
        >
          End Game
        </button>
      </motion.div>

      {showEndDialog && (
        <EndGameDialog
          open={showEndDialog}
          onConfirm={handleEndGame}
          onCancel={() => setShowEndDialog(false)}
        />
      )}
    </div>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

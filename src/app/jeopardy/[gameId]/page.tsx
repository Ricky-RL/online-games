'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useJeopardyGame } from '@/hooks/useJeopardyGame';
import { useNotifications } from '@/hooks/useNotifications';
import { NotificationControls } from '@/components/NotificationControls';

export default function JeopardyGamePage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.gameId as string;
  const { game, loading, error, deleted, getMyPlayer, doPickQuestion, doSubmitAnswer, doAdvance } = useJeopardyGame(gameId);
  const [shuffledAnswers, setShuffledAnswers] = useState<string[]>([]);
  const [showResult, setShowResult] = useState(false);

  const myPlayer = getMyPlayer();
  const board = game?.board;

  const isMyTurn = board?.currentPicker === myPlayer;

  const opponentName = useMemo(() => {
    if (!game || !myPlayer) return null;
    return myPlayer === 1 ? game.player2_name : game.player1_name;
  }, [game, myPlayer]);

  const { permissionState, requestPermission, isMuted, toggleMute } = useNotifications({
    gameId,
    isMyTurn: !!isMyTurn,
    opponentName,
    gameType: 'jeopardy',
  });

  // Auto-advance from result after a delay — only the currentPicker triggers it to prevent duplicate DB writes
  useEffect(() => {
    if (board?.phase === 'result') {
      setShowResult(true);
      const timer = setTimeout(() => {
        if (board.currentPicker === myPlayer) {
          doAdvance();
        }
        setShowResult(false);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [board?.phase, board?.version, board?.currentPicker, myPlayer, doAdvance]);

  // Shuffle answer options when a new question becomes active
  useEffect(() => {
    if (board?.phase === 'answering' && board.activeQuestion) {
      const q = board.categories[board.activeQuestion.catIndex].questions[board.activeQuestion.qIndex];
      const allAnswers = [q.correctAnswer, ...q.incorrectAnswers];
      // Fisher-Yates shuffle
      for (let i = allAnswers.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allAnswers[i], allAnswers[j]] = [allAnswers[j], allAnswers[i]];
      }
      setShuffledAnswers(allAnswers);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board?.phase, board?.activeQuestion?.catIndex, board?.activeQuestion?.qIndex]);

  const handleSubmitAnswer = useCallback(async (chosenAnswer: string) => {
    await doSubmitAnswer(chosenAnswer);
  }, [doSubmitAnswer]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-text-secondary">Loading game...</p>
      </div>
    );
  }

  if (deleted || error || !game || !board) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <p className="text-text-secondary">{error || 'Game not found'}</p>
        <button onClick={() => router.push('/jeopardy')} className="text-sm text-accent hover:underline cursor-pointer">
          Back to lobby
        </button>
      </div>
    );
  }

  const waitingForOpponent = !game.player2_name;

  // Game over screen
  if (board.phase === 'game-over') {
    const winnerName = board.winner === 1 ? game.player1_name : board.winner === 2 ? game.player2_name : null;
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6">
        <h1 className="text-4xl font-bold text-text-primary">Game Over!</h1>
        <div className="flex gap-8 text-center">
          <div>
            <p className="text-sm text-text-secondary">{game.player1_name || 'Player 1'}</p>
            <p className="text-3xl font-bold text-player1">${board.scores[0]}</p>
          </div>
          <div>
            <p className="text-sm text-text-secondary">{game.player2_name || 'Player 2'}</p>
            <p className="text-3xl font-bold text-player2">${board.scores[1]}</p>
          </div>
        </div>
        {winnerName ? (
          <p className="text-xl font-semibold text-accent">{winnerName} wins!</p>
        ) : (
          <p className="text-xl font-semibold text-text-secondary">It&apos;s a draw!</p>
        )}
        <button onClick={() => router.push('/')} className="mt-4 text-sm text-text-secondary hover:text-text-primary cursor-pointer">
          Back to games
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center px-4 py-6 max-w-4xl mx-auto w-full">
      {/* Scoreboard */}
      <div className="w-full flex items-center justify-between mb-6 px-2">
        <div className="flex items-center gap-3">
          <div className="text-center">
            <p className="text-xs text-text-secondary">{game.player1_name || 'Player 1'}</p>
            <p className="text-xl font-bold text-player1">${board.scores[0]}</p>
          </div>
        </div>
        <div className="text-center">
          {waitingForOpponent ? (
            <p className="text-sm text-text-secondary animate-pulse">Waiting for opponent...</p>
          ) : board.phase === 'picking' ? (
            <p className="text-sm font-medium text-text-primary">
              {isMyTurn ? 'Your pick!' : `${board.currentPicker === 1 ? game.player1_name : game.player2_name}'s pick`}
            </p>
          ) : board.phase === 'answering' ? (
            <p className="text-sm font-medium text-accent">Answer the question!</p>
          ) : showResult ? (
            <p className={`text-sm font-medium ${board.lastAnswerCorrect ? 'text-green-500' : 'text-red-500'}`}>
              {board.lastAnswerCorrect ? 'Correct!' : 'Incorrect!'}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          <div className="text-center">
            <p className="text-xs text-text-secondary">{game.player2_name || 'Waiting...'}</p>
            <p className="text-xl font-bold text-player2">${board.scores[1]}</p>
          </div>
          <NotificationControls
            permissionState={permissionState}
            requestPermission={requestPermission}
            isMuted={isMuted}
            toggleMute={toggleMute}
          />
        </div>
      </div>

      {/* Active question modal */}
      {board.phase === 'answering' && board.activeQuestion && (
        <div className="w-full mb-6 rounded-2xl border border-[#1A3A7A]/30 bg-[#0a1a4a] p-6 text-center">
          <p className="text-xs uppercase tracking-wider text-[#FFD700]/70 mb-2">
            {board.categories[board.activeQuestion.catIndex].name} — ${board.categories[board.activeQuestion.catIndex].questions[board.activeQuestion.qIndex].value}
          </p>
          <p className="text-lg text-white font-medium mb-4">
            {board.categories[board.activeQuestion.catIndex].questions[board.activeQuestion.qIndex].question}
          </p>
          {myPlayer === board.currentPicker && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto">
              {shuffledAnswers.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSubmitAnswer(option)}
                  className="px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white font-medium hover:bg-[#FFD700]/20 hover:border-[#FFD700]/50 transition-colors cursor-pointer text-sm text-left"
                >
                  {option}
                </button>
              ))}
            </div>
          )}
          {myPlayer !== board.currentPicker && (
            <p className="text-white/60 text-sm">Waiting for answer...</p>
          )}
        </div>
      )}

      {/* Result display */}
      {showResult && board.phase === 'result' && board.activeQuestion && (
        <div className="w-full mb-6 rounded-2xl border border-[#1A3A7A]/30 bg-[#0a1a4a] p-6 text-center">
          <p className={`text-2xl font-bold mb-2 ${board.lastAnswerCorrect ? 'text-green-400' : 'text-red-400'}`}>
            {board.lastAnswerCorrect ? 'Correct!' : 'Incorrect!'}
          </p>
          <p className="text-white/70 text-sm">
            The answer was: <span className="text-white font-medium">{board.categories[board.activeQuestion.catIndex].questions[board.activeQuestion.qIndex].correctAnswer}</span>
          </p>
        </div>
      )}

      {/* Jeopardy Board */}
      <div className="w-full grid grid-cols-6 gap-1.5">
        {/* Category headers */}
        {board.categories.map((cat, ci) => (
          <div
            key={ci}
            className="bg-[#1A3A7A] rounded-lg px-2 py-3 text-center"
          >
            <p className="text-xs font-bold text-white uppercase tracking-wide leading-tight line-clamp-2">
              {cat.name}
            </p>
          </div>
        ))}

        {/* Question cells */}
        {[0, 1, 2, 3, 4].map((qi) =>
          board.categories.map((cat, ci) => {
            const q = cat.questions[qi];
            const isAnswered = q.answered;
            const canPick = board.phase === 'picking' && isMyTurn && !isAnswered && !waitingForOpponent;

            return (
              <button
                key={`${ci}-${qi}`}
                onClick={() => canPick && doPickQuestion(ci, qi)}
                disabled={!canPick}
                className={`
                  rounded-lg py-4 text-center transition-all font-bold text-lg
                  ${isAnswered
                    ? 'bg-[#1A3A7A]/20 text-text-secondary/30 cursor-default'
                    : canPick
                      ? 'bg-[#1A3A7A] text-[#FFD700] hover:bg-[#2A4A9A] hover:scale-105 cursor-pointer shadow-md'
                      : 'bg-[#1A3A7A]/60 text-[#FFD700]/50 cursor-default'
                  }
                `}
              >
                {isAnswered ? '' : `$${q.value}`}
              </button>
            );
          })
        )}
      </div>

      <button
        onClick={() => router.push('/')}
        className="mt-8 text-sm text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
      >
        Back to games
      </button>
    </div>
  );
}

'use client';

import { MonopolyBoard } from '@/lib/monopoly/types';

interface GameOverSummaryProps {
  board: MonopolyBoard;
  player1Name: string;
  player2Name: string;
  onPlayAgain: () => void;
}

export function GameOverSummary({ board, player1Name, player2Name, onPlayAgain }: GameOverSummaryProps) {
  const winnerName = board.winner === 1 ? player1Name : board.winner === 2 ? player2Name : null;
  const [nw1, nw2] = board.finalNetWorth ?? [0, 0];

  return (
    <div className="rounded-xl sm:rounded-2xl border border-border bg-surface p-5 sm:p-8 w-full max-w-md mx-auto text-center">
      <h2 className="text-xl sm:text-2xl font-bold text-text-primary mb-1.5 sm:mb-2">
        {winnerName ? `${winnerName} Wins!` : "It's a Draw!"}
      </h2>
      <p className="text-xs sm:text-sm text-text-secondary mb-4 sm:mb-6">
        {board.currentTurn > 60 ? 'Turn limit reached — highest net worth wins.' : 'Opponent went bankrupt!'}
      </p>
      {board.drawnCard && (
        <div className={`rounded-lg border px-3 py-2 mb-4 sm:mb-6 text-left text-xs sm:text-sm ${
          board.drawnCard.cardType === 'chance'
            ? 'border-orange-400/50 bg-orange-50 dark:bg-orange-950/20 text-orange-700 dark:text-orange-300'
            : 'border-sky-400/50 bg-sky-50 dark:bg-sky-950/20 text-sky-700 dark:text-sky-300'
        }`}>
          <span className="font-semibold">{board.drawnCard.cardType === 'chance' ? 'Chance' : 'Community Chest'}:</span>{' '}
          {board.drawnCard.text}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="rounded-xl bg-background p-3 sm:p-4">
          <p className="text-[10px] sm:text-xs text-text-secondary mb-0.5 sm:mb-1 truncate">{player1Name}</p>
          <p className="text-base sm:text-lg font-bold text-text-primary">${nw1.toLocaleString()}</p>
        </div>
        <div className="rounded-xl bg-background p-3 sm:p-4">
          <p className="text-[10px] sm:text-xs text-text-secondary mb-0.5 sm:mb-1 truncate">{player2Name}</p>
          <p className="text-base sm:text-lg font-bold text-text-primary">${nw2.toLocaleString()}</p>
        </div>
      </div>
      <button
        onClick={onPlayAgain}
        className="px-6 py-2.5 min-h-[48px] rounded-xl bg-player1 text-white font-medium hover:opacity-90 active:opacity-80 transition-opacity cursor-pointer"
      >
        Play Again
      </button>
    </div>
  );
}

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
    <div className="rounded-2xl border border-border bg-surface p-8 max-w-md mx-auto text-center">
      <h2 className="text-2xl font-bold text-text-primary mb-2">
        {winnerName ? `${winnerName} Wins!` : "It's a Draw!"}
      </h2>
      <p className="text-sm text-text-secondary mb-6">
        {board.currentTurn > 60 ? 'Turn limit reached — highest net worth wins.' : 'Opponent went bankrupt!'}
      </p>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="rounded-xl bg-background p-4">
          <p className="text-xs text-text-secondary mb-1">{player1Name}</p>
          <p className="text-lg font-bold text-text-primary">${nw1.toLocaleString()}</p>
        </div>
        <div className="rounded-xl bg-background p-4">
          <p className="text-xs text-text-secondary mb-1">{player2Name}</p>
          <p className="text-lg font-bold text-text-primary">${nw2.toLocaleString()}</p>
        </div>
      </div>
      <button
        onClick={onPlayAgain}
        className="px-6 py-2.5 rounded-xl bg-player1 text-white font-medium hover:opacity-90 transition-opacity cursor-pointer"
      >
        Play Again
      </button>
    </div>
  );
}

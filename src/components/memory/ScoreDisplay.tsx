'use client';

import { motion } from 'framer-motion';

interface ScoreDisplayProps {
  player1Name: string | null;
  player2Name: string | null;
  player1Score: number;
  player2Score: number;
  currentTurn: 1 | 2;
  myPlayerNumber: 1 | 2 | null;
  totalPairs: number;
}

export function ScoreDisplay({
  player1Name,
  player2Name,
  player1Score,
  player2Score,
  currentTurn,
  myPlayerNumber,
  totalPairs,
}: ScoreDisplayProps) {
  const matchedPairs = player1Score + player2Score;

  const p1Label = myPlayerNumber === 1 ? 'You' : (player1Name ?? 'Player 1');
  const p2Label = myPlayerNumber === 2 ? 'You' : (player2Name ?? 'Player 2');

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-4 px-5 py-3 rounded-2xl bg-surface border border-border shadow-sm">
        {/* Player 1 */}
        <div className="flex items-center gap-2">
          <motion.div
            className="w-3 h-3 rounded-full bg-[#457B9D]"
            animate={
              currentTurn === 1
                ? { scale: [1, 1.3, 1] }
                : { scale: 1 }
            }
            transition={
              currentTurn === 1
                ? { duration: 1.2, repeat: Infinity, ease: 'easeInOut' }
                : {}
            }
          />
          <span
            className={`text-sm font-medium ${
              currentTurn === 1 ? 'text-text-primary' : 'text-text-secondary'
            }`}
          >
            {p1Label}
          </span>
          <span className="text-lg font-bold text-text-primary">{player1Score}</span>
        </div>

        {/* Separator */}
        <span className="text-text-secondary font-light">:</span>

        {/* Player 2 */}
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-text-primary">{player2Score}</span>
          <span
            className={`text-sm font-medium ${
              currentTurn === 2 ? 'text-text-primary' : 'text-text-secondary'
            }`}
          >
            {p2Label}
          </span>
          <motion.div
            className="w-3 h-3 rounded-full bg-[#E07A8A]"
            animate={
              currentTurn === 2
                ? { scale: [1, 1.3, 1] }
                : { scale: 1 }
            }
            transition={
              currentTurn === 2
                ? { duration: 1.2, repeat: Infinity, ease: 'easeInOut' }
                : {}
            }
          />
        </div>
      </div>

      {/* Pairs remaining */}
      <span className="text-xs text-text-secondary">
        {matchedPairs}/{totalPairs} pairs found
      </span>
    </div>
  );
}

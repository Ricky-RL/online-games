'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { MiniGolfBoard, PENALTY_SCORE, GameStats } from '@/lib/mini-golf/types';
import { getTotalStrokes } from '@/lib/mini-golf/logic';
import { Player } from '@/lib/types';
import { useConfetti } from '@/hooks/useConfetti';

interface EndGameScreenProps {
  board: MiniGolfBoard;
  winner: Player | null;
  player1Name: string;
  player2Name: string;
  myPlayer: Player;
  stats: GameStats;
  onPlayAgain: () => void;
  onHome: () => void;
}

export function EndGameScreen({
  board,
  winner,
  player1Name,
  player2Name,
  myPlayer,
  stats,
  onPlayAgain,
  onHome,
}: EndGameScreenProps) {
  const { fireConfetti } = useConfetti();

  useEffect(() => {
    fireConfetti();
  }, [fireConfetti]);

  const iWon = winner === myPlayer;
  const isDraw = winner === null;

  const title = isDraw
    ? "It's a draw!"
    : iWon
      ? 'You win!'
      : `${winner === 1 ? player1Name : player2Name} wins!`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-6 p-6 bg-surface border border-border rounded-2xl max-w-sm mx-auto"
    >
      <motion.h2
        initial={{ scale: 0.5 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 12 }}
        className="text-2xl font-bold text-text-primary"
      >
        {title}
      </motion.h2>

      <table className="w-full text-center">
        <thead>
          <tr className="text-text-secondary text-sm">
            <th className="py-1">Hole</th>
            <th className="py-1">{player1Name}</th>
            <th className="py-1">{player2Name}</th>
          </tr>
        </thead>
        <tbody>
          {board.scores.map(([p1, p2], i) => (
            <tr key={i} className="border-t border-border">
              <td className="py-2 text-text-secondary">{i + 1}</td>
              <td className="py-2 font-medium text-player1">
                {p1 === PENALTY_SCORE ? 'X' : p1}
              </td>
              <td className="py-2 font-medium text-player2">
                {p2 === PENALTY_SCORE ? 'X' : p2}
              </td>
            </tr>
          ))}
          <tr className="border-t-2 border-border font-bold">
            <td className="py-2">Total</td>
            <td className="py-2 text-player1">{getTotalStrokes(board.scores, 1)}</td>
            <td className="py-2 text-player2">{getTotalStrokes(board.scores, 2)}</td>
          </tr>
        </tbody>
      </table>

      {(stats.holesInOne.length > 0 || stats.mostBounces.count > 0) && (
        <div className="w-full border-t border-border pt-4">
          <h3 className="text-sm font-medium text-text-secondary mb-2">Stats</h3>
          <div className="space-y-1 text-sm text-text-primary">
            {stats.holesInOne.length > 0 && (
              <p>Hole-in-one on hole {stats.holesInOne.map(h => h + 1).join(', ')}!</p>
            )}
            {stats.mostBounces.count > 0 && (
              <p>Most bounces: {stats.mostBounces.count} (Hole {stats.mostBounces.hole + 1})</p>
            )}
            {stats.closestCall.speed > 0 && (
              <p>Closest call on Hole {stats.closestCall.hole + 1}</p>
            )}
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={onPlayAgain}
          className="px-5 py-2 bg-board text-white rounded-full font-medium hover:opacity-90 transition-opacity"
        >
          Play Again
        </button>
        <button
          onClick={onHome}
          className="px-5 py-2 border border-border bg-surface rounded-full font-medium text-text-primary hover:bg-background transition-colors"
        >
          Home
        </button>
      </div>
    </motion.div>
  );
}

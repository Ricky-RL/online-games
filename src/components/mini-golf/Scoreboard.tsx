'use client';

import { motion } from 'framer-motion';
import { MiniGolfBoard, GameScores, PENALTY_SCORE } from '@/lib/mini-golf/types';
import { getTotalStrokes } from '@/lib/mini-golf/logic';
import { Player } from '@/lib/types';

interface ScoreboardProps {
  board: MiniGolfBoard;
  player1Name: string;
  player2Name: string;
  myPlayer: Player;
  myReady: boolean;
  opponentReady: boolean;
  onReady: () => void;
}

export function Scoreboard({
  board,
  player1Name,
  player2Name,
  myPlayer,
  myReady,
  opponentReady,
  onReady,
}: ScoreboardProps) {
  const holesDone = board.currentHole + 1;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center gap-6 p-6 bg-surface border border-border rounded-2xl max-w-sm mx-auto"
    >
      <h2 className="text-xl font-bold text-text-primary">Hole {holesDone} Complete</h2>

      <table className="w-full text-center">
        <thead>
          <tr className="text-text-secondary text-sm">
            <th className="py-1">Hole</th>
            <th className="py-1">{player1Name}</th>
            <th className="py-1">{player2Name}</th>
          </tr>
        </thead>
        <tbody>
          {board.scores.slice(0, holesDone).map(([p1, p2], i) => (
            <tr key={i} className="border-t border-border">
              <td className="py-2 text-text-secondary">{i + 1}</td>
              <td className="py-2 font-medium text-player1">
                {p1 === PENALTY_SCORE ? 'X' : p1 ?? '-'}
              </td>
              <td className="py-2 font-medium text-player2">
                {p2 === PENALTY_SCORE ? 'X' : p2 ?? '-'}
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

      <div className="flex flex-col items-center gap-2">
        {myReady ? (
          <p className="text-sm text-text-secondary">
            Waiting for {myPlayer === 1 ? player2Name : player1Name}...
          </p>
        ) : (
          <button
            onClick={onReady}
            className="px-6 py-2 bg-board text-white rounded-full font-medium hover:opacity-90 transition-opacity"
          >
            Ready for next hole
          </button>
        )}
        {opponentReady && (
          <p className="text-xs text-text-secondary">Opponent is ready!</p>
        )}
      </div>
    </motion.div>
  );
}

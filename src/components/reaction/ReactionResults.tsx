'use client';

import { motion } from 'framer-motion';
import type { ReactionBoardState } from '@/lib/reaction-logic';

interface ReactionResultsProps {
  board: ReactionBoardState;
  game: {
    player1_name: string | null;
    player2_name: string | null;
  };
}

export function ReactionResults({ board, game }: ReactionResultsProps) {
  const p1Score = board.player1Score;
  const p2Score = board.player2Score;

  const p1Wins = p1Score !== null && p2Score !== null && p1Score > p2Score;
  const p2Wins = p1Score !== null && p2Score !== null && p2Score > p1Score;

  return (
    <motion.div
      className="w-full max-w-sm mx-auto rounded-3xl border border-border bg-surface p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      <div className="text-center mb-5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary/70">
          Results
        </h3>
      </div>

      <div className="space-y-4">
        {/* Player 1 */}
        <div className={`flex items-center justify-between p-4 rounded-2xl ${
          p1Wins ? 'bg-player1/10 border border-player1/20' : 'bg-surface-alt'
        }`}>
          <div className="flex items-center gap-3">
            {p1Wins && <span className="text-lg">🏆</span>}
            <span className={`text-sm font-semibold ${p1Wins ? 'text-player1' : 'text-text-primary'}`}>
              {game.player1_name ?? 'Player 1'}
            </span>
          </div>
          <span className={`text-2xl font-bold font-mono ${p1Wins ? 'text-player1' : 'text-text-primary'}`}>
            {p1Score !== null ? p1Score : '---'}
          </span>
        </div>

        {/* Player 2 */}
        <div className={`flex items-center justify-between p-4 rounded-2xl ${
          p2Wins ? 'bg-player2/10 border border-player2/20' : 'bg-surface-alt'
        }`}>
          <div className="flex items-center gap-3">
            {p2Wins && <span className="text-lg">🏆</span>}
            <span className={`text-sm font-semibold ${p2Wins ? 'text-player2' : 'text-text-primary'}`}>
              {game.player2_name ?? 'Player 2'}
            </span>
          </div>
          <span className={`text-2xl font-bold font-mono ${p2Wins ? 'text-player2' : 'text-text-primary'}`}>
            {p2Score !== null ? p2Score : '---'}
          </span>
        </div>
      </div>

      <div className="text-center mt-4 pt-4 border-t border-border">
        <p className="text-xs text-text-secondary/60">
          Circles tapped in 10 seconds
        </p>
      </div>
    </motion.div>
  );
}

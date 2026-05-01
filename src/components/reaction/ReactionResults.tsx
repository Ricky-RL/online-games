'use client';

import { motion } from 'framer-motion';
import { getAverageTime, ROUNDS_PER_PLAYER } from '@/lib/reaction-logic';
import type { ReactionBoardState } from '@/lib/reaction-logic';

interface ReactionResultsProps {
  board: ReactionBoardState;
  game: {
    player1_name: string | null;
    player2_name: string | null;
  };
}

export function ReactionResults({ board, game }: ReactionResultsProps) {
  const p1Times = board.player1Times;
  const p2Times = board.player2Times;
  const p1Avg = getAverageTime(p1Times);
  const p2Avg = getAverageTime(p2Times);

  const p1Wins = p1Avg !== null && p2Avg !== null && p1Avg < p2Avg;
  const p2Wins = p1Avg !== null && p2Avg !== null && p2Avg < p1Avg;

  return (
    <motion.div
      className="w-full max-w-sm mx-auto rounded-3xl border border-border bg-surface p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      {/* Header */}
      <div className="text-center mb-5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary/70">
          Results
        </h3>
      </div>

      {/* Player names header row */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="text-xs font-medium text-text-secondary text-center">Round</div>
        <div className={`text-xs font-semibold text-center ${p1Wins ? 'text-player1' : 'text-text-primary'}`}>
          {game.player1_name ?? 'Player 1'}
        </div>
        <div className={`text-xs font-semibold text-center ${p2Wins ? 'text-player2' : 'text-text-primary'}`}>
          {game.player2_name ?? 'Player 2'}
        </div>
      </div>

      {/* Round rows */}
      <div className="space-y-2">
        {Array.from({ length: ROUNDS_PER_PLAYER }).map((_, i) => {
          const p1Time = p1Times[i];
          const p2Time = p2Times[i];
          const p1Faster = p1Time !== null && p2Time !== null && p1Time < p2Time;
          const p2Faster = p1Time !== null && p2Time !== null && p2Time < p1Time;

          return (
            <div key={i} className="grid grid-cols-3 gap-2 items-center">
              <div className="text-xs text-text-secondary text-center">{i + 1}</div>
              <div className={`text-sm font-mono text-center rounded-lg px-2 py-1.5 ${
                p1Faster ? 'bg-player1/10 text-player1 font-semibold' : 'text-text-primary'
              }`}>
                {p1Time !== null ? `${p1Time}ms` : '---'}
              </div>
              <div className={`text-sm font-mono text-center rounded-lg px-2 py-1.5 ${
                p2Faster ? 'bg-player2/10 text-player2 font-semibold' : 'text-text-primary'
              }`}>
                {p2Time !== null ? `${p2Time}ms` : '---'}
              </div>
            </div>
          );
        })}
      </div>

      {/* Average row */}
      <div className="mt-4 pt-4 border-t border-border">
        <div className="grid grid-cols-3 gap-2 items-center">
          <div className="text-xs font-semibold text-text-secondary text-center">Avg</div>
          <div className={`text-base font-mono font-bold text-center ${p1Wins ? 'text-player1' : 'text-text-primary'}`}>
            {p1Avg !== null ? `${Math.round(p1Avg)}ms` : '---'}
          </div>
          <div className={`text-base font-mono font-bold text-center ${p2Wins ? 'text-player2' : 'text-text-primary'}`}>
            {p2Avg !== null ? `${Math.round(p2Avg)}ms` : '---'}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

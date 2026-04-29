'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface LeaderboardStats {
  ricky_wins: number;
  lilian_wins: number;
  draws: number;
  by_game: {
    'connect-four': { ricky: number; lilian: number; draws: number };
    'tic-tac-toe': { ricky: number; lilian: number; draws: number };
    'mini-golf': { ricky: number; lilian: number; draws: number };
    'jenga': { ricky: number; lilian: number; draws: number };
    'snakes-and-ladders': { ricky: number; lilian: number; draws: number };
  };
  streaks: {
    ricky_current: number;
    lilian_current: number;
    ricky_best: number;
    lilian_best: number;
  };
  wordle_stats: {
    played: number;
    won: number;
    average_guesses: number;
  };
}

interface LeaderboardProps {
  stats: LeaderboardStats;
  onReset: () => void;
  loading?: boolean;
}

export function Leaderboard({ stats, onReset, loading }: LeaderboardProps) {
  const [expanded, setExpanded] = useState(false);

  const totalGames = stats.ricky_wins + stats.lilian_wins + stats.draws;
  const hasGames = totalGames > 0 || stats.wordle_stats.played > 0;

  if (!hasGames) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15, ease: [0.21, 0.47, 0.32, 0.98] }}
      className="max-w-3xl mx-auto mb-10 w-full"
    >
      <div className="rounded-3xl border border-border bg-surface overflow-hidden">
        {/* Collapsed header — always visible */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between px-6 py-4 sm:px-8 sm:py-5 cursor-pointer group"
        >
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-text-secondary">Scoreboard</span>
            <div className="flex items-center gap-2 text-base font-semibold">
              <span className="text-player1">Ricky: {stats.ricky_wins}</span>
              <span className="text-text-secondary/40">|</span>
              <span className="text-player2">Lilian: {stats.lilian_wins}</span>
              {stats.draws > 0 && (
                <>
                  <span className="text-text-secondary/40">|</span>
                  <span className="text-text-secondary">Draws: {stats.draws}</span>
                </>
              )}
            </div>
          </div>

          <motion.svg
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.3, ease: [0.21, 0.47, 0.32, 0.98] }}
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-text-secondary/60 group-hover:text-text-primary transition-colors shrink-0"
          >
            <polyline points="6 9 12 15 18 9" />
          </motion.svg>
        </button>

        {/* Expanded content */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.21, 0.47, 0.32, 0.98] }}
              className="overflow-hidden"
            >
              <div className="px-6 pb-6 sm:px-8 sm:pb-8 space-y-6 border-t border-border pt-5">
                {/* Per-game breakdown */}
                {totalGames > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary/70">
                      By Game
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <GameStat
                        label="Connect Four"
                        ricky={stats.by_game['connect-four'].ricky}
                        lilian={stats.by_game['connect-four'].lilian}
                        draws={stats.by_game['connect-four'].draws}
                      />
                      <GameStat
                        label="Tic-Tac-Toe"
                        ricky={stats.by_game['tic-tac-toe'].ricky}
                        lilian={stats.by_game['tic-tac-toe'].lilian}
                        draws={stats.by_game['tic-tac-toe'].draws}
                      />
                      <GameStat
                        label="Mini Golf"
                        ricky={stats.by_game['mini-golf'].ricky}
                        lilian={stats.by_game['mini-golf'].lilian}
                        draws={stats.by_game['mini-golf'].draws}
                      />
                      <GameStat
                        label="Jenga"
                        ricky={stats.by_game['jenga'].ricky}
                        lilian={stats.by_game['jenga'].lilian}
                        draws={stats.by_game['jenga'].draws}
                      />
                      <GameStat
                        label="Snakes & Ladders"
                        ricky={stats.by_game['snakes-and-ladders'].ricky}
                        lilian={stats.by_game['snakes-and-ladders'].lilian}
                        draws={stats.by_game['snakes-and-ladders'].draws}
                      />
                    </div>
                  </div>
                )}

                {/* Streaks */}
                {(stats.streaks.ricky_current > 0 || stats.streaks.lilian_current > 0 ||
                  stats.streaks.ricky_best > 0 || stats.streaks.lilian_best > 0) && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary/70">
                      Win Streaks
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-background px-4 py-3">
                        <p className="text-xs text-text-secondary mb-1">Ricky</p>
                        <p className="text-sm font-medium text-text-primary">
                          {stats.streaks.ricky_current > 0 && (
                            <span className="text-player1">{stats.streaks.ricky_current} current</span>
                          )}
                          {stats.streaks.ricky_current > 0 && stats.streaks.ricky_best > 0 && ' / '}
                          {stats.streaks.ricky_best > 0 && (
                            <span>{stats.streaks.ricky_best} best</span>
                          )}
                          {stats.streaks.ricky_current === 0 && stats.streaks.ricky_best === 0 && (
                            <span className="text-text-secondary">—</span>
                          )}
                        </p>
                      </div>
                      <div className="rounded-xl bg-background px-4 py-3">
                        <p className="text-xs text-text-secondary mb-1">Lilian</p>
                        <p className="text-sm font-medium text-text-primary">
                          {stats.streaks.lilian_current > 0 && (
                            <span className="text-player2">{stats.streaks.lilian_current} current</span>
                          )}
                          {stats.streaks.lilian_current > 0 && stats.streaks.lilian_best > 0 && ' / '}
                          {stats.streaks.lilian_best > 0 && (
                            <span>{stats.streaks.lilian_best} best</span>
                          )}
                          {stats.streaks.lilian_current === 0 && stats.streaks.lilian_best === 0 && (
                            <span className="text-text-secondary">—</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Wordle stats */}
                {stats.wordle_stats.played > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary/70">
                      Wordle (Co-op)
                    </h3>
                    <div className="flex items-center gap-6 rounded-xl bg-background px-4 py-3">
                      <div>
                        <p className="text-xs text-text-secondary">Played</p>
                        <p className="text-base font-semibold text-text-primary">{stats.wordle_stats.played}</p>
                      </div>
                      <div>
                        <p className="text-xs text-text-secondary">Solved</p>
                        <p className="text-base font-semibold text-text-primary">{stats.wordle_stats.won}</p>
                      </div>
                      <div>
                        <p className="text-xs text-text-secondary">Avg. Guesses</p>
                        <p className="text-base font-semibold text-text-primary">
                          {stats.wordle_stats.average_guesses > 0
                            ? stats.wordle_stats.average_guesses.toFixed(1)
                            : '—'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Reset button */}
                <div className="pt-2">
                  <button
                    onClick={onReset}
                    disabled={loading}
                    className="text-xs font-medium text-text-secondary/60 hover:text-player1 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Reset Stats
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function GameStat({ label, ricky, lilian, draws }: { label: string; ricky: number; lilian: number; draws: number }) {
  const total = ricky + lilian + draws;
  if (total === 0) return null;

  return (
    <div className="rounded-xl bg-background px-4 py-3">
      <p className="text-xs text-text-secondary mb-1.5">{label}</p>
      <div className="flex items-center gap-3 text-sm font-medium">
        <span className="text-player1">R: {ricky}</span>
        <span className="text-text-secondary/30">|</span>
        <span className="text-player2">L: {lilian}</span>
        {draws > 0 && (
          <>
            <span className="text-text-secondary/30">|</span>
            <span className="text-text-secondary">D: {draws}</span>
          </>
        )}
      </div>
    </div>
  );
}

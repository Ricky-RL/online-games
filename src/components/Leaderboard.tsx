'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface LeaderboardStats {
  player1_name: string;
  player2_name: string;
  ricky_wins: number;
  lilian_wins: number;
  draws: number;
  by_game: {
    'connect-four': { ricky: number; lilian: number; draws: number };
    'tic-tac-toe': { ricky: number; lilian: number; draws: number };
    'mini-golf': { ricky: number; lilian: number; draws: number };
    'jenga': { ricky: number; lilian: number; draws: number };
    'snakes-and-ladders': { ricky: number; lilian: number; draws: number };
    'monopoly': { ricky: number; lilian: number; draws: number };
    'battleship': { ricky: number; lilian: number; draws: number };
    'word-search': { ricky: number; lilian: number; draws: number };
    'memory': { ricky: number; lilian: number; draws: number };
    'big-2': { ricky: number; lilian: number; draws: number };
    'uno': { ricky: number; lilian: number; draws: number };
    'crazy-eights': { ricky: number; lilian: number; draws: number };
    'math-trivia': { ricky: number; lilian: number; draws: number };
    'jeopardy': { ricky: number; lilian: number; draws: number };
    'pool': { ricky: number; lilian: number; draws: number };
    'cup-pong': { ricky: number; lilian: number; draws: number };
    'reaction'?: { ricky: number; lilian: number; draws: number };
    'solitaire': { ricky: number; lilian: number; draws: number };
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
  daily_wordle_stats: {
    played: number;
    won: number;
    current_streak: number;
    best_streak: number;
    guess_distribution: [number, number, number, number, number, number];
    history: { date: string; guesses: number; won: boolean }[];
  };
  sudoku_stats: {
    played: number;
    won: number;
    average_time: number;
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
  const hasGames = totalGames > 0 || stats.wordle_stats.played > 0 || stats.sudoku_stats.played > 0;

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
              <span className="text-player1">{stats.player1_name}: {stats.ricky_wins}</span>
              <span className="text-text-secondary/40">|</span>
              <span className="text-player2">{stats.player2_name}: {stats.lilian_wins}</span>
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
                      <GameStat
                        label="Monopoly"
                        ricky={stats.by_game['monopoly'].ricky}
                        lilian={stats.by_game['monopoly'].lilian}
                        draws={stats.by_game['monopoly'].draws}
                      />
                      <GameStat
                        label="Battleship"
                        ricky={stats.by_game['battleship'].ricky}
                        lilian={stats.by_game['battleship'].lilian}
                        draws={stats.by_game['battleship'].draws}
                      />
                      <GameStat
                        label="Word Search"
                        ricky={stats.by_game['word-search'].ricky}
                        lilian={stats.by_game['word-search'].lilian}
                        draws={stats.by_game['word-search'].draws}
                      />
                      <GameStat
                        label="Memory"
                        ricky={stats.by_game['memory'].ricky}
                        lilian={stats.by_game['memory'].lilian}
                        draws={stats.by_game['memory'].draws}
                      />
                      <GameStat
                        label="Big 2"
                        ricky={stats.by_game['big-2'].ricky}
                        lilian={stats.by_game['big-2'].lilian}
                        draws={stats.by_game['big-2'].draws}
                      />
                      <GameStat
                        label="UNO"
                        ricky={stats.by_game['uno'].ricky}
                        lilian={stats.by_game['uno'].lilian}
                        draws={stats.by_game['uno'].draws}
                      />
                      <GameStat
                        label="Crazy Eights"
                        ricky={stats.by_game['crazy-eights'].ricky}
                        lilian={stats.by_game['crazy-eights'].lilian}
                        draws={stats.by_game['crazy-eights'].draws}
                      />
                      <GameStat
                        label="Math Trivia"
                        ricky={stats.by_game['math-trivia'].ricky}
                        lilian={stats.by_game['math-trivia'].lilian}
                        draws={stats.by_game['math-trivia'].draws}
                      />
                      <GameStat
                        label="Jeopardy"
                        ricky={stats.by_game['jeopardy'].ricky}
                        lilian={stats.by_game['jeopardy'].lilian}
                        draws={stats.by_game['jeopardy'].draws}
                      />
                      <GameStat
                        label="Pool"
                        ricky={stats.by_game['pool'].ricky}
                        lilian={stats.by_game['pool'].lilian}
                        draws={stats.by_game['pool'].draws}
                      />
                      <GameStat
                        label="Cup Pong"
                        ricky={stats.by_game['cup-pong'].ricky}
                        lilian={stats.by_game['cup-pong'].lilian}
                        draws={stats.by_game['cup-pong'].draws}
                      />
                      {stats.by_game['reaction'] && (
                        <GameStat
                          label="Reaction"
                          ricky={stats.by_game['reaction'].ricky}
                          lilian={stats.by_game['reaction'].lilian}
                          draws={stats.by_game['reaction'].draws}
                        />
                      )}
                      <GameStat
                        label="Solitaire"
                        ricky={stats.by_game['solitaire'].ricky}
                        lilian={stats.by_game['solitaire'].lilian}
                        draws={stats.by_game['solitaire'].draws}
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
                        <p className="text-xs text-text-secondary mb-1">{stats.player1_name}</p>
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
                        <p className="text-xs text-text-secondary mb-1">{stats.player2_name}</p>
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

                {/* Sudoku stats */}
                {stats.sudoku_stats.played > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary/70">
                      Sudoku (Co-op)
                    </h3>
                    <div className="flex items-center gap-6 rounded-xl bg-background px-4 py-3">
                      <div>
                        <p className="text-xs text-text-secondary">Played</p>
                        <p className="text-base font-semibold text-text-primary">{stats.sudoku_stats.played}</p>
                      </div>
                      <div>
                        <p className="text-xs text-text-secondary">Solved</p>
                        <p className="text-base font-semibold text-text-primary">{stats.sudoku_stats.won}</p>
                      </div>
                      <div>
                        <p className="text-xs text-text-secondary">Avg. Time</p>
                        <p className="text-base font-semibold text-text-primary">
                          {stats.sudoku_stats.average_time > 0
                            ? `${Math.floor(stats.sudoku_stats.average_time / 60)}:${(stats.sudoku_stats.average_time % 60).toString().padStart(2, '0')}`
                            : '—'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Daily Wordle Streak */}
                {stats.daily_wordle_stats.played > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary/70">
                      Daily Wordle
                    </h3>
                    <div className="rounded-xl bg-background px-4 py-4 space-y-4">
                      {/* Stats row */}
                      <div className="flex items-center gap-6">
                        <div>
                          <p className="text-xs text-text-secondary">Played</p>
                          <p className="text-base font-semibold text-text-primary">{stats.daily_wordle_stats.played}</p>
                        </div>
                        <div>
                          <p className="text-xs text-text-secondary">Win %</p>
                          <p className="text-base font-semibold text-text-primary">
                            {Math.round((stats.daily_wordle_stats.won / stats.daily_wordle_stats.played) * 100)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-text-secondary">Streak</p>
                          <p className="text-base font-semibold text-accent">
                            {stats.daily_wordle_stats.current_streak}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-text-secondary">Best</p>
                          <p className="text-base font-semibold text-text-primary">
                            {stats.daily_wordle_stats.best_streak}
                          </p>
                        </div>
                      </div>

                      {/* Guess distribution */}
                      {stats.daily_wordle_stats.won > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-xs text-text-secondary font-medium">Guess Distribution</p>
                          <GuessDistribution distribution={stats.daily_wordle_stats.guess_distribution} />
                        </div>
                      )}

                      {/* Recent history */}
                      {stats.daily_wordle_stats.history.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-xs text-text-secondary font-medium">Recent</p>
                          <div className="flex flex-wrap gap-1.5">
                            {stats.daily_wordle_stats.history.slice(0, 14).map((entry) => (
                              <div
                                key={entry.date}
                                className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold ${
                                  entry.won
                                    ? 'bg-green-500/20 text-green-400'
                                    : 'bg-red-500/20 text-red-400'
                                }`}
                                title={`${entry.date}: ${entry.won ? `Solved in ${entry.guesses}` : 'Failed'}`}
                              >
                                {entry.won ? entry.guesses : 'X'}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
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

function GuessDistribution({ distribution }: { distribution: [number, number, number, number, number, number] }) {
  const max = Math.max(...distribution, 1);

  return (
    <div className="space-y-1">
      {distribution.map((count, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-xs text-text-secondary w-3 text-right">{i + 1}</span>
          <div className="flex-1 h-5 relative">
            <div
              className="h-full rounded-sm bg-green-500/30 flex items-center justify-end px-1.5 min-w-[1.25rem]"
              style={{ width: `${Math.max((count / max) * 100, 8)}%` }}
            >
              <span className="text-xs font-semibold text-green-300">{count}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

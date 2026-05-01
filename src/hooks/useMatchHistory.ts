'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';

const POLL_INTERVAL_MS = 5000;

export interface MatchResult {
  id: string;
  game_type: 'connect-four' | 'tic-tac-toe' | 'wordle' | 'mini-golf' | 'jenga' | 'snakes-and-ladders' | 'word-search' | 'monopoly' | 'battleship' | 'memory' | 'math-trivia' | 'jeopardy' | 'pool' | 'cup-pong' | 'reaction';
  winner_id: string | null;
  winner_name: string | null;
  loser_id: string | null;
  loser_name: string | null;
  is_draw: boolean;
  metadata: { guessCount?: number; won?: boolean; isDaily?: boolean; date?: string; totalMoves?: number; theme?: string; p1Words?: number; p2Words?: number; p1Time?: number; p2Time?: number } | null;
  player1_id: string;
  player1_name: string;
  player2_id: string;
  player2_name: string;
  played_at: string;
}

export interface LeaderboardStats {
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
    'math-trivia': { ricky: number; lilian: number; draws: number };
    'jeopardy': { ricky: number; lilian: number; draws: number };
    'pool': { ricky: number; lilian: number; draws: number };
    'cup-pong': { ricky: number; lilian: number; draws: number };
    'reaction': { ricky: number; lilian: number; draws: number };
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
    guess_distribution: [number, number, number, number, number, number]; // index 0 = solved in 1, index 5 = solved in 6
    history: { date: string; guesses: number; won: boolean }[];
  };
}

function computeStats(results: MatchResult[]): LeaderboardStats {
  let ricky_wins = 0;
  let lilian_wins = 0;
  let draws = 0;

  const by_game: LeaderboardStats['by_game'] = {
    'connect-four': { ricky: 0, lilian: 0, draws: 0 },
    'tic-tac-toe': { ricky: 0, lilian: 0, draws: 0 },
    'battleship': { ricky: 0, lilian: 0, draws: 0 },
    'mini-golf': { ricky: 0, lilian: 0, draws: 0 },
    'jenga': { ricky: 0, lilian: 0, draws: 0 },
    'snakes-and-ladders': { ricky: 0, lilian: 0, draws: 0 },
    'monopoly': { ricky: 0, lilian: 0, draws: 0 },
    'word-search': { ricky: 0, lilian: 0, draws: 0 },
    'memory': { ricky: 0, lilian: 0, draws: 0 },
    'math-trivia': { ricky: 0, lilian: 0, draws: 0 },
    'jeopardy': { ricky: 0, lilian: 0, draws: 0 },
    'pool': { ricky: 0, lilian: 0, draws: 0 },
    'cup-pong': { ricky: 0, lilian: 0, draws: 0 },
    'reaction': { ricky: 0, lilian: 0, draws: 0 },
  };

  let wordle_played = 0;
  let wordle_won = 0;
  let wordle_total_guesses = 0;

  const dailyWordles: { date: string; guesses: number; won: boolean }[] = [];

  for (const r of results) {
    if (r.game_type === 'wordle') {
      wordle_played++;
      if (r.metadata?.won) {
        wordle_won++;
        wordle_total_guesses += r.metadata.guessCount ?? 0;
      }
      if (r.metadata?.isDaily && r.metadata?.date) {
        dailyWordles.push({
          date: r.metadata.date,
          guesses: r.metadata.guessCount ?? 0,
          won: !!r.metadata.won,
        });
      }
      continue;
    }

    const gameKey = r.game_type as keyof typeof by_game;
    if (!(gameKey in by_game)) continue;

    if (r.is_draw) {
      draws++;
      by_game[gameKey].draws++;
    } else if (r.winner_name?.toLowerCase() === 'ricky') {
      ricky_wins++;
      by_game[gameKey].ricky++;
    } else if (r.winner_name?.toLowerCase() === 'lilian') {
      lilian_wins++;
      by_game[gameKey].lilian++;
    }
  }

  // Compute streaks from most recent to oldest (non-wordle games only)
  const competitive = results
    .filter((r) => r.game_type !== 'wordle')
    .sort((a, b) => new Date(b.played_at).getTime() - new Date(a.played_at).getTime());

  let ricky_current = 0;
  let lilian_current = 0;
  let ricky_best = 0;
  let lilian_best = 0;

  let rickyStreak = 0;
  let lilianStreak = 0;
  let rickyCurrentDone = false;
  let lilianCurrentDone = false;

  for (const r of competitive) {
    const isRickyWin = r.winner_name?.toLowerCase() === 'ricky';
    const isLilianWin = r.winner_name?.toLowerCase() === 'lilian';

    if (isRickyWin) {
      rickyStreak++;
      if (rickyStreak > ricky_best) ricky_best = rickyStreak;
      // Lilian's streak broken
      lilianStreak = 0;
      if (!lilianCurrentDone) lilianCurrentDone = true;
    } else if (isLilianWin) {
      lilianStreak++;
      if (lilianStreak > lilian_best) lilian_best = lilianStreak;
      // Ricky's streak broken
      rickyStreak = 0;
      if (!rickyCurrentDone) rickyCurrentDone = true;
    } else {
      // Draw breaks both streaks
      rickyStreak = 0;
      lilianStreak = 0;
      if (!rickyCurrentDone) rickyCurrentDone = true;
      if (!lilianCurrentDone) lilianCurrentDone = true;
    }

    if (!rickyCurrentDone) ricky_current = rickyStreak;
    if (!lilianCurrentDone) lilian_current = lilianStreak;
  }

  // Compute daily wordle stats
  const uniqueDailies = new Map<string, { guesses: number; won: boolean }>();
  for (const d of dailyWordles) {
    if (!uniqueDailies.has(d.date)) {
      uniqueDailies.set(d.date, { guesses: d.guesses, won: d.won });
    }
  }

  const sortedDates = [...uniqueDailies.keys()].sort().reverse();
  const guess_distribution: [number, number, number, number, number, number] = [0, 0, 0, 0, 0, 0];

  for (const date of sortedDates) {
    const entry = uniqueDailies.get(date)!;
    if (entry.won && entry.guesses >= 1 && entry.guesses <= 6) {
      guess_distribution[entry.guesses - 1]++;
    }
  }

  // Current streak: consecutive wins from most recent, only if last play was today or yesterday (ET)
  let computedCurrentStreak = 0;
  for (let i = 0; i < sortedDates.length; i++) {
    const entry = uniqueDailies.get(sortedDates[i])!;
    if (!entry.won) break;
    if (i === 0) {
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
      const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
      if (sortedDates[0] !== today && sortedDates[0] !== yesterday) break;
    } else {
      const prevDate = new Date(sortedDates[i - 1]);
      const currDate = new Date(sortedDates[i]);
      const diffDays = (prevDate.getTime() - currDate.getTime()) / 86400000;
      if (diffDays > 1) break;
    }
    computedCurrentStreak++;
  }

  // Best streak: scan chronologically for longest consecutive-day win sequence
  let tempStreak = 0;
  let computedBestStreak = 0;
  const chronologicalDates = [...sortedDates].reverse();
  for (let i = 0; i < chronologicalDates.length; i++) {
    const entry = uniqueDailies.get(chronologicalDates[i])!;
    if (!entry.won) {
      computedBestStreak = Math.max(computedBestStreak, tempStreak);
      tempStreak = 0;
      continue;
    }
    if (i > 0) {
      const prevDate = new Date(chronologicalDates[i - 1]);
      const currDate = new Date(chronologicalDates[i]);
      const diffDays = (currDate.getTime() - prevDate.getTime()) / 86400000;
      if (diffDays > 1) {
        computedBestStreak = Math.max(computedBestStreak, tempStreak);
        tempStreak = 0;
      }
    }
    tempStreak++;
  }
  computedBestStreak = Math.max(computedBestStreak, tempStreak);

  const dailyHistory = sortedDates.map((date) => ({
    date,
    guesses: uniqueDailies.get(date)!.guesses,
    won: uniqueDailies.get(date)!.won,
  }));

  return {
    ricky_wins,
    lilian_wins,
    draws,
    by_game,
    streaks: {
      ricky_current,
      lilian_current,
      ricky_best,
      lilian_best,
    },
    wordle_stats: {
      played: wordle_played,
      won: wordle_won,
      average_guesses: wordle_won > 0 ? wordle_total_guesses / wordle_won : 0,
    },
    daily_wordle_stats: {
      played: uniqueDailies.size,
      won: [...uniqueDailies.values()].filter((e) => e.won).length,
      current_streak: computedCurrentStreak,
      best_streak: computedBestStreak,
      guess_distribution,
      history: dailyHistory,
    },
  };
}

interface UseMatchHistoryReturn {
  results: MatchResult[];
  stats: LeaderboardStats;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  clearAll: () => Promise<void>;
}

export function useMatchHistory(): UseMatchHistoryReturn {
  const [results, setResults] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const fetchResults = useCallback(async () => {
    const { data, error: fetchError } = await supabase
      .from('match_results')
      .select('*')
      .order('played_at', { ascending: false });

    if (fetchError) {
      if (mountedRef.current) setError(fetchError.message);
      return;
    }

    if (mountedRef.current) {
      setResults(data as MatchResult[]);
      setError(null);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    async function init() {
      setLoading(true);
      await fetchResults();
      if (mountedRef.current) setLoading(false);
    }
    init();
    return () => { mountedRef.current = false; };
  }, [fetchResults]);

  // Poll for new results
  useEffect(() => {
    const interval = setInterval(fetchResults, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchResults]);

  const refetch = useCallback(async () => {
    await fetchResults();
  }, [fetchResults]);

  const clearAll = useCallback(async () => {
    const { error: deleteError } = await supabase
      .from('match_results')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // delete all rows

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setResults([]);
  }, []);

  const stats = computeStats(results);

  return { results, stats, loading, error, refetch, clearAll };
}

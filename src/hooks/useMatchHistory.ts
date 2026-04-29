'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';

const POLL_INTERVAL_MS = 5000;

export interface MatchResult {
  id: string;
  game_type: 'connect-four' | 'tic-tac-toe' | 'wordle' | 'mini-golf';
  winner_id: string | null;
  winner_name: string | null;
  loser_id: string | null;
  loser_name: string | null;
  is_draw: boolean;
  metadata: { guessCount?: number; won?: boolean; totalMoves?: number } | null;
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

function computeStats(results: MatchResult[]): LeaderboardStats {
  let ricky_wins = 0;
  let lilian_wins = 0;
  let draws = 0;

  const by_game = {
    'connect-four': { ricky: 0, lilian: 0, draws: 0 },
    'tic-tac-toe': { ricky: 0, lilian: 0, draws: 0 },
    'mini-golf': { ricky: 0, lilian: 0, draws: 0 },
  };

  let wordle_played = 0;
  let wordle_won = 0;
  let wordle_total_guesses = 0;

  for (const r of results) {
    if (r.game_type === 'wordle') {
      wordle_played++;
      if (r.metadata?.won) {
        wordle_won++;
        wordle_total_guesses += r.metadata.guessCount ?? 0;
      }
      continue;
    }

    const gameKey = r.game_type as 'connect-four' | 'tic-tac-toe' | 'mini-golf';

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

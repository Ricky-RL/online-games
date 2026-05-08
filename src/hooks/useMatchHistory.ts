'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { DEFAULT_GAME_ORDER } from '@/lib/game-registry';

const POLL_INTERVAL_MS = 5000;

export type MatchGameType = 'connect-four' | 'tic-tac-toe' | 'wordle' | 'mini-golf' | 'jenga' | 'snakes-and-ladders' | 'word-search' | 'monopoly' | 'battleship' | 'memory' | 'big-2' | 'uno' | 'crazy-eights' | 'math-trivia' | 'jeopardy' | 'pool' | 'cup-pong' | 'reaction' | 'sudoku' | 'solitaire';

type CompetitiveGameType = Exclude<MatchGameType, 'wordle' | 'sudoku'>;
type GameBreakdown = Record<CompetitiveGameType, { ricky: number; lilian: number; draws: number }>;

export interface MatchResult {
  id: string;
  game_type: MatchGameType;
  game_id: string | null;
  winner_id: string | null;
  winner_name: string | null;
  loser_id: string | null;
  loser_name: string | null;
  is_draw: boolean;
  metadata: { guessCount?: number; won?: boolean; isDaily?: boolean; date?: string; totalMoves?: number; theme?: string; p1Words?: number; p2Words?: number; p1Time?: number; p2Time?: number; difficulty?: string; moveCount?: number; timeSeconds?: number } | null;
  player1_id: string;
  player1_name: string;
  player2_id: string;
  player2_name: string;
  played_at: string;
}

export interface LeaderboardStats {
  player1_name: string;
  player2_name: string;
  ricky_wins: number;
  lilian_wins: number;
  draws: number;
  by_game: GameBreakdown;
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

const COMPETITIVE_GAME_TYPES = DEFAULT_GAME_ORDER
  .map((game) => game.slug)
  .filter((slug) => slug !== 'wordle' && slug !== 'sudoku') as CompetitiveGameType[];

function createBreakdown(): GameBreakdown {
  return Object.fromEntries(
    COMPETITIVE_GAME_TYPES.map((slug) => [slug, { ricky: 0, lilian: 0, draws: 0 }])
  ) as GameBreakdown;
}

function isPairResult(result: MatchResult, currentUserId?: string | null, boundUserId?: string | null) {
  if (!currentUserId || !boundUserId) return true;
  return (
    (result.player1_id === currentUserId && result.player2_id === boundUserId) ||
    (result.player1_id === boundUserId && result.player2_id === currentUserId)
  );
}

function nameFor(results: MatchResult[], userId: string | null | undefined, fallback: string) {
  if (!userId) return fallback;
  const row = results.find((result) => result.player1_id === userId || result.player2_id === userId);
  if (!row) return fallback;
  return row.player1_id === userId ? row.player1_name : row.player2_name;
}

function computeDailyStats(dailyWordles: { date: string; guesses: number; won: boolean }[]) {
  const uniqueDailies = new Map<string, { guesses: number; won: boolean }>();
  for (const daily of dailyWordles) {
    if (!uniqueDailies.has(daily.date)) uniqueDailies.set(daily.date, daily);
  }

  const dates = [...uniqueDailies.keys()].sort().reverse();
  const guess_distribution: [number, number, number, number, number, number] = [0, 0, 0, 0, 0, 0];
  for (const date of dates) {
    const entry = uniqueDailies.get(date)!;
    if (entry.won && entry.guesses >= 1 && entry.guesses <= 6) guess_distribution[entry.guesses - 1]++;
  }

  const toUtcDay = (date: string) => {
    const [year, month, day] = date.split('-').map(Number);
    return Date.UTC(year, month - 1, day);
  };
  const oneDayMs = 24 * 60 * 60 * 1000;
  const todayKey = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
  const todayUtcDay = toUtcDay(todayKey);

  let current_streak = 0;
  if (dates.length > 0) {
    let expectedUtcDay = toUtcDay(dates[0]);
    const latestIsCurrent = expectedUtcDay === todayUtcDay || expectedUtcDay === todayUtcDay - oneDayMs;
    if (latestIsCurrent) {
      for (const date of dates) {
        const entry = uniqueDailies.get(date)!;
        const utcDay = toUtcDay(date);
        if (utcDay !== expectedUtcDay || !entry.won) break;
        current_streak++;
        expectedUtcDay -= oneDayMs;
      }
    }
  }

  let best_streak = 0;
  let run = 0;
  let previousUtcDay: number | null = null;
  for (const date of [...dates].reverse()) {
    const entry = uniqueDailies.get(date)!;
    const utcDay = toUtcDay(date);
    if (previousUtcDay !== null && utcDay - previousUtcDay !== oneDayMs) {
      run = 0;
    }
    if (entry.won) {
      run++;
      best_streak = Math.max(best_streak, run);
    } else {
      run = 0;
    }
    previousUtcDay = utcDay;
  }

  return {
    played: uniqueDailies.size,
    won: [...uniqueDailies.values()].filter((entry) => entry.won).length,
    current_streak,
    best_streak,
    guess_distribution,
    history: dates.map((date) => ({ date, ...uniqueDailies.get(date)! })),
  };
}

function computeStats(results: MatchResult[], currentUserId?: string | null, boundUserId?: string | null): LeaderboardStats {
  const scopedResults = results.filter((result) => isPairResult(result, currentUserId, boundUserId));
  const player1_name = nameFor(scopedResults, currentUserId, currentUserId ? 'You' : 'Ricky');
  const player2_name = nameFor(scopedResults, boundUserId, boundUserId ? 'Opponent' : 'Lilian');

  let ricky_wins = 0;
  let lilian_wins = 0;
  let draws = 0;
  let wordle_played = 0;
  let wordle_won = 0;
  let wordle_total_guesses = 0;
  let sudoku_played = 0;
  let sudoku_won = 0;
  let sudoku_total_time = 0;
  const dailyWordles: { date: string; guesses: number; won: boolean }[] = [];
  const by_game = createBreakdown();

  for (const result of scopedResults) {
    if (result.game_type === 'wordle') {
      wordle_played++;
      if (result.metadata?.won) {
        wordle_won++;
        wordle_total_guesses += result.metadata.guessCount ?? 0;
      }
      if (result.metadata?.isDaily && result.metadata.date) {
        dailyWordles.push({ date: result.metadata.date, guesses: result.metadata.guessCount ?? 0, won: !!result.metadata.won });
      }
      continue;
    }

    if (result.game_type === 'sudoku') {
      sudoku_played++;
      if (result.metadata?.won) {
        sudoku_won++;
        sudoku_total_time += result.metadata.timeSeconds ?? 0;
      }
      continue;
    }

    if (!(result.game_type in by_game)) continue;
    const breakdown = by_game[result.game_type as CompetitiveGameType];
    if (result.is_draw) {
      draws++;
      breakdown.draws++;
    } else if ((currentUserId && result.winner_id === currentUserId) || (!currentUserId && result.winner_name?.toLowerCase() === 'ricky')) {
      ricky_wins++;
      breakdown.ricky++;
    } else if ((boundUserId && result.winner_id === boundUserId) || (!boundUserId && result.winner_name?.toLowerCase() === 'lilian')) {
      lilian_wins++;
      breakdown.lilian++;
    }
  }

  const competitive = scopedResults
    .filter((result) => result.game_type !== 'wordle' && result.game_type !== 'sudoku')
    .sort((a, b) => new Date(b.played_at).getTime() - new Date(a.played_at).getTime());

  let ricky_current = 0;
  let lilian_current = 0;
  let ricky_best = 0;
  let lilian_best = 0;
  let rickyRun = 0;
  let lilianRun = 0;
  let rickyCurrentOpen = true;
  let lilianCurrentOpen = true;

  for (const result of competitive) {
    const currentWon = currentUserId ? result.winner_id === currentUserId : result.winner_name?.toLowerCase() === 'ricky';
    const boundWon = boundUserId ? result.winner_id === boundUserId : result.winner_name?.toLowerCase() === 'lilian';

    if (currentWon) {
      rickyRun++;
      lilianRun = 0;
      ricky_best = Math.max(ricky_best, rickyRun);
      lilianCurrentOpen = false;
    } else if (boundWon) {
      lilianRun++;
      rickyRun = 0;
      lilian_best = Math.max(lilian_best, lilianRun);
      rickyCurrentOpen = false;
    } else {
      rickyRun = 0;
      lilianRun = 0;
      rickyCurrentOpen = false;
      lilianCurrentOpen = false;
    }

    if (rickyCurrentOpen) ricky_current = rickyRun;
    if (lilianCurrentOpen) lilian_current = lilianRun;
  }

  return {
    player1_name,
    player2_name,
    ricky_wins,
    lilian_wins,
    draws,
    by_game,
    streaks: { ricky_current, lilian_current, ricky_best, lilian_best },
    wordle_stats: {
      played: wordle_played,
      won: wordle_won,
      average_guesses: wordle_won > 0 ? wordle_total_guesses / wordle_won : 0,
    },
    daily_wordle_stats: computeDailyStats(dailyWordles),
    sudoku_stats: {
      played: sudoku_played,
      won: sudoku_won,
      average_time: sudoku_won > 0 ? Math.round(sudoku_total_time / sudoku_won) : 0,
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

export function useMatchHistory(currentUserId?: string | null, boundUserId?: string | null): UseMatchHistoryReturn {
  const [results, setResults] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const fetchResults = useCallback(async () => {
    const { supabase } = await import('@/lib/supabase');
    const { data, error: fetchError } = await supabase
      .from('match_results')
      .select('*')
      .order('played_at', { ascending: false });

    if (fetchError) {
      if (mountedRef.current) setError(fetchError.message);
      return;
    }

    if (mountedRef.current) {
      const rows = (data as MatchResult[]).filter((result) => isPairResult(result, currentUserId, boundUserId));
      setResults(rows);
      setError(null);
    }
  }, [boundUserId, currentUserId]);

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

  useEffect(() => {
    const interval = setInterval(fetchResults, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchResults]);

  const refetch = useCallback(async () => {
    await fetchResults();
  }, [fetchResults]);

  const clearAll = useCallback(async () => {
    if (currentUserId && boundUserId) {
      const ids = results.map((result) => result.id);
      if (ids.length === 0) return;
      const { supabase } = await import('@/lib/supabase');
      const { error: deleteError } = await supabase.from('match_results').delete().in('id', ids);
      if (deleteError) {
        setError(deleteError.message);
        return;
      }
      setResults([]);
      return;
    }

    const { supabase } = await import('@/lib/supabase');
    const { error: deleteError } = await supabase
      .from('match_results')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setResults([]);
  }, [boundUserId, currentUserId, results]);

  const stats = computeStats(results, currentUserId, boundUserId);

  return { results, stats, loading, error, refetch, clearAll };
}

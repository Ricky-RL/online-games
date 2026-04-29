'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
interface MatchResult {
  id: string;
  game_type: 'connect-four' | 'tic-tac-toe' | 'wordle' | 'mini-golf' | 'jenga' | 'snakes-and-ladders' | 'word-search';
  winner_id: string | null;
  winner_name: string | null;
  loser_id: string | null;
  loser_name: string | null;
  is_draw: boolean;
  metadata: { guessCount?: number; won?: boolean; totalMoves?: number; theme?: string; p1Words?: number; p2Words?: number; p1Time?: number; p2Time?: number } | null;
  player1_id: string;
  player1_name: string;
  player2_id: string;
  player2_name: string;
  played_at: string;
}
interface MatchHistoryProps {
  results: MatchResult[];
  loading?: boolean;
}
function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay === 1) return 'yesterday';
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
function gameIcon(gameType: MatchResult['game_type']): string {
  switch (gameType) {
    case 'connect-four': return '◉';
    case 'tic-tac-toe': return '✕○';
    case 'wordle': return '▢▢';
    case 'mini-golf': return '⛳';
    case 'jenga': return '▮▮';
    case 'snakes-and-ladders': return '🎲';
    case 'word-search': return '🔍';
  }
}
function gameLabel(gameType: MatchResult['game_type']): string {
  switch (gameType) {
    case 'connect-four': return 'Connect Four';
    case 'tic-tac-toe': return 'Tic-Tac-Toe';
    case 'wordle': return 'Wordle';
    case 'mini-golf': return 'Mini Golf';
    case 'jenga': return 'Jenga';
    case 'snakes-and-ladders': return 'Snakes & Ladders';
    case 'word-search': return 'Word Search';
  }
}
function outcomeText(result: MatchResult): string {
  if (result.game_type === 'wordle') {
    const guesses = result.metadata?.guessCount ?? 0;
    if (result.metadata?.won) {
      return `Solved in ${guesses} guess${guesses === 1 ? '' : 'es'}`;
    }
    return `Failed (${guesses} guesses)`;
  }
  if (result.game_type === 'word-search') {
    if (result.is_draw) return 'Draw';
    const meta = result.metadata;
    if (meta?.p1Words !== undefined && meta?.p2Words !== undefined) {
      return `${result.winner_name} won (${Math.max(meta.p1Words, meta.p2Words)} words)`;
    }
    return `${result.winner_name} won`;
  }
  if (result.is_draw) return 'Draw';
  return `${result.winner_name} won`;
}
function outcomeColor(result: MatchResult): string {
  if (result.game_type === 'wordle') {
    return result.metadata?.won ? 'text-wordle-correct' : 'text-text-secondary';
  }
  if (result.is_draw) return 'text-text-secondary';
  if (result.winner_name === 'Ricky') return 'text-player1';
  return 'text-player2';
}
export function MatchHistory({ results, loading }: MatchHistoryProps) {
  const [showCount, setShowCount] = useState(10);
  if (results.length === 0) return null;
  const visible = results.slice(0, showCount);
  const hasMore = results.length > showCount;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.25, ease: [0.21, 0.47, 0.32, 0.98] }}
      className="max-w-3xl mx-auto mt-12 w-full"
    >
      <h2 className="text-xs font-semibold uppercase tracking-wider text-text-secondary/70 mb-4 px-1">
        Recent Matches
      </h2>
      <div className="rounded-3xl border border-border bg-surface overflow-hidden divide-y divide-border">
        {loading && results.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-text-secondary">Loading...</div>
        ) : (
          visible.map((result, index) => (
            <motion.div
              key={result.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: index * 0.03 }}
              className="flex items-center gap-4 px-5 py-3.5 sm:px-6"
            >
              <span className="text-base w-7 text-center shrink-0 font-mono text-text-secondary/50">
                {gameIcon(result.game_type)}
              </span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${outcomeColor(result)} truncate`}>
                  {outcomeText(result)}
                </p>
                <p className="text-xs text-text-secondary/60 mt-0.5">
                  {gameLabel(result.game_type)}
                </p>
              </div>
              <span className="text-xs text-text-secondary/50 shrink-0">
                {formatRelativeTime(result.played_at)}
              </span>
            </motion.div>
          ))
        )}
      </div>
      {hasMore && (
        <div className="mt-4 text-center">
          <button
            onClick={() => setShowCount((c) => c + 10)}
            className="text-sm font-medium text-text-secondary/60 hover:text-text-primary transition-colors cursor-pointer"
          >
            Show more
          </button>
        </div>
      )}
    </motion.div>
  );
}

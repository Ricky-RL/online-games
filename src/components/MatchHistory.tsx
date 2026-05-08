'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
interface MatchResult {
  id: string;
  game_type: 'connect-four' | 'tic-tac-toe' | 'wordle' | 'mini-golf' | 'jenga' | 'snakes-and-ladders' | 'word-search' | 'monopoly' | 'battleship' | 'memory' | 'big-2' | 'uno' | 'crazy-eights' | 'math-trivia' | 'jeopardy' | 'pool' | 'cup-pong' | 'reaction' | 'sudoku' | 'solitaire';
  winner_id: string | null;
  winner_name: string | null;
  loser_id: string | null;
  loser_name: string | null;
  is_draw: boolean;
  metadata: { guessCount?: number; won?: boolean; totalMoves?: number; theme?: string; p1Words?: number; p2Words?: number; p1Time?: number; p2Time?: number; p1FoundWords?: string[]; p2FoundWords?: string[]; allWords?: string[]; p1Correct?: number; p2Correct?: number; difficulty?: string; moveCount?: number; timeSeconds?: number } | null;
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
    case 'monopoly': return '🏠';
    case 'battleship': return '🎯';
    case 'memory': return '🧠';
    case 'big-2': return '2';
    case 'uno': return 'U';
    case 'crazy-eights': return '8';
    case 'math-trivia': return '🧮';
    case 'jeopardy': return '❓';
    case 'pool': return '🎱';
    case 'cup-pong': return '🏓';
    case 'reaction': return '⚡';
    case 'sudoku': return '🧩';
    case 'solitaire': return '♠️';
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
    case 'monopoly': return 'Monopoly';
    case 'battleship': return 'Battleship';
    case 'memory': return 'Memory';
    case 'big-2': return 'Big 2';
    case 'uno': return 'UNO';
    case 'crazy-eights': return 'Crazy Eights';
    case 'math-trivia': return 'Math Trivia';
    case 'jeopardy': return 'Jeopardy';
    case 'pool': return 'Pool';
    case 'cup-pong': return 'Cup Pong';
    case 'reaction': return 'Reaction';
    case 'sudoku': return 'Sudoku';
    case 'solitaire': return 'Solitaire';
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
  if (result.game_type === 'sudoku') {
    if (result.metadata?.won) {
      const time = result.metadata.timeSeconds ?? 0;
      const m = Math.floor(time / 60);
      const s = time % 60;
      return `Solved in ${m}:${s.toString().padStart(2, '0')}`;
    }
    return 'Gave up';
  }
  if (result.game_type === 'word-search') {
    if (result.is_draw) return 'Draw';
    const meta = result.metadata;
    if (meta?.p1Words !== undefined && meta?.p2Words !== undefined) {
      return `${result.winner_name} won (${Math.max(meta.p1Words, meta.p2Words)} words)`;
    }
    return `${result.winner_name} won`;
  }
  if (result.game_type === 'math-trivia') {
    if (result.is_draw) return 'Draw';
    const meta = result.metadata;
    if (meta?.p1Correct !== undefined && meta?.p2Correct !== undefined) {
      const winnerCorrect = Math.max(meta.p1Correct, meta.p2Correct);
      const winnerTime = result.winner_name === result.player1_name ? meta.p1Time : meta.p2Time;
      const timeStr = winnerTime ? ` in ${formatTime(winnerTime)}` : '';
      return `${result.winner_name} won (${winnerCorrect}/15${timeStr})`;
    }
    return `${result.winner_name} won`;
  }
  if (result.game_type === 'solitaire') {
    if (result.is_draw) return 'Draw (both failed)';
    const meta = result.metadata as { p1Moves?: number; p1Time?: number; p2Moves?: number; p2Time?: number } | null;
    const winnerMoves = result.winner_name === result.player1_name ? meta?.p1Moves : meta?.p2Moves;
    const winnerTime = result.winner_name === result.player1_name ? meta?.p1Time : meta?.p2Time;
    if (winnerMoves && winnerTime) {
      const m = Math.floor(winnerTime / 60);
      const s = winnerTime % 60;
      return `${result.winner_name} won (${winnerMoves} moves, ${m}:${s.toString().padStart(2, '0')})`;
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
  if (result.game_type === 'sudoku') {
    return result.metadata?.won ? 'text-blue-400' : 'text-text-secondary';
  }
  if (result.is_draw) return 'text-text-secondary';
  if (result.winner_name === 'Ricky') return 'text-player1';
  return 'text-player2';
}
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function WordSearchDetail({ result, onClose }: { result: MatchResult; onClose: () => void }) {
  const meta = result.metadata;
  if (!meta) return null;

  const p1Color = '#E63946';
  const p2Color = '#FFBE0B';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.25, ease: [0.21, 0.47, 0.32, 0.98] }}
        className="bg-surface border border-border rounded-3xl w-full max-w-sm max-h-[80vh] overflow-y-auto p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-widest text-text-secondary">Word Search</div>
            {meta.theme && (
              <div className="text-sm text-text-secondary/70 mt-0.5 capitalize">{meta.theme}</div>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-text-secondary/50 hover:text-text-primary transition-colors p-1 cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Winner */}
        <div className="text-center">
          <div className="text-xs uppercase tracking-widest text-text-secondary mb-1">
            {result.is_draw ? 'Result' : 'Winner'}
          </div>
          <div
            className="text-2xl font-bold"
            style={{ color: result.is_draw ? undefined : result.winner_name === result.player1_name ? p1Color : p2Color }}
          >
            {result.is_draw ? 'Draw!' : result.winner_name}
          </div>
        </div>

        {/* Score comparison */}
        <div className="flex justify-between items-center p-4 bg-background/50 rounded-2xl border border-border">
          <div className="text-center flex-1">
            <div className="text-xs text-text-secondary mb-1">{result.player1_name}</div>
            <div className="text-3xl font-bold" style={{ color: p1Color }}>{meta.p1Words ?? 0}</div>
            <div className="text-xs text-text-secondary">words</div>
            {meta.p1Time !== undefined && (
              <div className="text-sm text-text-secondary mt-1">{formatTime(meta.p1Time)}</div>
            )}
          </div>
          <div className="text-text-secondary text-sm">vs</div>
          <div className="text-center flex-1">
            <div className="text-xs text-text-secondary mb-1">{result.player2_name}</div>
            <div className="text-3xl font-bold" style={{ color: p2Color }}>{meta.p2Words ?? 0}</div>
            <div className="text-xs text-text-secondary">words</div>
            {meta.p2Time !== undefined && (
              <div className="text-sm text-text-secondary mt-1">{formatTime(meta.p2Time)}</div>
            )}
          </div>
        </div>

        {/* Word breakdown */}
        {meta.allWords && meta.allWords.length > 0 && (
          <div className="bg-background/50 rounded-2xl border border-border p-4">
            <div className="text-xs uppercase tracking-wider text-text-secondary mb-3">
              Words ({meta.allWords.length} total)
            </div>
            <div className="space-y-1.5">
              {meta.allWords.map((word) => {
                const p1Found = meta.p1FoundWords?.includes(word) ?? false;
                const p2Found = meta.p2FoundWords?.includes(word) ?? false;
                const neitherFound = !p1Found && !p2Found;
                return (
                  <div
                    key={word}
                    className={`flex justify-between items-center px-3 py-1.5 rounded-lg ${neitherFound ? 'opacity-40' : ''}`}
                  >
                    <span className={`font-medium text-sm ${neitherFound ? 'text-text-secondary' : 'text-text-primary'}`}>
                      {word}
                    </span>
                    <div className="flex gap-3 text-sm">
                      <span style={{ color: p1Found ? p1Color : '#555' }}>
                        {p1Found ? '✓' : '✗'}
                      </span>
                      <span style={{ color: p2Found ? p2Color : '#555' }}>
                        {p2Found ? '✓' : '✗'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Played at */}
        <div className="text-center text-xs text-text-secondary/50">
          {new Date(result.played_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
        </div>
      </motion.div>
    </motion.div>
  );
}

export function MatchHistory({ results, loading }: MatchHistoryProps) {
  const [showCount, setShowCount] = useState(10);
  const [selectedMatch, setSelectedMatch] = useState<MatchResult | null>(null);
  if (results.length === 0) return null;
  const visible = results.slice(0, showCount);
  const hasMore = results.length > showCount;

  const hasDetail = (result: MatchResult) =>
    result.game_type === 'word-search' && result.metadata?.p1Words !== undefined;

  return (
    <>
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
                className={`flex items-center gap-4 px-5 py-3.5 sm:px-6 ${hasDetail(result) ? 'cursor-pointer hover:bg-background/40 transition-colors' : ''}`}
                onClick={() => hasDetail(result) && setSelectedMatch(result)}
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
      <AnimatePresence>
        {selectedMatch && (
          <WordSearchDetail result={selectedMatch} onClose={() => setSelectedMatch(null)} />
        )}
      </AnimatePresence>
    </>
  );
}


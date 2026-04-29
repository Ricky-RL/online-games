'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { WordSearchBoardState } from '@/lib/word-search-types';
import { usePlayerColors } from '@/hooks/usePlayerColors';
import { getWordCells } from '@/lib/word-search-logic';

interface ResultsProps {
  board: WordSearchBoardState;
  player1Name: string;
  player2Name: string;
  winner: 1 | 2 | null;
  isDraw: boolean;
}

export function Results({ board, player1Name, player2Name, winner, isDraw }: ResultsProps) {
  const { player1Color, player2Color } = usePlayerColors();
  const [showGrid, setShowGrid] = useState(false);
  const p1 = board.player1Result;
  const p2 = board.player2Result;

  if (!p1 || !p2) return null;

  const allWords = board.words.map((w) => w.word).sort((a, b) => a.localeCompare(b));

  // Build set of all word cells for the solved grid view
  const wordCellSet = new Set<string>();
  for (const placement of board.words) {
    const cells = getWordCells(placement);
    cells.forEach(([r, c]) => wordCellSet.add(`${r},${c}`));
  }

  function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.21, 0.47, 0.32, 0.98] }}
      className="w-full max-w-md mx-auto space-y-6"
    >
      {/* Winner banner */}
      <div className="text-center">
        <div className="text-xs uppercase tracking-widest text-text-secondary mb-1">
          {isDraw ? 'Result' : 'Winner'}
        </div>
        <div className="text-2xl font-bold" style={{ color: isDraw ? undefined : winner === 1 ? player1Color : player2Color }}>
          {isDraw ? 'Draw!' : winner === 1 ? player1Name : player2Name}
        </div>
      </div>

      {/* Score comparison */}
      <div className="flex justify-between items-center p-4 bg-surface rounded-2xl border border-border">
        <div className="text-center flex-1">
          <div className="text-xs text-text-secondary mb-1">{player1Name}</div>
          <div className="text-3xl font-bold" style={{ color: player1Color }}>{p1.foundWords.length}</div>
          <div className="text-xs text-text-secondary">words</div>
          <div className="text-sm text-text-secondary mt-1">{formatTime(p1.timeUsed)}</div>
        </div>
        <div className="text-text-secondary text-sm">vs</div>
        <div className="text-center flex-1">
          <div className="text-xs text-text-secondary mb-1">{player2Name}</div>
          <div className="text-3xl font-bold" style={{ color: player2Color }}>{p2.foundWords.length}</div>
          <div className="text-xs text-text-secondary">words</div>
          <div className="text-sm text-text-secondary mt-1">{formatTime(p2.timeUsed)}</div>
        </div>
      </div>

      {/* Word breakdown */}
      <div className="bg-surface rounded-2xl border border-border p-4">
        <div className="text-xs uppercase tracking-wider text-text-secondary mb-3">
          Words ({allWords.length} total)
        </div>
        <div className="space-y-2">
          {allWords.map((word) => {
            const p1Found = p1.foundWords.includes(word);
            const p2Found = p2.foundWords.includes(word);
            const neitherFound = !p1Found && !p2Found;

            return (
              <div
                key={word}
                className={`flex justify-between items-center px-3 py-2 rounded-lg ${neitherFound ? 'bg-background/50' : 'bg-background'}`}
              >
                <span className={`font-medium text-sm ${neitherFound ? 'text-text-secondary/40' : 'text-text-primary'}`}>
                  {word}
                </span>
                <div className="flex gap-3">
                  <span style={{ color: p1Found ? player1Color : '#555' }}>
                    {p1Found ? '✓' : '✗'}
                  </span>
                  <span style={{ color: p2Found ? player2Color : '#555' }}>
                    {p2Found ? '✓' : '✗'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Expandable solved grid */}
      <div className="bg-surface rounded-2xl border border-border overflow-hidden">
        <button
          onClick={() => setShowGrid(!showGrid)}
          className="w-full px-4 py-3 flex items-center justify-between text-sm text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
        >
          <span>View solved grid</span>
          <svg
            className={`w-4 h-4 transition-transform ${showGrid ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <AnimatePresence>
          {showGrid && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="p-4 pt-0">
                <div
                  className="grid gap-0.5 mx-auto"
                  style={{
                    gridTemplateColumns: `repeat(${board.grid[0].length}, minmax(0, 1fr))`,
                    maxWidth: '280px',
                  }}
                >
                  {board.grid.map((row, rowIdx) =>
                    row.map((letter, colIdx) => {
                      const key = `${rowIdx},${colIdx}`;
                      const isWordCell = wordCellSet.has(key);
                      return (
                        <div
                          key={key}
                          className={`w-6 h-6 flex items-center justify-center rounded text-xs font-bold ${
                            isWordCell
                              ? 'bg-green-500/30 text-green-300'
                              : 'bg-background/30 text-text-secondary/30'
                          }`}
                        >
                          {letter}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

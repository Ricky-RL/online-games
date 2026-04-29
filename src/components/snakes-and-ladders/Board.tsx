'use client';

import { motion } from 'framer-motion';
import { useColors } from '@/contexts/PlayerColorsContext';
import type { SnakesAndLaddersState } from '@/lib/types';

interface BoardProps {
  board: SnakesAndLaddersState;
}

function getSquarePosition(square: number): { row: number; col: number } {
  const row = Math.floor((square - 1) / 10);
  const col = row % 2 === 0 ? (square - 1) % 10 : 9 - ((square - 1) % 10);
  return { row: 9 - row, col };
}

function getCenter(square: number): { x: number; y: number } {
  const { row, col } = getSquarePosition(square);
  return { x: col * 50 + 25, y: row * 50 + 25 };
}

function snakePath(from: number, to: number): string {
  const start = getCenter(from);
  const end = getCenter(to);
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const waves = Math.max(2, Math.round(dist / 80));
  const amp = 12;

  const perpX = -dy / dist;
  const perpY = dx / dist;

  let d = `M ${start.x} ${start.y}`;
  for (let i = 1; i <= waves * 2; i++) {
    const t = i / (waves * 2);
    const mx = start.x + dx * t;
    const my = start.y + dy * t;
    const sign = i % 2 === 0 ? 1 : -1;
    const offset = sign * amp * (1 - Math.abs(t - 0.5) * 1.2);
    d += ` Q ${mx + perpX * offset} ${my + perpY * offset}, ${start.x + dx * ((i + 0.5) / (waves * 2 + 1))} ${start.y + dy * ((i + 0.5) / (waves * 2 + 1))}`;
  }
  d += ` L ${end.x} ${end.y}`;
  return d;
}

function ladderRungs(from: number, to: number, spacing: number = 6): { x1: number; y1: number; x2: number; y2: number }[] {
  const start = getCenter(from);
  const end = getCenter(to);
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const count = Math.max(2, Math.round(dist / 30));

  const perpX = (-dy / dist) * spacing;
  const perpY = (dx / dist) * spacing;

  const rungs = [];
  for (let i = 1; i < count; i++) {
    const t = i / count;
    const cx = start.x + dx * t;
    const cy = start.y + dy * t;
    rungs.push({
      x1: cx - perpX, y1: cy - perpY,
      x2: cx + perpX, y2: cy + perpY,
    });
  }
  return rungs;
}

export function Board({ board }: BoardProps) {
  const { player1Color, player2Color } = useColors();

  const squares: number[] = [];
  for (let i = 1; i <= 100; i++) squares.push(i);

  const snakeEntries = Object.entries(board.snakes).map(([head, tail]) => ({
    from: Number(head),
    to: tail as number,
  }));

  const ladderEntries = Object.entries(board.ladders).map(([bottom, top]) => ({
    from: Number(bottom),
    to: top as number,
  }));

  return (
    <div className="relative w-full max-w-[500px] aspect-square">
      {/* Grid */}
      <div className="grid grid-cols-10 grid-rows-10 w-full h-full gap-0.5 rounded-2xl overflow-hidden border border-border bg-border/50">
        {squares.map((num) => {
          const { row, col } = getSquarePosition(num);
          const gridRow = row + 1;
          const gridCol = col + 1;
          const isSnakeHead = board.snakes[num] !== undefined;
          const isLadderBottom = board.ladders[num] !== undefined;
          const hasPlayer1 = board.players[1] === num;
          const hasPlayer2 = board.players[2] === num;

          return (
            <div
              key={num}
              className="relative flex items-center justify-center bg-surface text-[10px] font-medium text-text-secondary/50"
              style={{ gridRow, gridColumn: gridCol }}
            >
              <span className="absolute top-0.5 left-1 text-[8px]">{num}</span>

              {isSnakeHead && (
                <div className="absolute inset-0 bg-red-500/8 rounded-sm" />
              )}
              {isLadderBottom && (
                <div className="absolute inset-0 bg-emerald-500/8 rounded-sm" />
              )}

              {/* Player pieces */}
              <div className="flex gap-0.5">
                {hasPlayer1 && (
                  <motion.div
                    className="w-4 h-4 rounded-full border-2 border-white shadow-md z-10"
                    style={{ backgroundColor: player1Color }}
                    layoutId="player1-piece"
                    transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                  />
                )}
                {hasPlayer2 && (
                  <motion.div
                    className="w-4 h-4 rounded-full border-2 border-white shadow-md z-10"
                    style={{ backgroundColor: player2Color }}
                    layoutId="player2-piece"
                    transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Snake/Ladder overlay */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 500 500">
        {/* Ladders: two rails + rungs, solid green */}
        {ladderEntries.map(({ from, to }) => {
          const start = getCenter(from);
          const end = getCenter(to);
          const dx = end.x - start.x;
          const dy = end.y - start.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const perpX = (-dy / dist) * 6;
          const perpY = (dx / dist) * 6;
          const rungs = ladderRungs(from, to, 6);

          return (
            <g key={`ladder-${from}`} opacity="0.55">
              {/* Left rail */}
              <line
                x1={start.x - perpX} y1={start.y - perpY}
                x2={end.x - perpX} y2={end.y - perpY}
                stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round"
              />
              {/* Right rail */}
              <line
                x1={start.x + perpX} y1={start.y + perpY}
                x2={end.x + perpX} y2={end.y + perpY}
                stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round"
              />
              {/* Rungs */}
              {rungs.map((r, i) => (
                <line
                  key={i}
                  x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2}
                  stroke="#16a34a" strokeWidth="2" strokeLinecap="round"
                />
              ))}
            </g>
          );
        })}

        {/* Snakes: wavy red paths with head dot */}
        {snakeEntries.map(({ from, to }) => {
          const start = getCenter(from);
          return (
            <g key={`snake-${from}`} opacity="0.6">
              <path
                d={snakePath(from, to)}
                stroke="#dc2626" strokeWidth="3.5" fill="none"
                strokeLinecap="round" strokeLinejoin="round"
              />
              {/* Snake head */}
              <circle cx={start.x} cy={start.y} r="4" fill="#dc2626" />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

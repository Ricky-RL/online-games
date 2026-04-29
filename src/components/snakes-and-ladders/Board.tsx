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

const SNAKE_COLORS = ['#E63946', '#D62828', '#C1121F', '#A4133C', '#800F2F', '#590D22', '#FF6B6B', '#EE6C4D'];
const LADDER_COLORS = ['#2D6A4F', '#40916C', '#52B788', '#74C69D', '#1B4332', '#38A3A5', '#57CC99', '#80ED99'];

export function Board({ board }: BoardProps) {
  const { player1Color, player2Color } = useColors();

  const squares: number[] = [];
  for (let i = 1; i <= 100; i++) squares.push(i);

  const snakeEntries = Object.entries(board.snakes).map(([head, tail], i) => ({
    from: Number(head),
    to: tail,
    color: SNAKE_COLORS[i % SNAKE_COLORS.length],
  }));

  const ladderEntries = Object.entries(board.ladders).map(([bottom, top], i) => ({
    from: Number(bottom),
    to: top,
    color: LADDER_COLORS[i % LADDER_COLORS.length],
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
                <div className="absolute inset-0 bg-red-500/5 border border-red-400/20 rounded-sm" />
              )}
              {isLadderBottom && (
                <div className="absolute inset-0 bg-green-500/5 border border-green-400/20 rounded-sm" />
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

      {/* Snake/Ladder indicators overlay */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 500 500">
        {snakeEntries.map(({ from, to, color }) => {
          const fromPos = getSquarePosition(from);
          const toPos = getSquarePosition(to);
          const x1 = fromPos.col * 50 + 25;
          const y1 = fromPos.row * 50 + 25;
          const x2 = toPos.col * 50 + 25;
          const y2 = toPos.row * 50 + 25;
          return (
            <line
              key={`snake-${from}`}
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={color}
              strokeWidth="3"
              opacity="0.6"
              strokeLinecap="round"
              strokeDasharray="8 4"
            />
          );
        })}
        {ladderEntries.map(({ from, to, color }) => {
          const fromPos = getSquarePosition(from);
          const toPos = getSquarePosition(to);
          const x1 = fromPos.col * 50 + 25;
          const y1 = fromPos.row * 50 + 25;
          const x2 = toPos.col * 50 + 25;
          const y2 = toPos.row * 50 + 25;
          return (
            <g key={`ladder-${from}`}>
              <line x1={x1 - 5} y1={y1} x2={x2 - 5} y2={y2} stroke={color} strokeWidth="2.5" opacity="0.7" strokeLinecap="round" />
              <line x1={x1 + 5} y1={y1} x2={x2 + 5} y2={y2} stroke={color} strokeWidth="2.5" opacity="0.7" strokeLinecap="round" />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

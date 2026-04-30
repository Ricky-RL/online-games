'use client';

import { motion, useAnimationControls, AnimatePresence } from 'framer-motion';
import { useColors } from '@/contexts/PlayerColorsContext';
import { useEffect, useRef } from 'react';
import { POWERUP_INFO } from './PowerupToast';
import type { SnakesAndLaddersState } from '@/lib/types';
import type { LastMoveInfo } from '@/hooks/useSnakesAndLaddersGame';

interface BoardProps {
  board: SnakesAndLaddersState;
  lastMove: LastMoveInfo | null;
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

function getSteppingSquares(from: number, roll: number): number[] {
  const squares: number[] = [];
  let pos = from;
  let direction = 1;
  for (let i = 0; i < roll; i++) {
    pos += direction;
    if (pos > 100) {
      pos = 99;
      direction = -1;
    }
    squares.push(pos);
  }
  return squares;
}

function PlayerPiece({
  player,
  square,
  color,
  lastMove,
}: {
  player: 1 | 2;
  square: number;
  color: string;
  lastMove: LastMoveInfo | null;
}) {
  const controls = useAnimationControls();
  const posRef = useRef(getCenter(square));
  const lastAnimatedMove = useRef<string | null>(null);
  const isAnimating = useRef(false);

  useEffect(() => {
    if (
      lastMove &&
      lastMove.player === player &&
      !isAnimating.current
    ) {
      const moveKey = `${lastMove.from}-${lastMove.to}-${lastMove.roll}`;
      if (moveKey === lastAnimatedMove.current) return;
      lastAnimatedMove.current = moveKey;

      const steppingSquares = getSteppingSquares(lastMove.from, lastMove.roll);
      const landingSquare = steppingSquares[steppingSquares.length - 1];
      const finalSquare = lastMove.to;
      const hasSnakeOrLadder = landingSquare !== finalSquare;

      isAnimating.current = true;

      (async () => {
        for (const sq of steppingSquares) {
          const pos = getCenter(sq);
          await controls.start({
            x: pos.x,
            y: pos.y,
            transition: { duration: 0.15, ease: 'easeInOut' },
          });
        }

        if (hasSnakeOrLadder) {
          await new Promise((r) => setTimeout(r, 200));
          const finalPos = getCenter(finalSquare);
          await controls.start({
            x: finalPos.x,
            y: finalPos.y,
            transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] },
          });
        }

        posRef.current = getCenter(finalSquare);
        isAnimating.current = false;
      })();

      return;
    }

    if (!isAnimating.current) {
      const pos = getCenter(square);
      if (pos.x !== posRef.current.x || pos.y !== posRef.current.y) {
        posRef.current = pos;
        controls.set({ x: pos.x, y: pos.y });
      }
    }
  }, [lastMove, square, player, controls]);

  const initialPos = getCenter(square);

  return (
    <motion.circle
      cx={0}
      cy={0}
      r={7}
      fill={color}
      stroke="white"
      strokeWidth={2}
      style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}
      animate={controls}
      initial={{ x: initialPos.x, y: initialPos.y }}
    />
  );
}

export function Board({ board, lastMove }: BoardProps) {
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

  const p1Offset = board.players[1] === board.players[2] ? -5 : 0;
  const p2Offset = board.players[1] === board.players[2] ? 5 : 0;

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
          const powerupType = board.powerups?.[num];
          const powerupInfo = powerupType ? POWERUP_INFO[powerupType] : null;

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
              {powerupInfo && (
                <motion.div
                  key={`powerup-${num}-${powerupType}`}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                  className="absolute inset-0 flex items-center justify-center text-lg bg-amber-500/10 rounded-sm"
                >
                  {powerupInfo.icon}
                </motion.div>
              )}
            </div>
          );
        })}
      </div>

      {/* Snake/Ladder/Player overlay */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 500 500">
        {/* Ladders */}
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
              <line
                x1={start.x - perpX} y1={start.y - perpY}
                x2={end.x - perpX} y2={end.y - perpY}
                stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round"
              />
              <line
                x1={start.x + perpX} y1={start.y + perpY}
                x2={end.x + perpX} y2={end.y + perpY}
                stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round"
              />
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

        {/* Snakes */}
        {snakeEntries.map(({ from, to }) => {
          const start = getCenter(from);
          return (
            <g key={`snake-${from}`} opacity="0.6">
              <path
                d={snakePath(from, to)}
                stroke="#dc2626" strokeWidth="3.5" fill="none"
                strokeLinecap="round" strokeLinejoin="round"
              />
              <circle cx={start.x} cy={start.y} r="4" fill="#dc2626" />
            </g>
          );
        })}

        {/* Player pieces */}
        <g transform={`translate(${p1Offset}, 0)`}>
          <PlayerPiece
            player={1}
            square={board.players[1]}
            color={player1Color}
            lastMove={lastMove}
          />
        </g>
        <g transform={`translate(${p2Offset}, 0)`}>
          <PlayerPiece
            player={2}
            square={board.players[2]}
            color={player2Color}
            lastMove={lastMove}
          />
        </g>
      </svg>
    </div>
  );
}

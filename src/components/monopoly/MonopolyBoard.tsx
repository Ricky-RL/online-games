'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, useAnimationControls } from 'framer-motion';
import { MonopolyBoard as BoardState } from '@/lib/monopoly/types';
import { BOARD } from '@/lib/monopoly/board-data';
import type { MonopolyLastMove } from '@/hooks/useMonopolyGame';

interface MonopolyBoardProps {
  board: BoardState;
  lastMove: MonopolyLastMove | null;
}

const COLOR_MAP: Record<string, string> = {
  'brown': '#8B4513',
  'light-blue': '#87CEEB',
  'pink': '#FF69B4',
  'orange': '#FFA500',
  'red': '#FF0000',
  'yellow': '#FFD700',
  'green': '#008000',
  'dark-blue': '#00008B',
};

function getBoardPosition(index: number): { row: number; col: number; side: 'bottom' | 'left' | 'top' | 'right' } {
  if (index <= 10) return { row: 10, col: 10 - index, side: 'bottom' };
  if (index <= 20) return { row: 10 - (index - 10), col: 0, side: 'left' };
  if (index <= 30) return { row: 0, col: index - 20, side: 'top' };
  return { row: index - 30, col: 10, side: 'right' };
}

/**
 * Compute the list of board positions to step through when moving
 * from `from` to `to` (wrapping around 40 spaces).
 */
function getSteppingPositions(from: number, roll: number): number[] {
  const positions: number[] = [];
  for (let i = 1; i <= roll; i++) {
    positions.push((from + i) % 40);
  }
  return positions;
}

/**
 * AnimatedPiece renders a player's token on the board and animates it
 * step by step through intermediate squares when a move occurs.
 */
function AnimatedPiece({
  player,
  position,
  colorClass,
  lastMove,
  boardRef,
}: {
  player: 1 | 2;
  position: number;
  colorClass: string;
  lastMove: MonopolyLastMove | null;
  boardRef: React.RefObject<HTMLDivElement | null>;
}) {
  const controls = useAnimationControls();
  const isAnimating = useRef(false);
  const lastAnimatedKey = useRef<string | null>(null);
  const [animatedPosition, setAnimatedPosition] = useState<number>(position);
  const currentPosRef = useRef(position);
  const [pixelPos, setPixelPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Get pixel offset for a given board position index relative to the board container
  const getPixelPosition = useCallback((idx: number): { x: number; y: number } | null => {
    if (!boardRef.current) return null;
    const spaceEl = boardRef.current.querySelector(`[data-space-index="${idx}"]`) as HTMLElement | null;
    if (!spaceEl) return null;
    const boardRect = boardRef.current.getBoundingClientRect();
    const spaceRect = spaceEl.getBoundingClientRect();
    return {
      x: spaceRect.left - boardRect.left + spaceRect.width / 2,
      y: spaceRect.top - boardRect.top + spaceRect.height / 2,
    };
  }, [boardRef]);

  useEffect(() => {
    if (
      lastMove &&
      lastMove.player === player &&
      !isAnimating.current
    ) {
      const moveKey = `${lastMove.from}-${lastMove.to}-${lastMove.roll}`;
      if (moveKey === lastAnimatedKey.current) return;
      lastAnimatedKey.current = moveKey;

      const steppingPositions = getSteppingPositions(lastMove.from, lastMove.roll);

      isAnimating.current = true;

      (async () => {
        for (const pos of steppingPositions) {
          const pp = getPixelPosition(pos);
          if (pp) {
            await controls.start({
              x: pp.x,
              y: pp.y,
              transition: { duration: 0.18, ease: 'easeInOut' },
            });
            setPixelPos(pp);
          }
          setAnimatedPosition(pos);
        }

        // If the final position differs (e.g., Go To Jail sends to position 10),
        // do a longer slide to the final destination
        const finalPos = lastMove.to;
        const lastStepped = steppingPositions[steppingPositions.length - 1];
        if (finalPos !== lastStepped) {
          await new Promise((r) => setTimeout(r, 150));
          const pp = getPixelPosition(finalPos);
          if (pp) {
            await controls.start({
              x: pp.x,
              y: pp.y,
              transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] },
            });
            setPixelPos(pp);
          }
          setAnimatedPosition(finalPos);
        }

        currentPosRef.current = finalPos;
        isAnimating.current = false;
      })();

      return;
    }

    // If not animating and position changed (e.g. external update), snap immediately
    if (!isAnimating.current && position !== currentPosRef.current) {
      currentPosRef.current = position;
      setAnimatedPosition(position);
      const pp = getPixelPosition(position);
      if (pp) {
        setPixelPos(pp);
        controls.start({ x: pp.x, y: pp.y, transition: { duration: 0 } });
      }
    }
  }, [lastMove, position, player, controls, getPixelPosition]);

  // Compute position on mount and on resize — use controls.start with duration 0
  // instead of controls.set to ensure reliable initial placement
  useEffect(() => {
    const computePos = () => {
      const pp = getPixelPosition(animatedPosition);
      if (pp) {
        setPixelPos(pp);
        controls.start({ x: pp.x, y: pp.y, transition: { duration: 0 } });
      }
    };
    // Wait a frame for the DOM to render space elements
    const raf = requestAnimationFrame(computePos);
    window.addEventListener('resize', computePos);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', computePos);
    };
  }, [animatedPosition, controls, getPixelPosition]);

  // Offset to avoid overlap when both players are on same space
  const offsetY = player === 1 ? -4 : 4;

  return (
    <motion.div
      className={`absolute rounded-full border-2 border-white shadow-md ${colorClass}`}
      style={{
        width: 10,
        height: 10,
        marginLeft: -5,
        marginTop: -5 + offsetY,
        zIndex: 20,
        pointerEvents: 'none',
      }}
      animate={controls}
      initial={pixelPos}
    />
  );
}

function SpaceCell({ index, board }: { index: number; board: BoardState }) {
  const space = BOARD[index];
  const pos = getBoardPosition(index);
  const isCorner = (pos.col === 0 && pos.row === 0) || (pos.col === 10 && pos.row === 0) ||
                   (pos.col === 0 && pos.row === 10) || (pos.col === 10 && pos.row === 10);

  // Responsive sizing: corners are square, sides vary by orientation
  const sizeClasses = isCorner
    ? 'w-[28px] h-[28px] sm:w-10 sm:h-10 md:w-14 md:h-14 lg:w-16 lg:h-16'
    : pos.side === 'top' || pos.side === 'bottom'
      ? 'w-[22px] h-[28px] sm:w-7 sm:h-10 md:w-9 md:h-14 lg:w-10 lg:h-16'
      : 'w-[28px] h-[22px] sm:w-10 sm:h-7 md:w-14 md:h-9 lg:w-16 lg:h-10';

  return (
    <div
      data-space-index={index}
      className={`relative border border-border/50 flex flex-col items-center justify-center overflow-hidden ${sizeClasses}`}
      title={space.name}
    >
      {space.color && (
        <div
          className="absolute top-0 left-0 right-0 h-1 sm:h-1.5 md:h-2"
          style={{ backgroundColor: COLOR_MAP[space.color] ?? '#ccc' }}
        />
      )}
      <span className="text-[4px] sm:text-[5px] md:text-[6px] text-text-secondary text-center leading-tight px-0.5 mt-0.5 sm:mt-1 hidden sm:block">
        {space.name.length > 12 ? space.name.slice(0, 10) + '...' : space.name}
      </span>
      {board.properties[index] && (
        <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full absolute bottom-0.5 left-0.5 sm:bottom-1 sm:left-1 ${board.properties[index].owner === 1 ? 'bg-player1' : 'bg-player2'}`} />
      )}
    </div>
  );
}

export function MonopolyBoardView({ board, lastMove }: MonopolyBoardProps) {
  const boardRef = useRef<HTMLDivElement>(null);

  // Build 11x11 grid
  const topRow = Array.from({ length: 11 }, (_, i) => 20 + i); // 20-30
  const bottomRow = Array.from({ length: 11 }, (_, i) => 10 - i); // 10-0
  const leftCol = Array.from({ length: 9 }, (_, i) => 19 - i); // 19-11
  const rightCol = Array.from({ length: 9 }, (_, i) => 31 + i); // 31-39

  return (
    <div className="relative inline-block w-full max-w-full" ref={boardRef}>
      {/* Top row */}
      <div className="flex">
        {topRow.map(i => <SpaceCell key={i} index={i} board={board} />)}
      </div>
      {/* Middle rows */}
      <div className="flex">
        <div className="flex flex-col">
          {leftCol.map(i => <SpaceCell key={i} index={i} board={board} />)}
        </div>
        <div className="flex-1 flex items-center justify-center bg-surface/30 border border-border/30">
          <div className="text-center p-2 sm:p-4">
            <h2 className="text-sm sm:text-lg md:text-xl font-bold text-text-primary mb-0.5 sm:mb-1">Vancouver</h2>
            <p className="text-[10px] sm:text-xs text-text-secondary">Monopoly</p>
            <p className="text-[10px] sm:text-xs text-text-secondary mt-1 sm:mt-2">Turn {board.currentTurn}/60</p>
          </div>
        </div>
        <div className="flex flex-col">
          {rightCol.map(i => <SpaceCell key={i} index={i} board={board} />)}
        </div>
      </div>
      {/* Bottom row */}
      <div className="flex">
        {bottomRow.map(i => <SpaceCell key={i} index={i} board={board} />)}
      </div>

      {/* Animated player pieces */}
      <AnimatedPiece
        player={1}
        position={board.players[0].position}
        colorClass="bg-player1"
        lastMove={lastMove}
        boardRef={boardRef}
      />
      <AnimatedPiece
        player={2}
        position={board.players[1].position}
        colorClass="bg-player2"
        lastMove={lastMove}
        boardRef={boardRef}
      />
    </div>
  );
}

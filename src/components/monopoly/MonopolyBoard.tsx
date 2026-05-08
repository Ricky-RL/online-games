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
  brown: '#8B4513',
  'light-blue': '#87CEEB',
  pink: '#FF69B4',
  orange: '#FFA500',
  red: '#FF0000',
  yellow: '#FFD700',
  green: '#008000',
  'dark-blue': '#00008B',
};

function getBoardPosition(index: number): { row: number; col: number; side: 'bottom' | 'left' | 'top' | 'right' } {
  if (index <= 10) return { row: 10, col: 10 - index, side: 'bottom' };
  if (index <= 20) return { row: 10 - (index - 10), col: 0, side: 'left' };
  if (index <= 30) return { row: 0, col: index - 20, side: 'top' };
  return { row: index - 30, col: 10, side: 'right' };
}

function getSteppingPositions(from: number, roll: number): number[] {
  // Special card movements and teleports can look odd when stepped.
  // Use direct glide for these larger/non-standard moves.
  if (roll <= 0 || roll > 12) return [];

  const positions: number[] = [];
  for (let i = 1; i <= roll; i++) {
    positions.push((from + i) % 40);
  }
  return positions;
}

function getCompactTileLabel(name: string): string {
  const special: Record<string, string> = {
    'Community Chest': 'Chest',
    Chance: 'Chance',
    'Income Tax': 'Tax',
    'Luxury Tax': 'Tax',
    'Go to Jail': 'To Jail',
    'Jail / Just Visiting': 'Jail',
    'Free Parking': 'Free Park',
  };

  if (special[name]) return special[name];
  if (name.length <= 11) return name;

  const words = name.split(' ');
  if (words.length >= 2) return `${words[0]} ${words[1]}`;
  return `${name.slice(0, 10)}…`;
}

function AnimatedPiece({
  player,
  position,
  colorClass,
  lastMove,
  isActive,
  boardRef,
}: {
  player: 1 | 2;
  position: number;
  colorClass: string;
  lastMove: MonopolyLastMove | null;
  isActive: boolean;
  boardRef: React.RefObject<HTMLDivElement | null>;
}) {
  const controls = useAnimationControls();
  const isAnimating = useRef(false);
  const lastAnimatedKey = useRef<string | null>(null);
  const [animatedPosition, setAnimatedPosition] = useState<number>(position);
  const currentPosRef = useRef(position);

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
    if (lastMove && lastMove.player === player && !isAnimating.current) {
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
              scale: [1, 1.2, 1],
              transition: { duration: 0.18, ease: 'easeInOut' },
            });
          }
          setAnimatedPosition(pos);
        }

        const finalPos = lastMove.to;
        const lastStepped = steppingPositions[steppingPositions.length - 1];
        if (finalPos !== lastStepped) {
          await new Promise((resolve) => setTimeout(resolve, 120));
          const pp = getPixelPosition(finalPos);
          if (pp) {
            await controls.start({
              x: pp.x,
              y: pp.y,
              scale: [1, 1.25, 1],
              transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] },
            });
          }
          setAnimatedPosition(finalPos);
        }

        currentPosRef.current = finalPos;
        isAnimating.current = false;
      })();

      return;
    }

    if (!isAnimating.current && position !== currentPosRef.current) {
      currentPosRef.current = position;
      setAnimatedPosition(position);
      const pp = getPixelPosition(position);
      if (pp) {
        controls.start({ x: pp.x, y: pp.y, transition: { duration: 0 } });
      }
    }
  }, [lastMove, position, player, controls, getPixelPosition]);

  useEffect(() => {
    const computePos = () => {
      const pp = getPixelPosition(animatedPosition);
      if (pp) {
        controls.start({ x: pp.x, y: pp.y, transition: { duration: 0 } });
      }
    };
    const raf = requestAnimationFrame(computePos);
    window.addEventListener('resize', computePos);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', computePos);
    };
  }, [animatedPosition, controls, getPixelPosition]);

  const offsetX = player === 1 ? -4 : 4;
  const offsetY = player === 1 ? -4 : 4;
  const activeClass = isActive ? 'ring-2 ring-white/90 shadow-[0_0_0_3px_rgba(255,255,255,0.25)]' : '';

  return (
    <motion.div
      className={`absolute rounded-full border-2 border-white shadow-lg flex items-center justify-center text-[7px] font-bold text-white ${colorClass} ${activeClass}`}
      style={{
        width: 14,
        height: 14,
        marginLeft: -7 + offsetX,
        marginTop: -7 + offsetY,
        zIndex: isActive ? 30 : 20,
        pointerEvents: 'none',
      }}
      animate={controls}
      initial={false}
    >
      {player}
    </motion.div>
  );
}

function SpaceCell({
  index,
  board,
  activePlayer,
}: {
  index: number;
  board: BoardState;
  activePlayer: 1 | 2;
}) {
  const space = BOARD[index];
  const pos = getBoardPosition(index);
  const isCorner = (pos.col === 0 && pos.row === 0) || (pos.col === 10 && pos.row === 0) ||
                   (pos.col === 0 && pos.row === 10) || (pos.col === 10 && pos.row === 10);
  const playersHere = board.players
    .map((state, idx) => ({ player: (idx + 1) as 1 | 2, position: state.position }))
    .filter((entry) => entry.position === index)
    .map((entry) => entry.player);
  const hasActivePlayer = playersHere.includes(activePlayer);

  const sizeClasses = isCorner
    ? 'w-[32px] h-[32px] sm:w-11 sm:h-11 md:w-14 md:h-14 lg:w-16 lg:h-16'
    : 'w-[25px] h-[25px] sm:w-8 sm:h-11 md:w-9 md:h-14 lg:w-10 lg:h-16';
  const highlightClass = hasActivePlayer
    ? activePlayer === 1
      ? 'border-player1/70 bg-player1/10'
      : 'border-player2/70 bg-player2/15'
    : 'border-border/60';

  return (
    <div
      data-space-index={index}
      className={`relative border flex flex-col items-center justify-center overflow-hidden ${sizeClasses} ${highlightClass}`}
      title={space.name}
    >
      {space.color && (
        <div
          className="absolute top-0 left-0 right-0 h-1 sm:h-1.5 md:h-2"
          style={{ backgroundColor: COLOR_MAP[space.color] ?? '#ccc' }}
        />
      )}
      <span className="text-[5px] sm:text-[7px] md:text-[8px] text-text-secondary text-center leading-[1.05] px-0.5 mt-0.5 sm:mt-1 max-w-full whitespace-normal break-words">
        {getCompactTileLabel(space.name)}
      </span>
      {space.price && (
        <span className="hidden sm:inline text-[6px] md:text-[7px] text-text-secondary/80 mt-0.5">
          ${space.price}
        </span>
      )}
      {board.properties[index] && (
        <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full absolute bottom-0.5 left-0.5 sm:bottom-1 sm:left-1 ${board.properties[index].owner === 1 ? 'bg-player1' : 'bg-player2'}`} />
      )}
      {playersHere.length > 0 && (
        <div className="absolute bottom-0.5 right-0.5 sm:bottom-1 sm:right-1 flex items-center gap-0.5">
          {playersHere.map((playerToken) => (
            <div
              key={`${index}-p-${playerToken}`}
              className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full border border-white ${playerToken === 1 ? 'bg-player1' : 'bg-player2'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function MonopolyBoardView({ board, lastMove }: MonopolyBoardProps) {
  const boardRef = useRef<HTMLDivElement>(null);

  const topRow = Array.from({ length: 11 }, (_, i) => 20 + i);
  const bottomRow = Array.from({ length: 11 }, (_, i) => 10 - i);
  const leftCol = Array.from({ length: 9 }, (_, i) => 19 - i);
  const rightCol = Array.from({ length: 9 }, (_, i) => 31 + i);

  return (
    <div className="w-full flex justify-center overflow-hidden">
      <div
        className="relative inline-block w-full max-w-fit origin-center"
        ref={boardRef}
      >
        <div className="flex">
          {topRow.map(i => <SpaceCell key={i} index={i} board={board} activePlayer={board.activePlayer} />)}
        </div>

        <div className="flex">
          <div className="flex flex-col">
            {leftCol.map(i => <SpaceCell key={i} index={i} board={board} activePlayer={board.activePlayer} />)}
          </div>
          <div className="flex-1 flex items-center justify-center bg-surface/40 border border-border/40">
            <div className="text-center p-2 sm:p-4">
              <h2 className="text-sm sm:text-lg md:text-xl font-bold text-text-primary mb-0.5 sm:mb-1">Vancouver</h2>
              <p className="text-[10px] sm:text-xs text-text-secondary">Monopoly</p>
              <p className="text-[10px] sm:text-xs text-text-secondary mt-1 sm:mt-2">Turn {board.currentTurn}/60</p>
            </div>
          </div>
          <div className="flex flex-col">
            {rightCol.map(i => <SpaceCell key={i} index={i} board={board} activePlayer={board.activePlayer} />)}
          </div>
        </div>

        <div className="flex">
          {bottomRow.map(i => <SpaceCell key={i} index={i} board={board} activePlayer={board.activePlayer} />)}
        </div>

        <AnimatedPiece
          player={1}
          position={board.players[0].position}
          colorClass="bg-player1"
          lastMove={lastMove}
          isActive={board.activePlayer === 1}
          boardRef={boardRef}
        />
        <AnimatedPiece
          player={2}
          position={board.players[1].position}
          colorClass="bg-player2"
          lastMove={lastMove}
          isActive={board.activePlayer === 2}
          boardRef={boardRef}
        />
      </div>
    </div>
  );
}

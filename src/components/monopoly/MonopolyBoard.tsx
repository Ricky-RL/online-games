'use client';

import { MonopolyBoard as BoardState } from '@/lib/monopoly/types';
import { BOARD } from '@/lib/monopoly/board-data';

interface MonopolyBoardProps {
  board: BoardState;
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

function SpaceCell({ index, board }: { index: number; board: BoardState }) {
  const space = BOARD[index];
  const pos = getBoardPosition(index);
  const isCorner = (pos.col === 0 && pos.row === 0) || (pos.col === 10 && pos.row === 0) ||
                   (pos.col === 0 && pos.row === 10) || (pos.col === 10 && pos.row === 10);

  const p1Here = board.players[0].position === index;
  const p2Here = board.players[1].position === index;

  // Responsive sizing: corners are square, sides vary by orientation
  const sizeClasses = isCorner
    ? 'w-[28px] h-[28px] sm:w-10 sm:h-10 md:w-14 md:h-14 lg:w-16 lg:h-16'
    : pos.side === 'top' || pos.side === 'bottom'
      ? 'w-[22px] h-[28px] sm:w-7 sm:h-10 md:w-9 md:h-14 lg:w-10 lg:h-16'
      : 'w-[28px] h-[22px] sm:w-10 sm:h-7 md:w-14 md:h-9 lg:w-16 lg:h-10';

  return (
    <div
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
      <div className="absolute bottom-0.5 right-0.5 sm:bottom-1 sm:right-1 flex gap-0.5">
        {p1Here && <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 md:w-2.5 md:h-2.5 rounded-full bg-player1 border border-white" />}
        {p2Here && <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 md:w-2.5 md:h-2.5 rounded-full bg-player2 border border-white" />}
      </div>
    </div>
  );
}

export function MonopolyBoardView({ board }: MonopolyBoardProps) {
  // Build 11x11 grid
  const topRow = Array.from({ length: 11 }, (_, i) => 20 + i); // 20-30
  const bottomRow = Array.from({ length: 11 }, (_, i) => 10 - i); // 10-0
  const leftCol = Array.from({ length: 9 }, (_, i) => 19 - i); // 19-11
  const rightCol = Array.from({ length: 9 }, (_, i) => 31 + i); // 31-39

  return (
    <div className="inline-block w-full max-w-full">
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
    </div>
  );
}

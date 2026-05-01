'use client';

import { use, useState, useCallback, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSudokuGame } from '@/hooks/useSudokuGame';
import { useGameSounds } from '@/hooks/useSound';
import { Board } from '@/components/sudoku/Board';
import { NumberPad } from '@/components/sudoku/NumberPad';
import { EndGameDialog } from '@/components/EndGameDialog';
import { SettingsButton } from '@/components/SettingsButton';
import { checkWin, type SudokuBoardState } from '@/lib/sudoku-logic';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function getMyName(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('player-name') || localStorage.getItem('player-name');
}

export default function SudokuGamePage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = use(params);
  const { game, board, loading, error, deleted, placeNumber, clearCell, togglePencilMark, resetGame } = useSudokuGame(gameId);
  const { play } = useGameSounds();
  const router = useRouter();

  const [selectedCell, setSelectedCell] = useState<[number, number] | null>(null);
  const [isPencilMode, setIsPencilMode] = useState(false);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (deleted) router.push('/');
  }, [deleted, router]);

  useEffect(() => {
    if (!board?.startedAt || board.completedAt) return;
    const start = new Date(board.startedAt).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [board?.startedAt, board?.completedAt]);

  const isWon = useMemo(() => {
    if (!board) return false;
    return checkWin(board);
  }, [board]);

  const handleCellSelect = useCallback((row: number, col: number) => {
    setSelectedCell([row, col]);
  }, []);

  const handleNumber = useCallback(
    (n: number) => {
      if (!selectedCell || !board) return;
      const [row, col] = selectedCell;
      if (board.grid[row][col].isGiven) return;

      if (isPencilMode) {
        togglePencilMark(row, col, n);
      } else {
        placeNumber(row, col, n);
        play('drop');
      }
    },
    [selectedCell, board, isPencilMode, placeNumber, togglePencilMark, play]
  );

  const handleErase = useCallback(() => {
    if (!selectedCell || !board) return;
    const [row, col] = selectedCell;
    if (board.grid[row][col].isGiven) return;
    clearCell(row, col);
  }, [selectedCell, board, clearCell]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!selectedCell) return;

      const [row, col] = selectedCell;

      if (e.key >= '1' && e.key <= '9') {
        handleNumber(parseInt(e.key));
        return;
      }

      if (e.key === 'Backspace' || e.key === 'Delete') {
        handleErase();
        return;
      }

      if (e.key === 'p' || e.key === 'P') {
        setIsPencilMode((prev) => !prev);
        return;
      }

      if (e.key === 'ArrowUp' && row > 0) setSelectedCell([row - 1, col]);
      if (e.key === 'ArrowDown' && row < 8) setSelectedCell([row + 1, col]);
      if (e.key === 'ArrowLeft' && col > 0) setSelectedCell([row, col - 1]);
      if (e.key === 'ArrowRight' && col < 8) setSelectedCell([row, col + 1]);
    },
    [selectedCell, handleNumber, handleErase]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleEndGame = useCallback(async () => {
    await resetGame();
    router.push('/');
  }, [resetGame, router]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-text-secondary text-sm">Loading game...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-player1 text-sm">Error: {error}</div>
      </div>
    );
  }

  if (!game || !board) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-text-secondary text-sm">Game not found</div>
      </div>
    );
  }

  if (isWon) {
    return (
      <>
        <div className="flex-1 flex flex-col items-center justify-center gap-6 p-4">
          <div className="text-center space-y-3">
            <p className="text-3xl font-bold text-green-400">Puzzle Solved!</p>
            <p className="text-text-secondary">
              {game.player1_name && game.player2_name
                ? `${game.player1_name} & ${game.player2_name} solved it together`
                : 'Solved cooperatively'}
            </p>
            <div className="flex items-center justify-center gap-4 text-sm text-text-secondary">
              <span>Time: {formatTime(elapsed)}</span>
              <span>Moves: {board.moveCount}</span>
              <span className="capitalize">{board.difficulty}</span>
            </div>
          </div>
          <div className="opacity-70 pointer-events-none">
            <Board grid={board.grid} selectedCell={null} onCellSelect={() => {}} />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/')}
              className="px-6 py-3 text-base font-medium rounded-xl border border-border bg-surface text-text-secondary hover:text-text-primary hover:border-text-secondary/30 shadow-sm hover:shadow transition-all cursor-pointer"
            >
              Home
            </button>
            <button
              onClick={() => setShowEndDialog(true)}
              className="px-6 py-3 text-base font-medium rounded-xl border border-player1/20 bg-player1/5 text-player1/80 hover:bg-player1/10 hover:border-player1/40 hover:text-player1 shadow-sm hover:shadow transition-all cursor-pointer"
            >
              End Game
            </button>
          </div>
        </div>
        <EndGameDialog
          open={showEndDialog}
          onConfirm={handleEndGame}
          onCancel={() => setShowEndDialog(false)}
        />
      </>
    );
  }

  return (
    <>
      <div className="flex-1 flex flex-col items-center gap-4 p-4 pt-6 max-w-lg mx-auto w-full">
        {/* Header */}
        <div className="w-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium uppercase tracking-wider text-text-secondary/70 px-2 py-1 rounded-lg bg-surface border border-border capitalize">
              {board.difficulty}
            </span>
            <span className="text-sm font-mono text-text-secondary">
              {formatTime(elapsed)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {!game.player2_name && (
              <span className="text-xs text-text-secondary/60 px-2 py-1 rounded-lg bg-surface border border-border">
                Waiting for partner...
              </span>
            )}
            <SettingsButton />
          </div>
        </div>

        {/* Board */}
        <Board grid={board.grid} selectedCell={selectedCell} onCellSelect={handleCellSelect} />

        {/* Number Pad */}
        <NumberPad
          grid={board.grid}
          onNumber={handleNumber}
          onErase={handleErase}
          isPencilMode={isPencilMode}
          onTogglePencilMode={() => setIsPencilMode((prev) => !prev)}
        />

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 text-sm font-medium rounded-xl border border-border bg-surface text-text-secondary hover:text-text-primary hover:border-text-secondary/30 shadow-sm hover:shadow transition-all cursor-pointer"
          >
            Home
          </button>
          <button
            onClick={() => setShowEndDialog(true)}
            className="px-4 py-2 text-sm font-medium rounded-xl border border-player1/20 bg-player1/5 text-player1/80 hover:bg-player1/10 hover:border-player1/40 hover:text-player1 shadow-sm hover:shadow transition-all cursor-pointer"
          >
            End Game
          </button>
        </div>
      </div>
      <EndGameDialog
        open={showEndDialog}
        onConfirm={handleEndGame}
        onCancel={() => setShowEndDialog(false)}
      />
    </>
  );
}

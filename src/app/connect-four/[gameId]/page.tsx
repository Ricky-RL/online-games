'use client';

import { use, useMemo, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGame } from '@/hooks/useGame';
import { useGameSounds } from '@/hooks/useSound';
import { getGameStatus } from '@/lib/game-logic';
import { checkWin } from '@/lib/game-logic';
import { GameBoard } from '@/components/Board';
import { TurnIndicator } from '@/components/TurnIndicator';
import { WinCelebration } from '@/components/WinCelebration';
import type { Player } from '@/lib/types';

function getMyName(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('player-name') || localStorage.getItem('player-name');
}

export default function GamePage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = use(params);
  const { game, loading, error, lastMove, deleted, makeMove, resetGame } = useGame(gameId);
  const { play } = useGameSounds();
  const router = useRouter();
  const prevStatus = useRef<string | null>(null);
  const [myName, setMyName] = useState<string | null>(null);

  useEffect(() => {
    setMyName(getMyName());
  }, []);

  useEffect(() => {
    if (deleted) router.push('/');
  }, [deleted, router]);

  const gameStatus = useMemo(() => {
    if (!game) return null;
    return getGameStatus(game);
  }, [game]);

  useEffect(() => {
    if (gameStatus === 'won' && prevStatus.current === 'playing') {
      play('win');
    }
    prevStatus.current = gameStatus;
  }, [gameStatus, play]);

  const myPlayerNumber: Player | null = useMemo(() => {
    if (!game || !myName) return null;
    if (game.player1_name === myName) return 1;
    if (game.player2_name === myName) return 2;
    return null;
  }, [game, myName]);

  const isMyTurn = useMemo(() => {
    if (!game || !myPlayerNumber) return false;
    return game.current_turn === myPlayerNumber;
  }, [game, myPlayerNumber]);

  const winningCells = useMemo((): [number, number][] | null => {
    if (!game || !game.winner) return null;
    for (let col = 0; col < 7; col++) {
      for (let row = 0; row < game.board[col].length; row++) {
        if (game.board[col][row] === game.winner) {
          const result = checkWin(game.board, col, row, game.winner);
          if (result) return result;
        }
      }
    }
    return null;
  }, [game]);

  const opponentName = useMemo(() => {
    if (!game || !myPlayerNumber) return null;
    return myPlayerNumber === 1 ? game.player2_name : game.player1_name;
  }, [game, myPlayerNumber]);

  const handleMakeMove = useCallback(
    async (column: number) => {
      play('drop');
      await makeMove(column);
    },
    [makeMove, play]
  );

  const handleReset = useCallback(async () => {
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

  if (!game) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-text-secondary text-sm">Game not found</div>
      </div>
    );
  }

  if (gameStatus === 'won' && game.winner) {
    const winnerName = game.winner === 1 ? game.player1_name : game.player2_name;
    const isMe = game.winner === myPlayerNumber;
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-8 p-8">
        <WinCelebration
          winner={game.winner}
          winnerName={winnerName}
          isMe={isMe}
          onPlayAgain={handleReset}
        />
        <GameBoard
          board={game.board}
          currentPlayer={game.current_turn}
          onColumnClick={() => {}}
          disabled={true}
          winningCells={winningCells}
        />
      </div>
    );
  }

  if (gameStatus === 'draw') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 p-4">
        <div className="text-center">
          <p className="text-2xl font-semibold text-text-secondary mb-2">
            It&apos;s a draw!
          </p>
          <p className="text-sm text-text-secondary">Good game, both of you.</p>
        </div>
        <div className="opacity-60">
          <GameBoard
            board={game.board}
            currentPlayer={game.current_turn}
            onColumnClick={() => {}}
            disabled={true}
          />
        </div>
        <button
          onClick={handleReset}
          className="px-6 py-3 text-base font-medium rounded-xl bg-board text-white hover:bg-board-surface transition-colors cursor-pointer"
        >
          Play Again
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 p-4">
      <TurnIndicator
        currentPlayer={game.current_turn}
        isMyTurn={isMyTurn}
        playerName={opponentName}
      />

      <GameBoard
        board={game.board}
        currentPlayer={game.current_turn}
        onColumnClick={handleMakeMove}
        disabled={!isMyTurn || (gameStatus !== 'playing' && gameStatus !== 'waiting')}
        winningCells={winningCells}
        lastMove={lastMove}
      />

      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/')}
          className="px-4 py-2 text-sm font-medium rounded-xl border border-border bg-surface text-text-secondary hover:text-text-primary hover:border-text-secondary/30 shadow-sm hover:shadow transition-all cursor-pointer"
        >
          Home
        </button>
        <button
          onClick={handleReset}
          className="px-4 py-2 text-sm font-medium rounded-xl border border-player1/20 bg-player1/5 text-player1/80 hover:bg-player1/10 hover:border-player1/40 hover:text-player1 shadow-sm hover:shadow transition-all cursor-pointer"
        >
          Reset Game
        </button>
      </div>
    </div>
  );
}

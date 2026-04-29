'use client';

import { use, useMemo, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useGame } from '@/hooks/useGame';
import { useGameSounds } from '@/hooks/useSound';
import { getPlayerId } from '@/lib/player-id';
import { getGameStatus } from '@/lib/game-logic';
import { checkWin } from '@/lib/game-logic';
import { GameBoard } from '@/components/Board';
import { TurnIndicator } from '@/components/TurnIndicator';
import { WaitingForOpponent } from '@/components/WaitingForOpponent';
import { WinCelebration } from '@/components/WinCelebration';
import { GameFullMessage } from '@/components/GameFullMessage';
import type { Player } from '@/lib/types';

export default function GamePage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = use(params);
  const { game, loading, error, lastMove, makeMove, joinGame } = useGame(gameId);
  const { play } = useGameSounds();
  const router = useRouter();
  const prevStatus = useRef<string | null>(null);

  const playerId = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return getPlayerId();
  }, []);

  const gameStatus = useMemo(() => {
    if (!game) return null;
    return getGameStatus(game);
  }, [game]);

  // Play win sound when game transitions to won
  useEffect(() => {
    if (gameStatus === 'won' && prevStatus.current === 'playing') {
      play('win');
    }
    prevStatus.current = gameStatus;
  }, [gameStatus, play]);

  const myPlayerNumber: Player | null = useMemo(() => {
    if (!game) return null;
    if (game.player1_id === playerId) return 1;
    if (game.player2_id === playerId) return 2;
    return null;
  }, [game, playerId]);

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

  const handlePlayAgain = useCallback(() => {
    router.push('/');
  }, [router]);

  const handleJoinGame = useCallback(async () => {
    await joinGame('Player 2');
  }, [joinGame]);

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

  const isSpectator = myPlayerNumber === null && game.player2_id !== null;
  if (isSpectator) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <GameFullMessage />
      </div>
    );
  }

  const canJoin = myPlayerNumber === null && game.player2_id === null;
  if (canJoin) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
        <h2 className="text-xl font-semibold text-text-primary">
          Join this game?
        </h2>
        <button
          onClick={handleJoinGame}
          className="px-6 py-3 text-base font-medium rounded-xl bg-board text-white hover:bg-board-surface transition-colors cursor-pointer"
        >
          Join as Player 2
        </button>
      </div>
    );
  }

  if (gameStatus === 'waiting') {
    const gameUrl = typeof window !== 'undefined' ? window.location.href : '';
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <WaitingForOpponent gameUrl={gameUrl} />
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
          onPlayAgain={handlePlayAgain}
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
          onClick={handlePlayAgain}
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
        disabled={!isMyTurn || gameStatus !== 'playing'}
        winningCells={winningCells}
        lastMove={lastMove}
      />
    </div>
  );
}

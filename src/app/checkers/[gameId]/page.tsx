'use client';

import { use, useMemo, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCheckersGame, type CheckersGame } from '@/hooks/useCheckersGame';
import { useGameSounds } from '@/hooks/useSound';
import { getValidMoves, getMovablePieces, getCheckersGameStatus } from '@/lib/checkers-logic';
import { CheckersBoard } from '@/components/checkers/Board';
import { TurnIndicator } from '@/components/TurnIndicator';
import { WinCelebration } from '@/components/WinCelebration';
import { EndGameDialog } from '@/components/EndGameDialog';
import type { Player, CheckersMove } from '@/lib/types';

function getMyName(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('player-name') || localStorage.getItem('player-name');
}

export default function CheckersGamePage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = use(params);
  const { game, loading, error, lastMove, opponentLastMove, deleted, makeMove, resetGame } = useCheckersGame(gameId);
  const { play } = useGameSounds();
  const router = useRouter();
  const prevStatus = useRef<string | null>(null);
  const [myName, setMyName] = useState<string | null>(null);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [selectedPiece, setSelectedPiece] = useState<[number, number] | null>(null);
  const [showingReplay, setShowingReplay] = useState(false);
  const replayTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setMyName(getMyName()); }, []);
  useEffect(() => { if (deleted) router.push('/'); }, [deleted, router]);
  useEffect(() => { return () => { if (replayTimeout.current) clearTimeout(replayTimeout.current); }; }, []);

  const handleShowLastMove = useCallback(() => {
    if (!opponentLastMove) return;
    setShowingReplay(true);
    if (replayTimeout.current) clearTimeout(replayTimeout.current);
    replayTimeout.current = setTimeout(() => setShowingReplay(false), 3000);
  }, [opponentLastMove]);

  const gameStatus = useMemo(() => {
    if (!game) return null;
    return getCheckersGameStatus(game as unknown as { winner: number | null; player1_name: string | null; player2_name: string | null; board: CheckersGame['board'] });
  }, [game]);

  useEffect(() => {
    if (gameStatus === 'won' && prevStatus.current === 'playing') play('win');
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

  const opponentName = useMemo(() => {
    if (!game || !myPlayerNumber) return null;
    return myPlayerNumber === 1 ? game.player2_name : game.player1_name;
  }, [game, myPlayerNumber]);

  const movablePieces = useMemo(() => {
    if (!game || !myPlayerNumber || !isMyTurn) return [];
    return getMovablePieces(game.board, myPlayerNumber);
  }, [game, myPlayerNumber, isMyTurn]);

  const validMoves = useMemo((): CheckersMove[] => {
    if (!game || !selectedPiece) return [];
    return getValidMoves(game.board, selectedPiece[0], selectedPiece[1]);
  }, [game, selectedPiece]);

  // Auto-select continuing piece on page load or after opponent move
  useEffect(() => {
    if (!game || !isMyTurn) return;
    const cp = game.board.settings.continuingPiece;
    if (cp) {
      setSelectedPiece(cp);
    }
  }, [game, isMyTurn]);

  const handleSquareClick = useCallback(
    async (row: number, col: number) => {
      if (!game || !myPlayerNumber || !isMyTurn) return;

      const clickedPiece = game.board.cells[row][col];

      // If clicking a valid destination, make the move
      if (selectedPiece) {
        const move = validMoves.find(m => m.to[0] === row && m.to[1] === col);
        if (move) {
          play('drop');
          setSelectedPiece(null);
          await makeMove(move);
          return;
        }
      }

      // Mid-multi-jump: cannot deselect or switch
      if (game.board.settings.continuingPiece) return;

      // Clicking own piece: select/switch/deselect
      if (clickedPiece && clickedPiece.player === myPlayerNumber) {
        if (selectedPiece && selectedPiece[0] === row && selectedPiece[1] === col) {
          setSelectedPiece(null);
        } else if (movablePieces.some(([r, c]) => r === row && c === col)) {
          setSelectedPiece([row, col]);
        }
        return;
      }

      // Clicking empty/opponent square without valid move: deselect
      setSelectedPiece(null);
    },
    [game, myPlayerNumber, isMyTurn, selectedPiece, validMoves, movablePieces, makeMove, play]
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

  if (error && !game) {
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
          onHome={handleReset}
        />
        <CheckersBoard
          state={game.board}
          myPlayer={myPlayerNumber}
          isMyTurn={false}
          selectedPiece={null}
          validMoves={[]}
          movablePieces={[]}
          onSquareClick={() => {}}
          lastMove={lastMove}
          replayMove={null}
          disabled={true}
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
          <p className="text-sm text-text-secondary">40 moves without a capture. Good game!</p>
        </div>
        <div className="opacity-60">
          <CheckersBoard
            state={game.board}
            myPlayer={myPlayerNumber}
            isMyTurn={false}
            selectedPiece={null}
            validMoves={[]}
            movablePieces={[]}
            onSquareClick={() => {}}
            lastMove={null}
            replayMove={null}
            disabled={true}
          />
        </div>
        <button
          onClick={handleReset}
          className="px-6 py-3 text-base font-medium rounded-xl bg-board text-white hover:bg-board-surface transition-colors cursor-pointer"
        >
          Home
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 flex flex-col items-center justify-center gap-6 p-4">
        <div className="flex flex-col items-center gap-2">
          <TurnIndicator
            currentPlayer={game.current_turn}
            isMyTurn={isMyTurn}
            playerName={opponentName}
          />
        </div>

        {gameStatus === 'waiting' && (
          <p className="text-sm text-text-secondary">Opponent can join anytime</p>
        )}

        <CheckersBoard
          state={game.board}
          myPlayer={myPlayerNumber}
          isMyTurn={isMyTurn}
          selectedPiece={selectedPiece}
          validMoves={validMoves}
          movablePieces={movablePieces}
          onSquareClick={handleSquareClick}
          lastMove={lastMove}
          replayMove={showingReplay ? opponentLastMove : null}
          disabled={!isMyTurn || (gameStatus !== 'playing' && gameStatus !== 'waiting')}
        />

        <div className="flex items-center gap-3">
          {opponentLastMove && (
            <button
              onClick={handleShowLastMove}
              className={`px-4 py-2 text-sm font-medium rounded-xl border shadow-sm transition-all cursor-pointer ${
                showingReplay
                  ? 'border-blue-400/50 bg-blue-500/10 text-blue-400'
                  : 'border-border bg-surface text-text-secondary hover:text-text-primary hover:border-text-secondary/30 hover:shadow'
              }`}
            >
              Show Last Move
            </button>
          )}
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
        onConfirm={handleReset}
        onCancel={() => setShowEndDialog(false)}
      />
    </>
  );
}

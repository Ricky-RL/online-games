'use client';

import { use, useMemo, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useJengaGame, type JengaGame } from '@/hooks/useJengaGame';
import { useGameSounds } from '@/hooks/useSound';
import { getJengaGameStatus, calculateBlockRisk } from '@/lib/jenga-logic';
import { JengaTower } from '@/components/jenga/JengaTower';
import { JengaWobbleMeter } from '@/components/jenga/JengaWobbleMeter';
import { TurnIndicator } from '@/components/TurnIndicator';
import { WinCelebration } from '@/components/WinCelebration';
import { EndGameDialog } from '@/components/EndGameDialog';
import type { Player } from '@/lib/types';

function getMyName(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('player-name') || localStorage.getItem('player-name');
}

export default function JengaGamePage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = use(params);
  const { game, loading, error, deleted, pullBlockAction, resetGame } = useJengaGame(gameId);
  const { play } = useGameSounds();
  const router = useRouter();
  const prevStatus = useRef<string | null>(null);
  const [myName, setMyName] = useState<string | null>(null);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState<[number, number] | null>(null);

  useEffect(() => { setMyName(getMyName()); }, []);
  useEffect(() => { if (deleted) router.push('/'); }, [deleted, router]);

  const gameStatus = useMemo(() => {
    if (!game) return null;
    return getJengaGameStatus(game);
  }, [game]);

  useEffect(() => {
    if (gameStatus === 'won' && prevStatus.current !== 'won') play('win');
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

  const selectedRisk = useMemo(() => {
    if (!game || !selectedBlock) return null;
    return calculateBlockRisk(game.board, selectedBlock[0], selectedBlock[1]);
  }, [game, selectedBlock]);

  const handleBlockClick = useCallback((row: number, col: number) => {
    if (selectedBlock && selectedBlock[0] === row && selectedBlock[1] === col) {
      setSelectedBlock(null);
    } else {
      setSelectedBlock([row, col]);
    }
  }, [selectedBlock]);

  const handleConfirmPull = useCallback(async () => {
    if (!selectedBlock) return;
    play('drop');
    const [row, col] = selectedBlock;
    setSelectedBlock(null);
    await pullBlockAction(row, col);
  }, [selectedBlock, pullBlockAction, play]);

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
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-4">
        <div className="flex flex-col items-center gap-2">
          <TurnIndicator
            currentPlayer={game.current_turn}
            isMyTurn={isMyTurn}
            playerName={opponentName}
          />
          <JengaWobbleMeter wobble={game.board.wobble_score} />
        </div>

        {gameStatus === 'waiting' && (
          <p className="text-sm text-text-secondary">Opponent can join anytime</p>
        )}

        <JengaTower
          state={game.board}
          isMyTurn={isMyTurn}
          selectedBlock={selectedBlock}
          onBlockClick={handleBlockClick}
          disabled={!isMyTurn || gameStatus === 'won'}
        />

        {/* Pull confirmation */}
        {selectedBlock && isMyTurn && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-text-secondary">
              Risk: <strong className="text-text-primary">{selectedRisk}%</strong>
            </span>
            <button
              onClick={handleConfirmPull}
              className="px-5 py-2 text-sm font-semibold rounded-xl bg-amber-600 text-white hover:bg-amber-700 transition-colors shadow-md cursor-pointer"
            >
              Pull Block
            </button>
            <button
              onClick={() => setSelectedBlock(null)}
              className="px-4 py-2 text-sm font-medium rounded-xl border border-border bg-surface text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        )}

        <div className="flex items-center gap-3">
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

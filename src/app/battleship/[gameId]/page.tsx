'use client';

import { use, useCallback, useMemo, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useBattleshipGame } from '@/hooks/useBattleshipGame';
import { buildShipGrid, getSunkShips } from '@/lib/battleship-logic';
import { PlayerBoard } from '@/components/battleship/PlayerBoard';
import { TrackingBoard } from '@/components/battleship/TrackingBoard';
import { ShipOverlay as ShipStatus } from '@/components/battleship/ShipOverlay';
import { TurnIndicator } from '@/components/TurnIndicator';
import { WinCelebration } from '@/components/WinCelebration';
import { EndGameDialog } from '@/components/EndGameDialog';
import { NotificationControls } from '@/components/NotificationControls';
import { useNotifications } from '@/hooks/useNotifications';
import type { ShipId, Player } from '@/lib/types';

function getMyName(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('player-name') || localStorage.getItem('player-name');
}

export default function BattleshipGamePage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = use(params);
  const router = useRouter();
  const { game, loading, error, lastAttack, deleted, makeAttack, resetGame } = useBattleshipGame(gameId);
  const [myName] = useState<string | null>(() => getMyName());
  const [showEndDialog, setShowEndDialog] = useState(false);

  useEffect(() => {
    if (deleted) router.push('/');
  }, [deleted, router]);

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

  const myShips = useMemo(() => {
    if (!game || !myPlayerNumber) return [];
    return myPlayerNumber === 1 ? game.board.player1Ships : game.board.player2Ships;
  }, [game, myPlayerNumber]);

  const opponentShips = useMemo(() => {
    if (!game || !myPlayerNumber) return [];
    return myPlayerNumber === 1 ? game.board.player2Ships : game.board.player1Ships;
  }, [game, myPlayerNumber]);

  const myShipGrid = useMemo(() => buildShipGrid(myShips), [myShips]);

  const myAttacks = useMemo(() => {
    if (!game || !myPlayerNumber) return [];
    return myPlayerNumber === 1 ? game.board.player1Attacks : game.board.player2Attacks;
  }, [game, myPlayerNumber]);

  const opponentAttacks = useMemo(() => {
    if (!game || !myPlayerNumber) return [];
    return myPlayerNumber === 1 ? game.board.player2Attacks : game.board.player1Attacks;
  }, [game, myPlayerNumber]);

  const mySunkShips = useMemo(() => getSunkShips(myShips, opponentAttacks), [myShips, opponentAttacks]);
  const opponentSunkShips = useMemo(() => getSunkShips(opponentShips, myAttacks), [opponentShips, myAttacks]);

  const mySunkShipIds: ShipId[] = useMemo(() => mySunkShips.map((s) => s.shipId), [mySunkShips]);
  const opponentSunkShipIds: ShipId[] = useMemo(() => opponentSunkShips.map((s) => s.shipId), [opponentSunkShips]);

  const winnerName = useMemo(() => {
    if (!game || !game.winner) return null;
    return game.winner === 1 ? game.player1_name : game.player2_name;
  }, [game]);

  const { permissionState, requestPermission, isMuted, toggleMute } = useNotifications({
    gameId,
    isMyTurn,
    opponentName,
    gameType: 'battleship',
  });

  const handleAttack = useCallback(async (row: number, col: number) => {
    await makeAttack(row, col);
  }, [makeAttack]);

  const handleReset = useCallback(async () => {
    await resetGame();
    router.push('/');
  }, [resetGame, router]);

  const handleEndGameClick = useCallback(() => {
    setShowEndDialog(true);
  }, []);

  const handleEndGameCancel = useCallback(() => {
    setShowEndDialog(false);
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <div className="text-text-secondary text-sm">Loading game...</div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <div className="text-text-secondary text-sm">Game not found</div>
      </div>
    );
  }

  return (
    <>
      <motion.div
        className="flex-1 flex flex-col items-center justify-center min-h-screen p-4 gap-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center gap-4">
          {!game.winner && (
            <TurnIndicator
              currentPlayer={game.current_turn}
              isMyTurn={isMyTurn}
              playerName={opponentName}
            />
          )}
          <NotificationControls
            permissionState={permissionState}
            requestPermission={requestPermission}
            isMuted={isMuted}
            toggleMute={toggleMute}
          />
        </div>

        <div className="flex flex-col lg:flex-row items-center lg:items-start gap-6 w-full max-w-4xl justify-center">
          <motion.div
            className="flex flex-col items-center gap-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <TrackingBoard
              myAttacks={myAttacks}
              sunkShips={opponentSunkShips}
              onCellClick={handleAttack}
              disabled={!isMyTurn || !!game.winner}
              lastAttack={lastAttack && myAttacks.includes(lastAttack) ? lastAttack : null}
            />
            <ShipStatus sunkShipIds={opponentSunkShipIds} label="Enemy Fleet" />
          </motion.div>

          <motion.div
            className="flex flex-col items-center gap-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <PlayerBoard
              shipGrid={myShipGrid}
              opponentAttacks={opponentAttacks}
              lastAttack={lastAttack && opponentAttacks.includes(lastAttack) ? lastAttack : null}
            />
            <ShipStatus sunkShipIds={mySunkShipIds} label="Your Fleet" />
          </motion.div>
        </div>

        {game.winner && (
          <WinCelebration
            winner={game.winner}
            winnerName={winnerName}
            isMe={game.winner === myPlayerNumber}
            onPlayAgain={handleReset}
            onHome={() => router.push('/')}
          />
        )}

        {error && (
          <motion.p className="text-red-400 text-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {error}
          </motion.p>
        )}

        <nav className="flex items-center gap-3 mt-4">
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 text-sm font-medium rounded-xl border border-border bg-surface text-text-secondary hover:text-text-primary hover:border-text-secondary/30 shadow-sm hover:shadow transition-all cursor-pointer"
          >
            Home
          </button>
          <button
            onClick={handleEndGameClick}
            className="px-4 py-2 text-sm font-medium rounded-xl border border-player1/20 bg-player1/5 text-player1/80 hover:bg-player1/10 hover:border-player1/40 hover:text-player1 shadow-sm hover:shadow transition-all cursor-pointer"
          >
            End Game
          </button>
        </nav>
      </motion.div>

      <EndGameDialog
        open={showEndDialog}
        onConfirm={handleReset}
        onCancel={handleEndGameCancel}
      />
    </>
  );
}

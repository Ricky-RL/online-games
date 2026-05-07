'use client';

import { use, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SettingsButton } from '@/components/SettingsButton';
import { TurnIndicator } from '@/components/TurnIndicator';
import { WinCelebration } from '@/components/WinCelebration';
import { EndGameDialog } from '@/components/EndGameDialog';
import { NotificationControls } from '@/components/NotificationControls';
import { UnoHand } from '@/components/uno/UnoHand';
import { UnoTable } from '@/components/uno/UnoTable';
import { useUnoGame } from '@/hooks/useUnoGame';
import { useGameSounds } from '@/hooks/useSound';
import { useNotifications } from '@/hooks/useNotifications';
import { getPlayableCards, getCardLabel, type UnoColor } from '@/lib/uno-logic';
import type { Player } from '@/lib/types';

function getMyName(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('player-name') || localStorage.getItem('player-name');
}

export default function UnoGamePage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = use(params);
  const router = useRouter();
  const { game, loading, error, deleted, playCard, drawCard, pass, resetGame, endGame } = useUnoGame(gameId);
  const { play } = useGameSounds();
  const [myName] = useState<string | null>(() => getMyName());
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [selectedWildColor, setSelectedWildColor] = useState<UnoColor>('red');
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

  const isMyTurn = !!game && !!myPlayerNumber && game.current_turn === myPlayerNumber && game.winner === null;
  const opponentName = useMemo(() => {
    if (!game || !myPlayerNumber) return null;
    return myPlayerNumber === 1 ? game.player2_name : game.player1_name;
  }, [game, myPlayerNumber]);

  const { permissionState, requestPermission, isMuted, toggleMute } = useNotifications({
    gameId,
    isMyTurn,
    opponentName,
    gameType: 'uno',
  });

  const myHand = useMemo(() => {
    if (!game || !myPlayerNumber) return [];
    return game.board.hands[myPlayerNumber === 1 ? '1' : '2'];
  }, [game, myPlayerNumber]);

  const opponentCardsLeft = useMemo(() => {
    if (!game || !myPlayerNumber) return 0;
    return game.board.hands[myPlayerNumber === 1 ? '2' : '1'].length;
  }, [game, myPlayerNumber]);

  const playableCards = useMemo(() => {
    if (!game || !myPlayerNumber) return [];
    return getPlayableCards(game.board, myPlayerNumber);
  }, [game, myPlayerNumber]);

  const playableCardIds = useMemo(() => new Set(playableCards.map((card) => card.id)), [playableCards]);
  const selectedCard = useMemo(() => myHand.find((card) => card.id === selectedCardId) ?? null, [myHand, selectedCardId]);

  const turnLabel = useMemo(() => {
    if (!game) return '';
    if (game.winner) return 'Game over';
    if (isMyTurn) {
      return game.board.hasDrawnThisTurn ? 'Play drawn card or pass' : 'Your turn';
    }
    return `Waiting for ${opponentName ?? 'opponent'}...`;
  }, [game, isMyTurn, opponentName]);

  const canPlaySelected = !!selectedCard && playableCardIds.has(selectedCard.id);
  const needsWildColor = selectedCard?.color === 'wild';
  const canPlay = isMyTurn && canPlaySelected && (!needsWildColor || !!selectedWildColor);
  const canDraw = isMyTurn && !!game && !game.board.hasDrawnThisTurn;
  const canPass = isMyTurn && !!game && game.board.hasDrawnThisTurn;

  const handlePlay = useCallback(async () => {
    if (!selectedCard) return;
    play('drop');
    await playCard(selectedCard.id, selectedCard.color === 'wild' ? selectedWildColor : undefined);
    setSelectedCardId(null);
  }, [play, playCard, selectedCard, selectedWildColor]);

  const handleDraw = useCallback(async () => {
    play('turn');
    await drawCard();
  }, [drawCard, play]);

  const handlePass = useCallback(async () => {
    play('turn');
    await pass();
    setSelectedCardId(null);
  }, [pass, play]);

  const handleEndGameConfirm = useCallback(async () => {
    setShowEndDialog(false);
    await endGame();
    router.push('/');
  }, [endGame, router]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-text-secondary text-sm">Loading UNO...</div>
      </div>
    );
  }

  if (deleted || !game) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <div className="text-text-secondary text-sm">Game not found</div>
        <button
          onClick={() => router.push('/uno')}
          className="px-4 py-2 text-sm font-medium rounded-xl border border-border bg-surface text-text-secondary hover:text-text-primary hover:border-text-secondary/30 shadow-sm hover:shadow transition-all cursor-pointer"
        >
          Back to UNO
        </button>
      </div>
    );
  }

  if (game.winner) {
    const winnerName = game.winner === 1 ? game.player1_name : game.player2_name;
    const isMe = game.winner === myPlayerNumber;
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 p-4">
        <SettingsButton />
        <WinCelebration
          winner={game.winner}
          winnerName={winnerName}
          isMe={isMe}
          onPlayAgain={resetGame}
          onHome={() => router.push('/')}
        />
        <div className="rounded-2xl border border-border bg-surface px-6 py-4 text-center">
          <p className="text-sm text-text-secondary">Final score</p>
          <p className="mt-1 text-lg font-semibold text-text-primary">
            <span className="text-player1">{game.player1_name}: {game.board.scores['1']}</span>
            <span className="mx-3 text-text-secondary/40">|</span>
            <span className="text-player2">{game.player2_name}: {game.board.scores['2']}</span>
          </p>
        </div>
      </div>
    );
  }

  const topCard = game.board.discardPile[game.board.discardPile.length - 1];
  const selectedLabel = selectedCard
    ? `${getCardLabel(selectedCard)} selected`
    : game.board.hasDrawnThisTurn
      ? 'You drew a card. Play it or pass.'
      : 'Select a playable card, or draw.';

  return (
    <>
      <SettingsButton />
      <div className="flex-1 flex flex-col items-center gap-5 p-4 pt-16">
        {(!game.player1_id || !game.player2_id) && (
          <div className="rounded-xl border border-border bg-surface px-4 py-2 text-sm text-text-secondary">
            Waiting for opponent to join. You can already play your turn.
          </div>
        )}

        <div className="w-full max-w-3xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-text-primary">UNO</h1>
              <p className="text-sm text-text-secondary">
                You have {myHand.length} cards. {opponentName ?? 'Opponent'} has {opponentCardsLeft} cards.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <TurnIndicator
                currentPlayer={game.current_turn}
                isMyTurn={isMyTurn}
                playerName={opponentName}
                label={turnLabel}
              />
              <NotificationControls
                permissionState={permissionState}
                requestPermission={requestPermission}
                isMuted={isMuted}
                toggleMute={toggleMute}
              />
            </div>
          </div>
        </div>

        <UnoTable
          topCard={topCard}
          activeColor={game.board.activeColor}
          lastAction={game.board.lastAction?.note ?? null}
          lastPlayedBy={game.board.lastAction?.player ?? null}
          player1Name={game.player1_name}
          player2Name={game.player2_name}
          drawPileCount={game.board.drawPile.length}
        />

        <div className={`text-sm ${canPlaySelected || !selectedCard ? 'text-text-secondary' : 'text-player1'}`}>
          {selectedLabel}
        </div>

        {selectedCard?.color === 'wild' && (
          <div className="flex items-center gap-2">
            {(['red', 'yellow', 'green', 'blue'] as UnoColor[]).map((color) => (
              <button
                key={color}
                onClick={() => setSelectedWildColor(color)}
                className={`w-8 h-8 rounded-full border-2 ${selectedWildColor === color ? 'border-white' : 'border-black/20'} cursor-pointer`}
                style={{
                  backgroundColor:
                    color === 'red'
                      ? '#DC2626'
                      : color === 'yellow'
                        ? '#CA8A04'
                        : color === 'green'
                          ? '#16A34A'
                          : '#2563EB',
                }}
                aria-label={`Choose ${color}`}
              />
            ))}
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-player1/20 bg-player1/5 px-4 py-2 text-sm text-player1">
            {error}
          </div>
        )}

        <div className="w-full max-w-5xl">
          <UnoHand
            cards={myHand}
            selectedCardId={selectedCardId}
            disabled={!isMyTurn}
            playableCardIds={playableCardIds}
            onSelectCard={(cardId) => setSelectedCardId((prev) => (prev === cardId ? null : cardId))}
          />
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={handlePlay}
            disabled={!canPlay}
            className="px-5 py-2.5 text-sm font-semibold rounded-xl bg-player1 text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm cursor-pointer"
          >
            Play Card
          </button>
          <button
            onClick={handleDraw}
            disabled={!canDraw}
            className="px-5 py-2.5 text-sm font-medium rounded-xl border border-border bg-surface text-text-secondary hover:text-text-primary hover:border-text-secondary/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
          >
            Draw Card
          </button>
          <button
            onClick={handlePass}
            disabled={!canPass}
            className="px-5 py-2.5 text-sm font-medium rounded-xl border border-border bg-surface text-text-secondary hover:text-text-primary hover:border-text-secondary/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
          >
            Pass
          </button>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 text-sm font-medium rounded-xl border border-border bg-surface text-text-secondary hover:text-text-primary hover:border-text-secondary/30 transition-all cursor-pointer"
          >
            Home
          </button>
          <button
            onClick={() => setShowEndDialog(true)}
            className="px-4 py-2 text-sm font-medium rounded-xl border border-player1/20 bg-player1/5 text-player1/80 hover:bg-player1/10 hover:border-player1/40 hover:text-player1 transition-all cursor-pointer"
          >
            End Game
          </button>
        </div>
      </div>

      <EndGameDialog
        open={showEndDialog}
        onConfirm={handleEndGameConfirm}
        onCancel={() => setShowEndDialog(false)}
      />
    </>
  );
}

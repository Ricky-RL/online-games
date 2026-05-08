'use client';

import { use, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SettingsButton } from '@/components/SettingsButton';
import { TurnIndicator } from '@/components/TurnIndicator';
import { WinCelebration } from '@/components/WinCelebration';
import { EndGameDialog } from '@/components/EndGameDialog';
import { NotificationControls } from '@/components/NotificationControls';
import { CrazyEightsHand } from '@/components/crazy-eights/CrazyEightsHand';
import { CrazyEightsHowToPlay } from '@/components/crazy-eights/CrazyEightsHowToPlay';
import { CrazyEightsTable } from '@/components/crazy-eights/CrazyEightsTable';
import { useCrazyEightsGame } from '@/hooks/useCrazyEightsGame';
import { useGameSounds } from '@/hooks/useSound';
import { useNotifications } from '@/hooks/useNotifications';
import { getPlayableCards, getCardLabel, type CrazyEightsSuit } from '@/lib/crazy-eights-logic';
import type { Player } from '@/lib/types';

function getMyName(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('player-name') || localStorage.getItem('player-name');
}

export default function CrazyEightsGamePage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = use(params);
  const router = useRouter();
  const { game, loading, error, deleted, playCard, drawCard, pass, resetGame, endGame } = useCrazyEightsGame(gameId);
  const { play } = useGameSounds();
  const [myName] = useState<string | null>(() => getMyName());
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [selectedSuit, setSelectedSuit] = useState<CrazyEightsSuit>('hearts');
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);

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
    gameType: 'crazy-eights',
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
      return game.board.hasDrawnThisTurn
        ? game.board.drawnCardId
          ? 'Play the drawn card'
          : game.board.drawPile.length > 0 || game.board.discardPile.length > 1
            ? 'Draw again until playable'
            : 'No cards left, pass turn'
        : 'Your turn';
    }
    return `Waiting for ${opponentName ?? 'opponent'}...`;
  }, [game, isMyTurn, opponentName]);

  const canPlaySelected = !!selectedCard && playableCardIds.has(selectedCard.id);
  const needsSuitChoice = selectedCard?.rank === '8';
  const canPlay = isMyTurn && canPlaySelected && (!needsSuitChoice || !!selectedSuit);
  const canDraw = isMyTurn && !!game && (!game.board.hasDrawnThisTurn || !game.board.drawnCardId);
  const canPass =
    isMyTurn &&
    !!game &&
    game.board.hasDrawnThisTurn &&
    !game.board.drawnCardId &&
    game.board.drawPile.length === 0 &&
    game.board.discardPile.length <= 1;

  const handlePlay = useCallback(async () => {
    if (!selectedCard) return;
    play('drop');
    await playCard(selectedCard.id, selectedCard.rank === '8' ? selectedSuit : undefined);
    setSelectedCardId(null);
  }, [play, playCard, selectedCard, selectedSuit]);

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
        <div className="text-text-secondary text-sm">Loading Crazy Eights...</div>
      </div>
    );
  }

  if (deleted || !game) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <div className="text-text-secondary text-sm">Game not found</div>
        <button
          onClick={() => router.push('/crazy-eights')}
          className="px-4 py-2 text-sm font-medium rounded-xl border border-border bg-surface text-text-secondary hover:text-text-primary hover:border-text-secondary/30 shadow-sm hover:shadow transition-all cursor-pointer"
        >
          Back to Crazy Eights
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
      ? game.board.drawnCardId
        ? 'You found a playable card. Play it now.'
        : game.board.drawPile.length > 0 || game.board.discardPile.length > 1
          ? 'No playable card yet. Draw again.'
          : 'No cards left. Pass your turn.'
      : 'Select a playable card, or draw one card.';

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
              <h1 className="text-3xl font-bold tracking-tight text-text-primary">Crazy Eights</h1>
              <p className="text-sm text-text-secondary">
                You have {myHand.length} cards. {opponentName ?? 'Opponent'} has {opponentCardsLeft} cards.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowHowToPlay(true)}
                className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface transition-colors cursor-pointer"
                title="How to play"
                aria-label="How to play"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.09 9a3 3 0 0 1 5.82 1c0 2-3 3-3 3" />
                  <path d="M12 17h.01" />
                </svg>
              </button>
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

        <CrazyEightsTable
          topCard={topCard}
          activeSuit={game.board.activeSuit}
          lastAction={game.board.lastAction?.note ?? null}
          lastPlayedBy={game.board.lastAction?.player ?? null}
          player1Name={game.player1_name}
          player2Name={game.player2_name}
          drawPileCount={game.board.drawPile.length}
        />

        <div className={`text-sm ${canPlaySelected || !selectedCard ? 'text-text-secondary' : 'text-player1'}`}>
          {selectedLabel}
        </div>

        {selectedCard?.rank === '8' && (
          <div className="flex flex-wrap items-center gap-2">
            {(['clubs', 'diamonds', 'hearts', 'spades'] as CrazyEightsSuit[]).map((suit) => (
              <button
                key={suit}
                onClick={() => setSelectedSuit(suit)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-all cursor-pointer ${
                  selectedSuit === suit
                    ? 'border-board bg-board/10 text-board'
                    : 'border-border bg-surface text-text-secondary hover:text-text-primary hover:border-text-secondary/30'
                }`}
              >
                {suit[0].toUpperCase() + suit.slice(1)}
              </button>
            ))}
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-player1/20 bg-player1/5 px-4 py-2 text-sm text-player1">
            {error}
          </div>
        )}

        <div className="w-full max-w-5xl">
          <CrazyEightsHand
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
      <CrazyEightsHowToPlay open={showHowToPlay} onClose={() => setShowHowToPlay(false)} />
    </>
  );
}

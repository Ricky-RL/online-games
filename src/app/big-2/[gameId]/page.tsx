'use client';

import { use, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { SettingsButton } from '@/components/SettingsButton';
import { TurnIndicator } from '@/components/TurnIndicator';
import { WinCelebration } from '@/components/WinCelebration';
import { EndGameDialog } from '@/components/EndGameDialog';
import { NotificationControls } from '@/components/NotificationControls';
import { Big2Card } from '@/components/big-2/Big2Card';
import { Big2Hand } from '@/components/big-2/Big2Hand';
import { Big2Table } from '@/components/big-2/Big2Table';
import { useBig2Game } from '@/hooks/useBig2Game';
import { useGameSounds } from '@/hooks/useSound';
import { useNotifications } from '@/hooks/useNotifications';
import {
  describeCombination,
  evaluateCombination,
  getCardLabel,
  getPlayableCombinations,
  type BigTwoCombinationType,
  type BigTwoCard,
} from '@/lib/big-2-logic';
import type { Player } from '@/lib/types';

function getMyName(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('player-name') || localStorage.getItem('player-name');
}

const COMBINATION_DISPLAY_ORDER: BigTwoCombinationType[] = [
  'single',
  'pair',
  'triple',
  'straight',
  'flush',
  'full-house',
  'four-kind',
  'straight-flush',
];

const rulebookHands = [
  { label: 'Single', detail: 'Any one card. Higher rank wins; suit breaks ties.' },
  { label: 'Pair', detail: 'Two cards of the same rank. Higher rank wins; highest suit breaks ties.' },
  { label: 'Triple', detail: 'Three cards of the same rank. Higher rank wins.' },
  { label: 'Straight', detail: 'Five-card run. Lowest five-card hand.' },
  { label: 'Flush', detail: 'Five cards of one suit. Beats any straight.' },
  { label: 'Full house', detail: 'Triple plus pair. Triple rank decides.' },
  { label: 'Four of a kind', detail: 'Four matching ranks plus any fifth card.' },
  { label: 'Straight flush', detail: 'Five-card suited run. Highest five-card hand.' },
];

export default function Big2GamePage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = use(params);
  const router = useRouter();
  const { game, loading, error, deleted, playCards, pass, resetGame, endGame } = useBig2Game(gameId);
  const { play } = useGameSounds();
  const [myName] = useState<string | null>(() => getMyName());
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [showStrengthInfo, setShowStrengthInfo] = useState(false);

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
    gameType: 'big-2',
  });

  const myHand = useMemo(() => {
    if (!game || !myPlayerNumber) return [];
    return game.board.hands[myPlayerNumber === 1 ? '1' : '2'];
  }, [game, myPlayerNumber]);

  const selectedCards = useMemo(
    () => myHand.filter((card) => selectedIds.includes(card.id)),
    [myHand, selectedIds]
  );

  const selectedCombination = useMemo(() => {
    if (!myPlayerNumber || selectedCards.length === 0) return null;
    return evaluateCombination(selectedCards, myPlayerNumber);
  }, [myPlayerNumber, selectedCards]);

  const opponentCardsLeft = useMemo(() => {
    if (!game || !myPlayerNumber) return 0;
    return game.board.hands[myPlayerNumber === 1 ? '2' : '1'].length;
  }, [game, myPlayerNumber]);

  const playableCombinationsByType = useMemo(() => {
    if (!myPlayerNumber || !game) return new Map<BigTwoCombinationType, BigTwoCard[][]>();

    const grouped = new Map<BigTwoCombinationType, BigTwoCard[][]>();
    const playable = getPlayableCombinations(
      myHand,
      myPlayerNumber,
      game.board.currentTrick.activeCombination,
      game.board.moveCount
    );
    for (const combination of playable) {
      grouped.set(combination.type, [...(grouped.get(combination.type) ?? []), combination.cards]);
    }
    return grouped;
  }, [game, myHand, myPlayerNumber]);

  const turnLabel = useMemo(() => {
    if (!game) return '';
    if (game.winner) return 'Game over';
    if (isMyTurn) {
      if (!game.board.currentTrick.activeCombination) return 'Your lead';
      return 'Your turn';
    }
    return `Waiting for ${opponentName ?? 'opponent'}...`;
  }, [game, isMyTurn, opponentName]);

  const toggleCard = useCallback((cardId: string) => {
    setSelectedIds((prev) =>
      prev.includes(cardId)
        ? prev.filter((id) => id !== cardId)
        : prev.length >= 5
          ? prev
          : [...prev, cardId]
    );
  }, []);

  const handlePlay = useCallback(async () => {
    if (selectedIds.length === 0) return;
    play('drop');
    await playCards(selectedIds);
    setSelectedIds([]);
  }, [play, playCards, selectedIds]);

  const handlePass = useCallback(async () => {
    play('turn');
    await pass();
  }, [pass, play]);

  const handleEndGameConfirm = useCallback(async () => {
    setShowEndDialog(false);
    await endGame();
    router.push('/');
  }, [endGame, router]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-text-secondary text-sm">Loading Big 2...</div>
      </div>
    );
  }

  if (deleted || !game) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <div className="text-text-secondary text-sm">Game not found</div>
        <button
          onClick={() => router.push('/big-2')}
          className="px-4 py-2 text-sm font-medium rounded-xl border border-border bg-surface text-text-secondary hover:text-text-primary hover:border-text-secondary/30 shadow-sm hover:shadow transition-all cursor-pointer"
        >
          Back to Big 2
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

  const canPass = isMyTurn && !!game.board.currentTrick.activeCombination;
  const canPlay = isMyTurn && selectedIds.length > 0 && !!selectedCombination;
  const selectedLabel = selectedCards.length
    ? selectedCombination
      ? `${describeCombination(selectedCombination.type)}: ${selectedCards.map(getCardLabel).join(' ')}`
      : 'Invalid combination'
    : game.board.currentTrick.activeCombination
      ? 'Match the table or pass'
      : 'Select 1, 2, 3, or 5 cards';

  return (
    <>
      <SettingsButton />
      <button
        onClick={() => setShowStrengthInfo((open) => !open)}
        className="fixed top-5 right-[4.25rem] z-40 w-10 h-10 flex items-center justify-center rounded-full bg-surface border border-border shadow-md hover:shadow-lg transition-shadow cursor-pointer text-text-secondary hover:text-text-primary"
        aria-label="Show hand strengths"
        title="Show hand strengths"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 10v6" />
          <path d="M12 7h.01" />
        </svg>
      </button>

      <AnimatePresence>
        {showStrengthInfo && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="fixed right-5 top-[4.5rem] z-40 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-border bg-surface p-4 shadow-xl"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-text-primary">Big 2 Reference</h2>
                <p className="text-xs text-text-secondary">Rulebook and your possible combinations</p>
              </div>
              <button
                onClick={() => setShowStrengthInfo(false)}
                className="rounded-lg p-1 text-text-secondary hover:bg-background hover:text-text-primary cursor-pointer"
                aria-label="Close hand strengths"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="max-h-[70vh] space-y-5 overflow-y-auto pr-1">
              <section className="space-y-3">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary/70">
                    Rulebook Strength
                  </h3>
                  <p className="mt-1 text-xs text-text-secondary">
                    Card count must match. For five-card hands, strength rises from top to bottom.
                  </p>
                </div>

                <div className="rounded-xl border border-border bg-background/50 p-3">
                  <div className="mb-2 text-xs text-text-secondary">
                    Rank: 3 &lt; 4 &lt; 5 &lt; 6 &lt; 7 &lt; 8 &lt; 9 &lt; 10 &lt; J &lt; Q &lt; K &lt; A &lt; 2
                  </div>
                  <div className="text-xs text-text-secondary">
                    Suit: ♦ &lt; ♣ &lt; ♥ &lt; ♠
                  </div>
                </div>

                <div className="space-y-2">
                  {rulebookHands.map((hand, index) => (
                    <div
                      key={hand.label}
                      className="flex gap-3 rounded-xl border border-border bg-background/50 px-3 py-2"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface text-xs font-semibold text-text-secondary">
                        {index + 1}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-text-primary">{hand.label}</p>
                        <p className="text-xs leading-relaxed text-text-secondary">{hand.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <p className="rounded-xl border border-player1/15 bg-player1/5 px-3 py-2 text-xs leading-relaxed text-text-secondary">
                  A pair only fights another pair, a triple only fights another triple, and a five-card hand only fights another five-card hand.
                </p>
              </section>

              <section>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary/70">
                    Your Hand Strength
                  </h3>
                  <span className="text-xs text-text-secondary">
                    {COMBINATION_DISPLAY_ORDER.reduce(
                      (total, type) => total + (playableCombinationsByType.get(type)?.length ?? 0),
                      0
                    )} combos
                  </span>
                </div>

                {COMBINATION_DISPLAY_ORDER.every((type) => (playableCombinationsByType.get(type)?.length ?? 0) === 0) ? (
                  <p className="rounded-xl border border-dashed border-border bg-background/60 px-3 py-4 text-center text-sm text-text-secondary">
                    No playable combinations right now.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {COMBINATION_DISPLAY_ORDER.map((type) => {
                      const combos = playableCombinationsByType.get(type) ?? [];
                      if (combos.length === 0) return null;

                      return (
                        <div key={type} className="space-y-2">
                          <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background/50 px-3 py-2">
                            <p className="text-xs font-semibold text-text-primary">{describeCombination(type)}</p>
                            <span className="text-xs text-text-secondary">{combos.length}</span>
                          </div>
                          <div className="space-y-2">
                            {combos.map((comboCards) => (
                              <button
                                key={comboCards.map((card) => card.id).join('-')}
                                onClick={() => {
                                  setSelectedIds(comboCards.map((card) => card.id));
                                  setShowStrengthInfo(false);
                                }}
                                className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-background/40 px-3 py-2 text-left hover:border-text-secondary/30 hover:bg-background cursor-pointer"
                              >
                                <div className="flex items-center gap-1.5">
                                  {comboCards.map((card) => (
                                    <Big2Card key={card.id} card={card} compact />
                                  ))}
                                </div>
                                <span className="text-xs font-medium text-text-secondary">
                                  {comboCards.map(getCardLabel).join(' ')}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col items-center gap-5 p-4 pt-16">
        {(!game.player1_id || !game.player2_id) && (
          <div className="rounded-xl border border-border bg-surface px-4 py-2 text-sm text-text-secondary">
            Waiting for opponent to join. You can play the opening turn now.
          </div>
        )}

        <div className="w-full max-w-3xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-text-primary">Big 2</h1>
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

        <Big2Table
          activeCombination={game.board.currentTrick.activeCombination}
          lastPlayedBy={game.board.currentTrick.lastPlayedBy}
          player1Name={game.player1_name}
          player2Name={game.player2_name}
          discardsCount={game.board.discards.length}
        />

        <motion.div
          key={selectedLabel}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className={`text-sm ${selectedCombination || selectedCards.length === 0 ? 'text-text-secondary' : 'text-player1'}`}
        >
          {selectedLabel}
        </motion.div>

        {error && (
          <div className="rounded-xl border border-player1/20 bg-player1/5 px-4 py-2 text-sm text-player1">
            {error}
          </div>
        )}

        <div className="w-full max-w-5xl">
          <Big2Hand
            cards={myHand}
            selectedIds={selectedIds}
            disabled={!isMyTurn}
            onToggleCard={toggleCard}
          />
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={handlePlay}
            disabled={!canPlay}
            className="px-5 py-2.5 text-sm font-semibold rounded-xl bg-player1 text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm cursor-pointer"
          >
            Play Cards
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

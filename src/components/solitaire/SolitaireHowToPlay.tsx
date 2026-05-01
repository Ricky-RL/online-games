'use client';

import { useEffect, useRef } from 'react';

interface SolitaireHowToPlayProps {
  open: boolean;
  onClose: () => void;
}

export function SolitaireHowToPlay({ open, onClose }: SolitaireHowToPlayProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const handleDialogClose = () => {
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) {
      onClose();
    }
  };

  return (
    <dialog
      ref={dialogRef}
      onClose={handleDialogClose}
      onClick={handleBackdropClick}
      aria-labelledby="solitaire-how-to-play-title"
      className="backdrop:bg-black/50 bg-transparent p-0 m-auto max-h-[85vh] overflow-visible"
    >
      <div className="bg-surface border border-border rounded-2xl p-6 shadow-xl max-w-md w-[calc(100vw-2rem)] overflow-y-auto max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 id="solitaire-how-to-play-title" className="text-lg font-semibold text-text-primary">
            How to Play Solitaire
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors cursor-pointer"
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1 1L13 13M1 13L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Objective */}
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-text-primary mb-1">Objective</h3>
          <p className="text-sm text-text-secondary">
            Move all 52 cards to the four foundation piles, building each from Ace to King by suit.
          </p>
        </div>

        {/* Moving cards */}
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-text-primary mb-2">Moving Cards</h3>
          <ul className="space-y-1.5 text-sm text-text-secondary">
            <li className="flex items-start gap-2">
              <span className="text-text-secondary/60 mt-0.5 shrink-0">&#x2022;</span>
              <span><strong className="text-text-primary">Drag and drop</strong> cards between columns and onto foundations</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-text-secondary/60 mt-0.5 shrink-0">&#x2022;</span>
              <span><strong className="text-text-primary">Double-tap</strong> a card to automatically send it to a foundation pile (if valid)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-text-secondary/60 mt-0.5 shrink-0">&#x2022;</span>
              <span>You can move a stack of face-up cards together between tableau columns</span>
            </li>
          </ul>
        </div>

        {/* Tableau rules */}
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-text-primary mb-2">Tableau (Columns)</h3>
          <ul className="space-y-1.5 text-sm text-text-secondary">
            <li className="flex items-start gap-2">
              <span className="text-text-secondary/60 mt-0.5 shrink-0">&#x2022;</span>
              <span>Build columns in <strong className="text-text-primary">descending order</strong> (King down to Ace)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-text-secondary/60 mt-0.5 shrink-0">&#x2022;</span>
              <span>Cards must alternate colors (<span className="text-red-500">red</span> on black, black on <span className="text-red-500">red</span>)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-text-secondary/60 mt-0.5 shrink-0">&#x2022;</span>
              <span>Only a <strong className="text-text-primary">King</strong> can be placed on an empty column</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-text-secondary/60 mt-0.5 shrink-0">&#x2022;</span>
              <span>When a face-down card is uncovered, it flips face-up automatically</span>
            </li>
          </ul>
        </div>

        {/* Foundation rules */}
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-text-primary mb-2">Foundations (Top Right)</h3>
          <ul className="space-y-1.5 text-sm text-text-secondary">
            <li className="flex items-start gap-2">
              <span className="text-text-secondary/60 mt-0.5 shrink-0">&#x2022;</span>
              <span>Build each pile in <strong className="text-text-primary">ascending order</strong> (Ace up to King)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-text-secondary/60 mt-0.5 shrink-0">&#x2022;</span>
              <span>Each pile must contain only <strong className="text-text-primary">one suit</strong> (&#9824; &#9829; &#9830; &#9827;)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-text-secondary/60 mt-0.5 shrink-0">&#x2022;</span>
              <span>Start each pile with an Ace, then 2, 3, 4... up to King</span>
            </li>
          </ul>
        </div>

        {/* Stock pile */}
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-text-primary mb-2">Stock Pile (Top Left)</h3>
          <ul className="space-y-1.5 text-sm text-text-secondary">
            <li className="flex items-start gap-2">
              <span className="text-text-secondary/60 mt-0.5 shrink-0">&#x2022;</span>
              <span><strong className="text-text-primary">Tap the stock</strong> to draw one card to the waste pile</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-text-secondary/60 mt-0.5 shrink-0">&#x2022;</span>
              <span>The top card of the waste pile is available to play</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-text-secondary/60 mt-0.5 shrink-0">&#x2022;</span>
              <span>When the stock is empty, tap it to recycle the waste pile back into the stock</span>
            </li>
          </ul>
        </div>

        {/* Tips */}
        <div>
          <h3 className="text-sm font-semibold text-text-primary mb-2">Tips</h3>
          <ul className="space-y-1.5 text-sm text-text-secondary">
            <li className="flex items-start gap-2">
              <span className="text-amber-500 mt-0.5 shrink-0">&#x2022;</span>
              <span>Prioritize uncovering face-down cards to open up more moves</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-500 mt-0.5 shrink-0">&#x2022;</span>
              <span>Use <strong className="text-text-primary">Undo</strong> to take back a move (costs one move)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-500 mt-0.5 shrink-0">&#x2022;</span>
              <span>When all remaining cards are face-up, the <strong className="text-text-primary">Auto-Complete</strong> button appears</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-500 mt-0.5 shrink-0">&#x2022;</span>
              <span>Fewer moves and faster time wins the head-to-head challenge</span>
            </li>
          </ul>
        </div>
      </div>
    </dialog>
  );
}

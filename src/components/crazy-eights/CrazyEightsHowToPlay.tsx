'use client';

import { useEffect, useRef } from 'react';

interface CrazyEightsHowToPlayProps {
  open: boolean;
  onClose: () => void;
}

export function CrazyEightsHowToPlay({ open, onClose }: CrazyEightsHowToPlayProps) {
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
      aria-labelledby="crazy-eights-how-to-play-title"
      className="backdrop:bg-black/50 bg-transparent p-0 m-auto max-h-[85vh] overflow-visible"
    >
      <div className="bg-surface border border-border rounded-2xl p-6 shadow-xl max-w-md w-[calc(100vw-2rem)] overflow-y-auto max-h-[80vh]">
        <div className="flex items-center justify-between mb-4">
          <h2 id="crazy-eights-how-to-play-title" className="text-lg font-semibold text-text-primary">
            How to Play Crazy Eights
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

        <div className="mb-4">
          <h3 className="text-sm font-semibold text-text-primary mb-1">Goal</h3>
          <p className="text-sm text-text-secondary">
            Be the first player to empty your hand.
          </p>
        </div>

        <div className="mb-4">
          <h3 className="text-sm font-semibold text-text-primary mb-2">Turns</h3>
          <ul className="space-y-1.5 text-sm text-text-secondary">
            <li className="flex items-start gap-2">
              <span className="text-text-secondary/60 mt-0.5 shrink-0">&#x2022;</span>
              <span>Play a card that matches the top discard by <strong className="text-text-primary">rank</strong> or <strong className="text-text-primary">suit</strong>.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-text-secondary/60 mt-0.5 shrink-0">&#x2022;</span>
              <span><strong className="text-text-primary">8s are wild:</strong> when you play an 8, choose the next active suit.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-text-secondary/60 mt-0.5 shrink-0">&#x2022;</span>
              <span>If you cannot play, draw one card. Keep drawing until you find a playable card.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-text-secondary/60 mt-0.5 shrink-0">&#x2022;</span>
              <span>Once you draw a playable card, you must play that drawn card on this turn.</span>
            </li>
          </ul>
        </div>

        <div className="mb-4">
          <h3 className="text-sm font-semibold text-text-primary mb-2">Passing</h3>
          <p className="text-sm text-text-secondary">
            You can only pass if there are no more cards left to draw and you still have no playable card.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-text-primary mb-2">Scoring</h3>
          <p className="text-sm text-text-secondary">
            The winner gains points equal to the total value left in the opponent&apos;s hand.
            Eights are worth 50, face cards and tens are worth 10, aces are worth 1.
          </p>
        </div>
      </div>
    </dialog>
  );
}

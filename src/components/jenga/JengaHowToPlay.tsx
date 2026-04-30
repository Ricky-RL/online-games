'use client';

import { useEffect, useRef } from 'react';

interface JengaHowToPlayProps {
  open: boolean;
  onClose: () => void;
}

export function JengaHowToPlay({ open, onClose }: JengaHowToPlayProps) {
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
      aria-labelledby="jenga-how-to-play-title"
      className="backdrop:bg-black/50 bg-transparent p-0 m-auto max-h-[85vh] overflow-visible"
    >
      <div className="bg-surface border border-border rounded-2xl p-6 shadow-xl max-w-md w-[calc(100vw-2rem)] overflow-y-auto max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 id="jenga-how-to-play-title" className="text-lg font-semibold text-text-primary">
            How to Play Jenga
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

        {/* Goal */}
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-text-primary mb-1">Goal</h3>
          <p className="text-sm text-text-secondary">
            Don&apos;t topple the tower! The player who causes the tower to fall loses.
          </p>
        </div>

        {/* Taking your turn */}
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-text-primary mb-2">Taking your turn</h3>
          <ol className="space-y-2 text-sm text-text-secondary list-decimal list-inside">
            <li>
              <strong className="text-text-primary">Select a block</strong> &mdash; blocks glow with their risk level (green = safe, red = dangerous). You can only pull blocks above the minimum risk threshold shown at the top.
            </li>
            <li>
              <strong className="text-text-primary">Drag to pull</strong> &mdash; a guide path appears. Trace it carefully! The closer you follow the path, the safer your pull. A perfect drag can reduce your topple chance by up to 85%.
            </li>
            <li>
              <strong className="text-text-primary">Watch the cascade</strong> &mdash; pulling a block destabilizes its neighbors. Plan ahead to leave yourself safe options and set traps for your opponent.
            </li>
          </ol>
        </div>

        {/* Scoring */}
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-text-primary mb-1">Scoring</h3>
          <p className="text-sm text-text-secondary">
            You earn points equal to the risk % of each block you successfully pull. High risk = high reward!
          </p>
        </div>

        {/* Tips */}
        <div>
          <h3 className="text-sm font-semibold text-text-primary mb-2">Tips</h3>
          <ul className="space-y-1.5 text-sm text-text-secondary">
            <li className="flex items-start gap-2">
              <span className="text-amber-500 mt-0.5 shrink-0">&#x2022;</span>
              Lower blocks and edge blocks are riskier
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-500 mt-0.5 shrink-0">&#x2022;</span>
              Pulling a block increases risk on blocks above and beside it
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-500 mt-0.5 shrink-0">&#x2022;</span>
              The minimum risk threshold rises each turn &mdash; you can&apos;t play it safe forever
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-500 mt-0.5 shrink-0">&#x2022;</span>
              Steady hands matter: a sloppy pull on a safe block can still topple the tower
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-500 mt-0.5 shrink-0">&#x2022;</span>
              You have 15 seconds to complete each drag
            </li>
          </ul>
        </div>
      </div>
    </dialog>
  );
}

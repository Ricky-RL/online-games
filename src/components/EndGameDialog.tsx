'use client';

import { useEffect, useRef } from 'react';

interface EndGameDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function EndGameDialog({ open, onConfirm, onCancel }: EndGameDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const confirmedRef = useRef(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      confirmedRef.current = false;
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const handleConfirm = () => {
    confirmedRef.current = true;
    onConfirm();
  };

  const handleDialogClose = () => {
    if (!confirmedRef.current) {
      onCancel();
    }
  };

  return (
    <dialog
      ref={dialogRef}
      onClose={handleDialogClose}
      className="backdrop:bg-black/50 bg-transparent p-0 m-auto"
    >
      <div className="bg-surface border border-border rounded-2xl p-6 shadow-xl max-w-sm w-[calc(100vw-2rem)]">
        <h2 className="text-lg font-semibold text-text-primary mb-2">
          End this game?
        </h2>
        <p className="text-sm text-text-secondary mb-6">
          Are you sure you want to end this game? Both players will be returned to the game selector.
        </p>
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium rounded-xl border border-border bg-surface text-text-secondary hover:text-text-primary hover:border-text-secondary/30 transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 text-sm font-medium rounded-xl bg-player1 text-white hover:opacity-90 transition-all cursor-pointer"
          >
            End Game
          </button>
        </div>
      </div>
    </dialog>
  );
}

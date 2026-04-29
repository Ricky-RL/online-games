'use client';

import Link from 'next/link';

export function GameFullMessage() {
  return (
    <div className="flex flex-col items-center gap-6 text-center px-4">
      <div className="w-16 h-16 rounded-full bg-surface border border-border flex items-center justify-center">
        <span className="text-2xl">&#128542;</span>
      </div>

      <div>
        <h2 className="text-xl font-semibold text-text-primary mb-2">
          This game is full
        </h2>
        <p className="text-text-secondary text-sm">
          This game already has two players. Why not start your own?
        </p>
      </div>

      <Link
        href="/"
        className="px-6 py-3 text-base font-medium rounded-xl bg-board text-white hover:bg-board-surface transition-colors"
      >
        Create a New Game
      </Link>
    </div>
  );
}

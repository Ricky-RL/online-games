'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

interface WaitingForOpponentProps {
  gameUrl: string;
}

export function WaitingForOpponent({ gameUrl }: WaitingForOpponentProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(gameUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for browsers without clipboard API
      const input = document.createElement('input');
      input.value = gameUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex flex-col items-center gap-6 text-center px-4">
      <div className="flex items-center gap-2">
        <motion.div
          className="w-2 h-2 rounded-full bg-player1"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
        />
        <motion.div
          className="w-2 h-2 rounded-full bg-player1"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
        />
        <motion.div
          className="w-2 h-2 rounded-full bg-player1"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 0.6 }}
        />
      </div>

      <div>
        <h2 className="text-xl font-semibold text-text-primary mb-2">
          Waiting for your opponent
        </h2>
        <p className="text-text-secondary text-sm">
          Share this link with your opponent to start playing
        </p>
      </div>

      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 bg-surface border border-border rounded-xl px-4 py-3">
          <span className="text-sm text-text-secondary truncate flex-1">
            {gameUrl}
          </span>
          <button
            onClick={handleCopy}
            className="shrink-0 px-4 py-1.5 text-sm font-medium rounded-lg bg-board text-white hover:bg-board-surface transition-colors cursor-pointer"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>
    </div>
  );
}

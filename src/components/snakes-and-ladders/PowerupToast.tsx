'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { PowerupType } from '@/lib/types';

const POWERUP_INFO: Record<PowerupType, { icon: string; name: string }> = {
  double_dice: { icon: '🎲', name: 'Double Dice' },
  shield: { icon: '🛡️', name: 'Shield' },
  reverse: { icon: '⏪', name: 'Reverse' },
  teleport: { icon: '✨', name: 'Teleport' },
  freeze: { icon: '🧊', name: 'Freeze' },
  swap: { icon: '🔄', name: 'Swap' },
  earthquake: { icon: '🌋', name: 'Earthquake' },
  magnet: { icon: '🧲', name: 'Magnet' },
};

interface PowerupToastProps {
  powerup: { type: PowerupType; effect: string } | null;
  onDismiss: () => void;
}

export function PowerupToast({ powerup, onDismiss }: PowerupToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (powerup) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        onDismiss();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [powerup, onDismiss]);

  const info = powerup ? POWERUP_INFO[powerup.type] : null;

  return (
    <AnimatePresence>
      {visible && info && powerup && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
        >
          <div
            className="bg-surface/95 backdrop-blur-sm border border-border rounded-2xl px-8 py-6 shadow-xl text-center pointer-events-auto cursor-pointer"
            onClick={() => { setVisible(false); onDismiss(); }}
          >
            <div className="text-5xl mb-3">{info.icon}</div>
            <div className="text-lg font-bold text-text-primary mb-1">{info.name}</div>
            <div className="text-sm text-text-secondary">{powerup.effect}</div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export { POWERUP_INFO };

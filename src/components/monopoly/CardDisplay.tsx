'use client';

import { DrawnCard } from '@/lib/monopoly/types';
import { motion } from 'framer-motion';

interface CardDisplayProps {
  card: DrawnCard;
  isMyTurn: boolean;
  onAcknowledge: () => void;
}

export function CardDisplay({ card, isMyTurn, onAcknowledge }: CardDisplayProps) {
  const isChance = card.cardType === 'chance';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`rounded-xl sm:rounded-2xl border-2 p-4 sm:p-6 w-full max-w-sm mx-auto ${
        isChance
          ? 'border-orange-400 bg-orange-50 dark:bg-orange-950/30'
          : 'border-sky-400 bg-sky-50 dark:bg-sky-950/30'
      }`}
    >
      <h3 className={`text-sm sm:text-base font-bold mb-1 ${
        isChance ? 'text-orange-600 dark:text-orange-400' : 'text-sky-600 dark:text-sky-400'
      }`}>
        {isChance ? 'Chance' : 'Community Chest'}
      </h3>
      <p className="text-sm sm:text-base text-text-primary mb-4 leading-relaxed">
        {card.text}
      </p>
      {isMyTurn && (
        <motion.button
          onClick={onAcknowledge}
          className={`w-full px-4 py-2.5 min-h-[48px] rounded-xl text-white font-medium transition-colors cursor-pointer ${
            isChance
              ? 'bg-orange-500 hover:bg-orange-600 active:bg-orange-700'
              : 'bg-sky-500 hover:bg-sky-600 active:bg-sky-700'
          }`}
          whileTap={{ scale: 0.95 }}
        >
          OK
        </motion.button>
      )}
    </motion.div>
  );
}

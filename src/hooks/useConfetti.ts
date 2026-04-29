'use client';

import { useCallback } from 'react';
import confetti from 'canvas-confetti';
import { useColors } from '@/contexts/PlayerColorsContext';
import { confettiColors as getConfettiColors } from '@/lib/colors';

export function useConfetti() {
  const { player1Color, player2Color } = useColors();

  const fireConfetti = useCallback(() => {
    const colors = getConfettiColors(player1Color);
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors,
    });
    setTimeout(() => {
      confetti({
        particleCount: 50,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: getConfettiColors(player2Color),
      });
      confetti({
        particleCount: 50,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: getConfettiColors(player2Color),
      });
    }, 250);
  }, [player1Color, player2Color]);

  return { fireConfetti };
}

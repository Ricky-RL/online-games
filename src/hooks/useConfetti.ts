'use client';

import { useCallback, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { useColors } from '@/contexts/PlayerColorsContext';
import { confettiColors as getConfettiColors } from '@/lib/colors';

const FOLLOWUP_DELAY_MS = 250;
const RESET_DELAY_MS = 5000;

export function useConfetti() {
  const { player1Color, player2Color } = useColors();
  const confettiInstanceRef = useRef<ReturnType<typeof confetti.create> | null>(null);
  const followupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getInstance = useCallback(() => {
    if (!confettiInstanceRef.current) {
      confettiInstanceRef.current = confetti.create(undefined, {
        resize: true,
        useWorker: false,
      });
    }

    return confettiInstanceRef.current;
  }, []);

  const fireConfetti = useCallback(() => {
    if (followupTimerRef.current) {
      clearTimeout(followupTimerRef.current);
      followupTimerRef.current = null;
    }


    const colors = getConfettiColors(player1Color);
    const confettiInstance = getInstance();
    confettiInstance.reset();
    confettiInstance({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors,
    });

    followupTimerRef.current = setTimeout(() => {
      confettiInstance({
        particleCount: 50,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: getConfettiColors(player2Color),
      });
      confettiInstance({
        particleCount: 50,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: getConfettiColors(player2Color),
      });

      followupTimerRef.current = null;
    }, FOLLOWUP_DELAY_MS);

    if (!resetTimerRef.current) {
      resetTimerRef.current = setTimeout(() => {
        confettiInstance.reset();
        resetTimerRef.current = null;
      }, RESET_DELAY_MS);
    }
  }, [getInstance, player1Color, player2Color]);

  useEffect(() => {
    return () => {
      if (followupTimerRef.current) {
        clearTimeout(followupTimerRef.current);
      }

      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
      }

      confettiInstanceRef.current?.reset();
    };
  }, []);

  return { fireConfetti };
}

'use client';

import { useCallback, useRef } from 'react';

export function useGameSounds() {
  const audioCache = useRef<Map<string, HTMLAudioElement>>(new Map());

  const play = useCallback((sound: string) => {
    const path = `/sounds/${sound}.mp3`;
    let audio = audioCache.current.get(path);
    if (!audio) {
      audio = new Audio(path);
      audioCache.current.set(path, audio);
    }
    audio.currentTime = 0;
    audio.play().catch(() => {});
  }, []);

  return { play };
}

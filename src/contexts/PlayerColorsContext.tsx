'use client';

import { createContext, useContext } from 'react';
import { usePlayerColors } from '@/hooks/usePlayerColors';

interface PlayerColorsContextValue {
  player1Color: string;
  player2Color: string;
  loading: boolean;
  updateMyColor: (color: string) => Promise<void>;
}

const PlayerColorsContext = createContext<PlayerColorsContextValue | null>(null);

export function PlayerColorsProvider({ children }: { children: React.ReactNode }) {
  const colors = usePlayerColors();

  return (
    <PlayerColorsContext.Provider value={colors}>
      <div
        style={{
          '--color-player1': colors.player1Color,
          '--color-player2': colors.player2Color,
        } as React.CSSProperties}
      >
        {children}
      </div>
    </PlayerColorsContext.Provider>
  );
}

export function useColors(): PlayerColorsContextValue {
  const context = useContext(PlayerColorsContext);
  if (!context) {
    throw new Error('useColors must be used within a PlayerColorsProvider');
  }
  return context;
}

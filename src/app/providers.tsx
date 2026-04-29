'use client';

import { PlayerColorsProvider } from '@/contexts/PlayerColorsContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return <PlayerColorsProvider>{children}</PlayerColorsProvider>;
}

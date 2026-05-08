'use client';

import { PlayerColorsProvider } from '@/contexts/PlayerColorsContext';
import { ChatWidget } from '@/components/chat/ChatWidget';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PlayerColorsProvider>
      {children}
      <ChatWidget />
    </PlayerColorsProvider>
  );
}

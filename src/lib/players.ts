export type PlayerName = 'Ricky' | 'Lilian';

export const PLAYER_IDS: Record<PlayerName, string> = {
  Ricky: '00000000-0000-0000-0000-000000000001',
  Lilian: '00000000-0000-0000-0000-000000000002',
};

export function getStoredPlayerName(): PlayerName | null {
  const stored =
    sessionStorage.getItem('player-name') ||
    localStorage.getItem('player-name');
  if (stored === 'Ricky' || stored === 'Lilian') return stored;
  return null;
}

'use client';

export function getPlayerId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem('player-id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('player-id', id);
  }
  return id;
}

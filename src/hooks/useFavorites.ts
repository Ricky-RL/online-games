'use client';

import { useState, useEffect, useCallback } from 'react';
import { type PlayerName, PLAYER_IDS } from '@/lib/players';

function getCacheKey(playerName: PlayerName) {
  return `favorite-games-${playerName}`;
}

export function useFavorites(playerName: PlayerName) {
  const [favorites, setFavorites] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    const cached = localStorage.getItem(getCacheKey(playerName));
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        return [];
      }
    }
    return [];
  });

  useEffect(() => {
    let cancelled = false;

    async function fetchFavorites() {
      const { supabase } = await import('@/lib/supabase');
      const playerId = PLAYER_IDS[playerName];

      const { data, error } = await supabase
        .from('player_preferences')
        .select('favorite_games')
        .eq('player_id', playerId)
        .single();

      if (cancelled) return;

      if (!error && data?.favorite_games) {
        setFavorites(data.favorite_games);
        localStorage.setItem(getCacheKey(playerName), JSON.stringify(data.favorite_games));
      }
    }

    fetchFavorites();
    return () => { cancelled = true; };
  }, [playerName]);

  const toggleFavorite = useCallback(async (slug: string) => {
    setFavorites((prev) => {
      const next = prev.includes(slug)
        ? prev.filter((s) => s !== slug)
        : [...prev, slug];
      localStorage.setItem(getCacheKey(playerName), JSON.stringify(next));

      // Fire-and-forget Supabase sync
      (async () => {
        const { supabase } = await import('@/lib/supabase');
        const playerId = PLAYER_IDS[playerName];

        const { error } = await supabase
          .from('player_preferences')
          .update({
            favorite_games: next,
            updated_at: new Date().toISOString(),
          })
          .eq('player_id', playerId);

        if (error) {
          console.error('Failed to save favorite games:', error);
        }
      })();

      return next;
    });
  }, [playerName]);

  const isFavorite = useCallback((slug: string) => {
    return favorites.includes(slug);
  }, [favorites]);

  return { favorites, toggleFavorite, isFavorite };
}

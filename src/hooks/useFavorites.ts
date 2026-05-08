'use client';

import { useState, useEffect, useCallback } from 'react';
import { PLAYER_IDS } from '@/lib/players';

function getCacheKey(playerId: string) {
  return `favorite-games-${playerId}`;
}

export function useFavorites(playerName: string, explicitPlayerId?: string) {
  const playerId = explicitPlayerId ?? PLAYER_IDS[playerName];
  const [favorites, setFavorites] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    const cached = localStorage.getItem(getCacheKey(playerId));
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

      const { data, error } = await supabase
        .from('player_preferences')
        .select('favorite_games')
        .eq('player_id', playerId)
        .single();

      if (cancelled) return;

      if (!error && data?.favorite_games) {
        setFavorites(data.favorite_games);
        localStorage.setItem(getCacheKey(playerId), JSON.stringify(data.favorite_games));
      }
    }

    fetchFavorites();
    return () => { cancelled = true; };
  }, [playerId]);

  const toggleFavorite = useCallback(async (slug: string) => {
    setFavorites((prev) => {
      const next = prev.includes(slug)
        ? prev.filter((s) => s !== slug)
        : [...prev, slug];
      localStorage.setItem(getCacheKey(playerId), JSON.stringify(next));

      // Fire-and-forget Supabase sync
      (async () => {
        const { supabase } = await import('@/lib/supabase');

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
  }, [playerId]);

  const isFavorite = useCallback((slug: string) => {
    return favorites.includes(slug);
  }, [favorites]);

  return { favorites, toggleFavorite, isFavorite };
}

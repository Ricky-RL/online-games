'use client';

import { useState, useEffect, useCallback } from 'react';
import { type PlayerName, PLAYER_IDS } from '@/lib/players';
import { DEFAULT_SLUG_ORDER } from '@/lib/game-registry';

function getCacheKey(playerName: PlayerName) {
  return `game-order-${playerName}`;
}

function mergeWithDefaults(saved: string[]): string[] {
  const ordered = saved.filter((slug) => DEFAULT_SLUG_ORDER.includes(slug));
  const missing = DEFAULT_SLUG_ORDER.filter((slug) => !saved.includes(slug));
  return [...ordered, ...missing];
}

export function useGameOrder(playerName: PlayerName) {
  const [order, setOrder] = useState<string[]>(() => {
    if (typeof window === 'undefined') return DEFAULT_SLUG_ORDER;
    const cached = localStorage.getItem(getCacheKey(playerName));
    if (cached) {
      try {
        return mergeWithDefaults(JSON.parse(cached));
      } catch {
        return DEFAULT_SLUG_ORDER;
      }
    }
    return DEFAULT_SLUG_ORDER;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchOrder() {
      const { supabase } = await import('@/lib/supabase');
      const playerId = PLAYER_IDS[playerName];

      const { data, error } = await supabase
        .from('player_preferences')
        .select('game_order')
        .eq('player_id', playerId)
        .single();

      if (cancelled) return;

      if (!error && data?.game_order) {
        const merged = mergeWithDefaults(data.game_order);
        setOrder(merged);
        localStorage.setItem(getCacheKey(playerName), JSON.stringify(merged));
      }
      setLoading(false);
    }

    fetchOrder();
    return () => { cancelled = true; };
  }, [playerName]);

  const saveOrder = useCallback(async (newOrder: string[]) => {
    const merged = mergeWithDefaults(newOrder);
    setOrder(merged);
    localStorage.setItem(getCacheKey(playerName), JSON.stringify(merged));

    const { supabase } = await import('@/lib/supabase');
    const playerId = PLAYER_IDS[playerName];

    const { error } = await supabase
      .from('player_preferences')
      .update({
        game_order: merged,
        updated_at: new Date().toISOString(),
      })
      .eq('player_id', playerId);

    if (error) {
      console.error('Failed to save game order:', error);
    }
  }, [playerName]);

  const resetOrder = useCallback(async () => {
    setOrder(DEFAULT_SLUG_ORDER);
    localStorage.removeItem(getCacheKey(playerName));

    const { supabase } = await import('@/lib/supabase');
    const playerId = PLAYER_IDS[playerName];

    const { error } = await supabase
      .from('player_preferences')
      .update({
        game_order: null,
        updated_at: new Date().toISOString(),
      })
      .eq('player_id', playerId);

    if (error) {
      console.error('Failed to reset game order:', error);
    }
  }, [playerName]);

  return { order, loading, saveOrder, resetOrder };
}

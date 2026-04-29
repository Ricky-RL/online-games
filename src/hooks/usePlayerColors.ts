'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';

const PLAYER1_ID = '00000000-0000-0000-0000-000000000001';
const PLAYER2_ID = '00000000-0000-0000-0000-000000000002';

const DEFAULT_PLAYER1_COLOR = '#E63946';
const DEFAULT_PLAYER2_COLOR = '#FFBE0B';

const POLL_INTERVAL_MS = 5000;

interface UsePlayerColorsReturn {
  player1Color: string;
  player2Color: string;
  loading: boolean;
  updateMyColor: (color: string) => Promise<void>;
}

function getMyName(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('player-name') || localStorage.getItem('player-name');
}

export function usePlayerColors(): UsePlayerColorsReturn {
  const [player1Color, setPlayer1Color] = useState(DEFAULT_PLAYER1_COLOR);
  const [player2Color, setPlayer2Color] = useState(DEFAULT_PLAYER2_COLOR);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  const fetchColors = useCallback(async () => {
    const { data } = await supabase
      .from('player_preferences')
      .select('player_id, color')
      .in('player_id', [PLAYER1_ID, PLAYER2_ID]);

    if (!data || !mountedRef.current) return;

    for (const row of data) {
      if (row.player_id === PLAYER1_ID) setPlayer1Color(row.color);
      if (row.player_id === PLAYER2_ID) setPlayer2Color(row.color);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    mountedRef.current = true;
    async function init() {
      await fetchColors();
      if (mountedRef.current) setLoading(false);
    }
    init();
    return () => { mountedRef.current = false; };
  }, [fetchColors]);

  // Poll for changes
  useEffect(() => {
    const interval = setInterval(fetchColors, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchColors]);

  const updateMyColor = useCallback(async (color: string) => {
    const myName = getMyName();
    if (!myName) return;

    const isRicky = myName.toLowerCase() === 'ricky';
    const playerId = isRicky ? PLAYER1_ID : PLAYER2_ID;

    // Optimistic update
    if (isRicky) {
      setPlayer1Color(color);
    } else {
      setPlayer2Color(color);
    }

    await supabase
      .from('player_preferences')
      .upsert({
        player_id: playerId,
        player_name: myName,
        color,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'player_id' });
  }, []);

  return { player1Color, player2Color, loading, updateMyColor };
}

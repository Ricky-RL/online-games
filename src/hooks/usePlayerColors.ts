'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { getStoredUser, RICKY_ID, LILIAN_ID } from '@/lib/players';

const DEFAULT_PLAYER1_COLOR = '#E63946';
const DEFAULT_PLAYER2_COLOR = '#FFBE0B';
const POLL_INTERVAL_MS = 5000;

interface UsePlayerColorsReturn {
  player1Color: string;
  player2Color: string;
  myColor: string;
  opponentColor: string;
  loading: boolean;
  updateMyColor: (color: string) => Promise<void>;
}

type GameSlotIds = {
  player1Id: string | null;
  player2Id: string | null;
};

export function usePlayerColors(): UsePlayerColorsReturn {
  const pathname = usePathname();
  const [player1Color, setPlayer1Color] = useState(DEFAULT_PLAYER1_COLOR);
  const [player2Color, setPlayer2Color] = useState(DEFAULT_PLAYER2_COLOR);
  const [myColor, setMyColor] = useState(DEFAULT_PLAYER1_COLOR);
  const [opponentColor, setOpponentColor] = useState(DEFAULT_PLAYER2_COLOR);
  const [slotIds, setSlotIds] = useState<GameSlotIds>({ player1Id: null, player2Id: null });
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  const fetchColors = useCallback(async () => {
    const user = getStoredUser();
    const myId = user?.id ?? RICKY_ID;
    const opponentId = user?.boundUserId ?? LILIAN_ID;
    const { supabase } = await import('@/lib/supabase');
    const [, slug, gameId] = pathname.match(/^\/([^/]+)\/([^/]+)/) ?? [];
    const table = slug === 'wordle' ? 'wordle_games' : 'games';
    let gameSlotIds: GameSlotIds = { player1Id: myId, player2Id: opponentId };

    if (gameId && slug !== 'whiteboard') {
      const { data: game } = await supabase
        .from(table)
        .select('player1_id, player2_id')
        .eq('id', gameId)
        .maybeSingle();

      if (game) {
        gameSlotIds = {
          player1Id: game.player1_id ?? myId,
          player2Id: game.player2_id ?? opponentId,
        };
      }
    }

    const preferenceIds = Array.from(new Set([
      gameSlotIds.player1Id,
      gameSlotIds.player2Id,
      myId,
      opponentId,
    ].filter(Boolean))) as string[];

    const { data } = await supabase
      .from('player_preferences')
      .select('player_id, color')
      .in('player_id', preferenceIds);

    if (!data || !mountedRef.current) return;

    const slot1 = data.find((row) => row.player_id === gameSlotIds.player1Id)?.color;
    const slot2 = data.find((row) => row.player_id === gameSlotIds.player2Id)?.color;
    const mine = data.find((row) => row.player_id === myId)?.color;
    const theirs = data.find((row) => row.player_id === opponentId)?.color;
    setSlotIds(gameSlotIds);
    setPlayer1Color(slot1 ?? DEFAULT_PLAYER1_COLOR);
    setPlayer2Color(slot2 ?? DEFAULT_PLAYER2_COLOR);
    setMyColor(mine ?? DEFAULT_PLAYER1_COLOR);
    setOpponentColor(theirs ?? DEFAULT_PLAYER2_COLOR);
  }, [pathname]);

  useEffect(() => {
    mountedRef.current = true;
    async function init() {
      await fetchColors();
      if (mountedRef.current) setLoading(false);
    }
    init();
    return () => { mountedRef.current = false; };
  }, [fetchColors]);

  useEffect(() => {
    const interval = setInterval(fetchColors, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchColors]);

  const updateMyColor = useCallback(async (color: string) => {
    const user = getStoredUser();
    if (!user) return;
    const { supabase } = await import('@/lib/supabase');

    setMyColor(color);
    if (slotIds.player1Id === user.id) setPlayer1Color(color);
    if (slotIds.player2Id === user.id) setPlayer2Color(color);
    if (slotIds.player1Id !== user.id && slotIds.player2Id !== user.id) setPlayer1Color(color);
    await supabase
      .from('player_preferences')
      .upsert({
        player_id: user.id,
        player_name: user.name,
        color,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'player_id' });
  }, [slotIds]);

  return { player1Color, player2Color, myColor, opponentColor, loading, updateMyColor };
}

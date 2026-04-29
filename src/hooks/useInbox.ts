'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { InboxGame, WhiteboardActivityItem, UseInboxReturn } from '@/lib/inbox-types';

const POLL_INTERVAL_MS = 5000;

function getMyName(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('player-name') || localStorage.getItem('player-name');
}

function getOtherPlayer(myName: string): string {
  return myName === 'Ricky' ? 'Lilian' : 'Ricky';
}

export function useInbox(): UseInboxReturn {
  const [games, setGames] = useState<InboxGame[]>([]);
  const [gamesLoading, setGamesLoading] = useState(true);
  const [whiteboardActivity, setWhiteboardActivity] = useState<WhiteboardActivityItem[]>([]);
  const [whiteboardLoading, setWhiteboardLoading] = useState(true);
  const [unreadGamesCount, setUnreadGamesCount] = useState(0);
  const [unreadWhiteboardCount, setUnreadWhiteboardCount] = useState(0);
  const mountedRef = useRef(true);

  const fetchInbox = useCallback(async () => {
    const playerName = getMyName();
    if (!playerName) return null;

    const otherPlayer = getOtherPlayer(playerName);

    const [gamesResult, activityResult, readStateResult] = await Promise.all([
      supabase
        .from('games')
        .select('id, game_type, current_turn, player1_name, player2_name, updated_at')
        .or(`player1_name.eq.${playerName},player2_name.eq.${playerName}`)
        .is('winner', null)
        .neq('game_type', 'ended')
        .order('updated_at', { ascending: false }),
      supabase
        .from('whiteboard_activity')
        .select('*')
        .eq('actor_name', otherPlayer)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('inbox_read_state')
        .select('section, last_read_at')
        .eq('player_name', playerName),
    ]);

    if (gamesResult.error || activityResult.error || readStateResult.error) {
      return null;
    }

    const readStates = readStateResult.data ?? [];
    const gamesLastReadAt = readStates.find((r) => r.section === 'games')?.last_read_at ?? '1970-01-01T00:00:00Z';
    const whiteboardLastReadAt = readStates.find((r) => r.section === 'whiteboard')?.last_read_at ?? '1970-01-01T00:00:00Z';

    const enrichedGames: InboxGame[] = (gamesResult.data ?? []).map((game) => {
      const isMyTurn =
        (game.player1_name === playerName && game.current_turn === 1) ||
        (game.player2_name === playerName && game.current_turn === 2);
      const isWaitingForOpponent = game.player1_name === null || game.player2_name === null;

      return {
        id: game.id,
        game_type: game.game_type,
        current_turn: game.current_turn,
        player1_name: game.player1_name,
        player2_name: game.player2_name,
        updated_at: game.updated_at,
        isMyTurn,
        isWaitingForOpponent,
      };
    });

    const enrichedActivity: WhiteboardActivityItem[] = (activityResult.data ?? []).map((item) => ({
      id: item.id,
      note_id: item.note_id,
      action: item.action,
      actor_name: item.actor_name,
      note_preview: item.note_preview,
      note_color: item.note_color,
      created_at: item.created_at,
      isUnread: new Date(item.created_at) > new Date(whiteboardLastReadAt),
    }));

    const unreadGames = enrichedGames.filter(
      (game) => new Date(game.updated_at) > new Date(gamesLastReadAt) && game.isMyTurn
    ).length;

    const unreadWhiteboard = enrichedActivity.filter((item) => item.isUnread).length;

    return {
      games: enrichedGames,
      activity: enrichedActivity,
      unreadGames,
      unreadWhiteboard,
    };
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    async function poll() {
      const result = await fetchInbox();
      if (!mountedRef.current) return;
      if (result) {
        setGames(result.games);
        setWhiteboardActivity(result.activity);
        setUnreadGamesCount(result.unreadGames);
        setUnreadWhiteboardCount(result.unreadWhiteboard);
      }
      setGamesLoading(false);
      setWhiteboardLoading(false);
    }

    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [fetchInbox]);

  const markGamesRead = useCallback(async () => {
    const playerName = getMyName();
    if (!playerName) return;

    await supabase
      .from('inbox_read_state')
      .upsert(
        { player_name: playerName, section: 'games', last_read_at: new Date().toISOString() },
        { onConflict: 'player_name,section' }
      );

    setUnreadGamesCount(0);
  }, []);

  const markWhiteboardRead = useCallback(async () => {
    const playerName = getMyName();
    if (!playerName) return;

    await supabase
      .from('inbox_read_state')
      .upsert(
        { player_name: playerName, section: 'whiteboard', last_read_at: new Date().toISOString() },
        { onConflict: 'player_name,section' }
      );

    setUnreadWhiteboardCount(0);
    setWhiteboardActivity((prev) => prev.map((item) => ({ ...item, isUnread: false })));
  }, []);

  return {
    games,
    gamesLoading,
    whiteboardActivity,
    whiteboardLoading,
    unreadGamesCount,
    unreadWhiteboardCount,
    markGamesRead,
    markWhiteboardRead,
  };
}

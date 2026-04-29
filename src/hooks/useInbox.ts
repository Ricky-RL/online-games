'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { InboxGame, InboxGameType, WhiteboardActivityItem, UseInboxReturn } from '@/lib/inbox-types';

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

    const [gamesResult, activityResult, readStateResult, dismissedResult] = await Promise.all([
      // Fetch games where I'm already a participant OR where the other player
      // started a game and my slot is empty (waiting for me to join)
      supabase
        .from('games')
        .select('id, game_type, current_turn, player1_name, player2_name, updated_at')
        .in('game_type', ['connect-four', 'tic-tac-toe', 'checkers', 'battleship', 'mini-golf', 'jenga'])
        .or(`player1_name.eq.${playerName},player2_name.eq.${playerName},and(player1_name.eq.${otherPlayer},player2_name.is.null),and(player2_name.eq.${otherPlayer},player1_name.is.null)`)
        .is('winner', null)
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
      supabase
        .from('inbox_dismissed_items')
        .select('item_type, item_id')
        .eq('player_name', playerName),
    ]);

    if (gamesResult.error || activityResult.error || readStateResult.error || dismissedResult.error) {
      return null;
    }

    const dismissedItems = dismissedResult.data ?? [];
    const dismissedGameIds = new Set(dismissedItems.filter((d) => d.item_type === 'game').map((d) => d.item_id));
    const dismissedWhiteboardIds = new Set(dismissedItems.filter((d) => d.item_type === 'whiteboard').map((d) => d.item_id));

    const readStates = readStateResult.data ?? [];
    const gamesLastReadAt = readStates.find((r) => r.section === 'games')?.last_read_at ?? '1970-01-01T00:00:00Z';
    const whiteboardLastReadAt = readStates.find((r) => r.section === 'whiteboard')?.last_read_at ?? '1970-01-01T00:00:00Z';

    const enrichedGames: InboxGame[] = (gamesResult.data ?? []).filter((game) => !dismissedGameIds.has(game.id)).map((game) => {
      const iAmPlayer1 = game.player1_name === playerName;
      const iAmPlayer2 = game.player2_name === playerName;
      const iAmInGame = iAmPlayer1 || iAmPlayer2;

      // Game is waiting for me to join (opponent created it, my slot is null)
      const isWaitingForMe = !iAmInGame && (
        (game.player1_name === otherPlayer && game.player2_name === null) ||
        (game.player2_name === otherPlayer && game.player1_name === null)
      );

      // Game is waiting for opponent to join (I created it, their slot is null)
      const isWaitingForOpponent = iAmInGame && (game.player1_name === null || game.player2_name === null);

      // It's my turn if I'm in the game and current_turn points to my player number,
      // OR if the game is waiting for me to join (I need to take action)
      const isMyTurn = isWaitingForMe ||
        (iAmPlayer1 && game.current_turn === 1) ||
        (iAmPlayer2 && game.current_turn === 2);

      return {
        id: game.id,
        game_type: game.game_type as InboxGameType,
        current_turn: game.current_turn,
        player1_name: game.player1_name,
        player2_name: game.player2_name,
        updated_at: game.updated_at,
        isMyTurn,
        isWaitingForOpponent,
      };
    });

    const enrichedActivity: WhiteboardActivityItem[] = (activityResult.data ?? []).filter((item) => !dismissedWhiteboardIds.has(item.id)).map((item) => ({
      id: item.id,
      note_id: item.note_id,
      action: item.action,
      actor_name: item.actor_name,
      note_preview: item.note_preview,
      note_color: item.note_color,
      created_at: item.created_at,
      isUnread: new Date(item.created_at) > new Date(whiteboardLastReadAt),
    }));

    // Combine games and whiteboard activity, sort by date, limit to 3 most recent
    const combined: Array<{ type: 'game'; item: InboxGame; date: string } | { type: 'whiteboard'; item: WhiteboardActivityItem; date: string }> = [
      ...enrichedGames.map((g) => ({ type: 'game' as const, item: g, date: g.updated_at })),
      ...enrichedActivity.map((a) => ({ type: 'whiteboard' as const, item: a, date: a.created_at })),
    ];
    combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const top3 = combined.slice(0, 3);

    const limitedGames = top3.filter((x) => x.type === 'game').map((x) => x.item) as InboxGame[];
    const limitedActivity = top3.filter((x) => x.type === 'whiteboard').map((x) => x.item) as WhiteboardActivityItem[];

    const unreadGames = limitedGames.filter(
      (game) => new Date(game.updated_at) > new Date(gamesLastReadAt) && game.isMyTurn
    ).length;

    const unreadWhiteboard = limitedActivity.filter((item) => item.isUnread).length;

    return {
      games: limitedGames,
      activity: limitedActivity,
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

  const dismissItem = useCallback(async (itemType: 'game' | 'whiteboard', itemId: string) => {
    const playerName = getMyName();
    if (!playerName) return;

    await supabase
      .from('inbox_dismissed_items')
      .upsert(
        { player_name: playerName, item_type: itemType, item_id: itemId },
        { onConflict: 'player_name,item_type,item_id' }
      );

    // Optimistically remove from local state
    if (itemType === 'game') {
      setGames((prev) => prev.filter((g) => g.id !== itemId));
    } else {
      setWhiteboardActivity((prev) => prev.filter((a) => a.id !== itemId));
    }
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
    dismissItem,
  };
}

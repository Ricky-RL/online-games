'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { InboxGame, InboxGameType, WhiteboardActivityItem, UseInboxReturn } from '@/lib/inbox-types';

const POLL_INTERVAL_MS = 5000;

const PLAYER_IDS: Record<string, string> = {
  Ricky: '00000000-0000-0000-0000-000000000001',
  Lilian: '00000000-0000-0000-0000-000000000002',
};

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
        .select('*')
        .in('game_type', ['connect-four', 'tic-tac-toe', 'checkers', 'battleship', 'mini-golf', 'jenga', 'snakes-and-ladders', 'word-search', 'monopoly'])
        .or(`player1_name.eq.${playerName},player2_name.eq.${playerName},player1_id.eq.${PLAYER_IDS[playerName]},player2_id.eq.${PLAYER_IDS[playerName]},and(player1_name.eq.${otherPlayer},player2_name.is.null),and(player2_name.eq.${otherPlayer},player1_name.is.null),and(player1_id.eq.${PLAYER_IDS[otherPlayer]},player2_id.is.null),and(player2_id.eq.${PLAYER_IDS[otherPlayer]},player1_id.is.null)`)
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
      // Resolve player names: if a player ID is set but name is null, resolve from known IDs
      const resolvedPlayer1Name = game.player1_name ?? (game.player1_id === PLAYER_IDS.Ricky ? 'Ricky' : game.player1_id === PLAYER_IDS.Lilian ? 'Lilian' : null);
      const resolvedPlayer2Name = game.player2_name ?? (game.player2_id === PLAYER_IDS.Ricky ? 'Ricky' : game.player2_id === PLAYER_IDS.Lilian ? 'Lilian' : null);

      const iAmPlayer1 = resolvedPlayer1Name === playerName || game.player1_id === PLAYER_IDS[playerName];
      const iAmPlayer2 = resolvedPlayer2Name === playerName || game.player2_id === PLAYER_IDS[playerName];
      const iAmInGame = iAmPlayer1 || iAmPlayer2;

      // Game is waiting for me to join (opponent created it, my slot is null)
      const opponentInSlot1 = resolvedPlayer1Name === otherPlayer || game.player1_id === PLAYER_IDS[otherPlayer];
      const opponentInSlot2 = resolvedPlayer2Name === otherPlayer || game.player2_id === PLAYER_IDS[otherPlayer];
      const isWaitingForMe = !iAmInGame && (
        (opponentInSlot1 && game.player2_id === null) ||
        (opponentInSlot2 && game.player1_id === null)
      );

      // Game is waiting for opponent to join (I created it, their slot is empty)
      const isWaitingForOpponent = iAmInGame && (
        (iAmPlayer1 && game.player2_id === null) ||
        (iAmPlayer2 && game.player1_id === null)
      );

      // It's my turn if I'm in the game and current_turn points to my player number,
      // OR if the game is waiting for me to join (I need to take action)
      const isMyTurn = isWaitingForMe ||
        (iAmPlayer1 && game.current_turn === 1) ||
        (iAmPlayer2 && game.current_turn === 2);

      return {
        id: game.id,
        game_type: game.game_type as InboxGameType,
        current_turn: game.current_turn,
        player1_name: resolvedPlayer1Name,
        player2_name: resolvedPlayer2Name,
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

    // Filter out games waiting for opponent — they're not actionable in the inbox
    const actionableGames = enrichedGames.filter((g) => !g.isWaitingForOpponent);

    // Combine games and whiteboard activity, sort by priority then date, limit to 3
    const combined: Array<{ type: 'game'; item: InboxGame; date: string; priority: number } | { type: 'whiteboard'; item: WhiteboardActivityItem; date: string; priority: number }> = [
      ...actionableGames.map((g) => ({ type: 'game' as const, item: g, date: g.updated_at, priority: g.isMyTurn ? 2 : 1 })),
      ...enrichedActivity.map((a) => ({ type: 'whiteboard' as const, item: a, date: a.created_at, priority: 1 })),
    ];
    combined.sort((a, b) => b.priority - a.priority || new Date(b.date).getTime() - new Date(a.date).getTime());
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

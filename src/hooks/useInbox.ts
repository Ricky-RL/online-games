'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { COOPERATIVE_GAMES, DEFAULT_GAME_ORDER } from '@/lib/game-registry';
import { getStoredUser } from '@/lib/players';
import type { InboxGame, InboxGameType, WhiteboardActivityItem, UseInboxReturn } from '@/lib/inbox-types';

const POLL_INTERVAL_MS = 5000;
const INBOX_GAME_TYPES = DEFAULT_GAME_ORDER
  .map((game) => game.slug)
  .filter((slug) => slug !== 'whiteboard' && slug !== 'wordle');

type GameRow = {
  id: string;
  game_type: string;
  current_turn: 0 | 1 | 2;
  player1_id: string | null;
  player2_id: string | null;
  player1_name: string | null;
  player2_name: string | null;
  updated_at: string;
};

type WordleRow = GameRow & { guesses?: Array<{ player: number }> };

function slotMatches(id: string | null, name: string | null, userId: string | null, userName: string | null) {
  return (!!userId && id === userId) || (!!userName && name === userName);
}

function isPairGame(game: GameRow, userId: string, userName: string, boundUserId: string, boundUserName: string | null) {
  const meInGame = slotMatches(game.player1_id, game.player1_name, userId, userName) ||
    slotMatches(game.player2_id, game.player2_name, userId, userName);
  const boundInGame = slotMatches(game.player1_id, game.player1_name, boundUserId, boundUserName) ||
    slotMatches(game.player2_id, game.player2_name, boundUserId, boundUserName);
  const waitingForMe = !meInGame && (
    (slotMatches(game.player1_id, game.player1_name, boundUserId, boundUserName) && game.player2_id === null && game.player2_name === null) ||
    (slotMatches(game.player2_id, game.player2_name, boundUserId, boundUserName) && game.player1_id === null && game.player1_name === null)
  );
  const waitingForOpponent = meInGame && !boundInGame && (
    (slotMatches(game.player1_id, game.player1_name, userId, userName) && game.player2_id === null && game.player2_name === null) ||
    (slotMatches(game.player2_id, game.player2_name, userId, userName) && game.player1_id === null && game.player1_name === null)
  );
  return (meInGame && boundInGame) || waitingForMe || waitingForOpponent;
}

function enrichGame(game: GameRow, userId: string, userName: string, boundUserId: string, boundUserName: string | null): InboxGame {
  const iAmPlayer1 = slotMatches(game.player1_id, game.player1_name, userId, userName);
  const iAmPlayer2 = slotMatches(game.player2_id, game.player2_name, userId, userName);
  const iAmInGame = iAmPlayer1 || iAmPlayer2;
  const opponentInSlot1 = slotMatches(game.player1_id, game.player1_name, boundUserId, boundUserName);
  const opponentInSlot2 = slotMatches(game.player2_id, game.player2_name, boundUserId, boundUserName);
  const isWaitingForMe = !iAmInGame && (
    (opponentInSlot1 && game.player2_id === null && game.player2_name === null) ||
    (opponentInSlot2 && game.player1_id === null && game.player1_name === null)
  );
  const isWaitingForOpponent = iAmInGame && (
    (iAmPlayer1 && game.player2_id === null && game.player2_name === null) ||
    (iAmPlayer2 && game.player1_id === null && game.player1_name === null)
  );
  const isCooperative = COOPERATIVE_GAMES.has(game.game_type);
  const isMyTurn = isWaitingForMe ||
    (isCooperative && iAmInGame) ||
    (iAmInGame && game.current_turn === 0) ||
    (!isCooperative && iAmPlayer1 && game.current_turn === 1) ||
    (!isCooperative && iAmPlayer2 && game.current_turn === 2);

  return {
    id: game.id,
    game_type: game.game_type as InboxGameType,
    current_turn: game.current_turn,
    player1_id: game.player1_id,
    player2_id: game.player2_id,
    player1_name: game.player1_name,
    player2_name: game.player2_name,
    updated_at: game.updated_at,
    isMyTurn,
    isWaitingForOpponent,
    isCooperative,
  };
}

function enrichWordle(game: WordleRow, userId: string, userName: string, boundUserId: string, boundUserName: string | null): InboxGame {
  const base = enrichGame({ ...game, game_type: 'daily-wordle', current_turn: 1 }, userId, userName, boundUserId, boundUserName);
  const iAmPlayer1 = slotMatches(game.player1_id, game.player1_name, userId, userName);
  const iAmPlayer2 = slotMatches(game.player2_id, game.player2_name, userId, userName);
  const iAmInGame = iAmPlayer1 || iAmPlayer2;
  const opponentInSlot1 = slotMatches(game.player1_id, game.player1_name, boundUserId, boundUserName);
  const opponentInSlot2 = slotMatches(game.player2_id, game.player2_name, boundUserId, boundUserName);
  const isWaitingForMe = !iAmInGame && (
    (opponentInSlot1 && game.player2_id === null && game.player2_name === null) ||
    (opponentInSlot2 && game.player1_id === null && game.player1_name === null)
  );
  const myPlayerNum = iAmPlayer1 ? 1 : iAmPlayer2 ? 2 : null;
  const guesses = game.guesses ?? [];
  const lastGuessPlayer = guesses.length > 0 ? guesses[guesses.length - 1].player : null;
  return {
    ...base,
    current_turn: (lastGuessPlayer === 1 ? 2 : 1) as 1 | 2,
    isMyTurn: isWaitingForMe || (!base.isWaitingForOpponent && !!myPlayerNum && (lastGuessPlayer === null || lastGuessPlayer !== myPlayerNum)),
  };
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
    const currentUser = getStoredUser();
    if (!currentUser?.boundUserId) return null;
    const { supabase } = await import('@/lib/supabase');
    const pairIdFilter = [
      `player1_id.eq.${currentUser.id}`,
      `player2_id.eq.${currentUser.id}`,
      `player1_id.eq.${currentUser.boundUserId}`,
      `player2_id.eq.${currentUser.boundUserId}`,
    ].join(',');

    const [gamesResult, wordleResult, activityResult, readStateResult, dismissedResult] = await Promise.all([
      supabase
        .from('games')
        .select('*')
        .in('game_type', INBOX_GAME_TYPES)
        .or(pairIdFilter)
        .is('winner', null)
        .order('updated_at', { ascending: false }),
      supabase
        .from('wordle_games')
        .select('*')
        .or(pairIdFilter)
        .in('status', ['waiting', 'playing'])
        .order('updated_at', { ascending: false }),
      supabase
        .from('whiteboard_activity')
        .select('*')
        .eq('actor_user_id', currentUser.boundUserId)
        .order('created_at', { ascending: false }),
      supabase
        .from('inbox_read_state')
        .select('section, last_read_at')
        .eq('user_id', currentUser.id),
      supabase
        .from('inbox_dismissed_items')
        .select('item_type, item_id')
        .eq('user_id', currentUser.id),
    ]);

    if (gamesResult.error || wordleResult.error || activityResult.error || readStateResult.error || dismissedResult.error) return null;

    const dismissedItems = dismissedResult.data ?? [];
    const dismissedGameIds = new Set(dismissedItems.filter((d) => d.item_type === 'game').map((d) => d.item_id));
    const dismissedWhiteboardIds = new Set(dismissedItems.filter((d) => d.item_type === 'whiteboard').map((d) => d.item_id));
    const readStates = readStateResult.data ?? [];
    const gamesLastReadAt = readStates.find((r) => r.section === 'games')?.last_read_at ?? '1970-01-01T00:00:00Z';
    const whiteboardLastReadAt = readStates.find((r) => r.section === 'whiteboard')?.last_read_at ?? '1970-01-01T00:00:00Z';

    const pairArgs = [currentUser.id, currentUser.name, currentUser.boundUserId, currentUser.boundUserName] as const;
    const enrichedGames = ((gamesResult.data ?? []) as GameRow[])
      .filter((game) => !dismissedGameIds.has(game.id) && isPairGame(game, ...pairArgs))
      .map((game) => enrichGame(game, ...pairArgs));
    const enrichedWordleGames = ((wordleResult.data ?? []) as WordleRow[])
      .filter((game) => !dismissedGameIds.has(game.id) && isPairGame(game, ...pairArgs))
      .map((game) => enrichWordle(game, ...pairArgs));
    const enrichedActivity: WhiteboardActivityItem[] = (activityResult.data ?? [])
      .filter((item) => !dismissedWhiteboardIds.has(item.id))
      .filter((item) => item.actor_user_id === currentUser.boundUserId || item.actor_name === currentUser.boundUserName)
      .map((item) => ({
        id: item.id,
        note_id: item.note_id,
        action: item.action,
        actor_name: item.actor_name,
        note_preview: item.note_preview,
        note_color: item.note_color,
        created_at: item.created_at,
        isUnread: new Date(item.created_at) > new Date(whiteboardLastReadAt),
      }));

    const allGames = [...enrichedGames, ...enrichedWordleGames];
    const combined: Array<{ type: 'game'; item: InboxGame; date: string; priority: number } | { type: 'whiteboard'; item: WhiteboardActivityItem; date: string; priority: number }> = [
      ...allGames.map((g) => ({ type: 'game' as const, item: g, date: g.updated_at, priority: g.isWaitingForOpponent ? 0 : g.isMyTurn ? 2 : 1 })),
      ...enrichedActivity.map((a) => ({ type: 'whiteboard' as const, item: a, date: a.created_at, priority: 1 })),
    ];
    combined.sort((a, b) => b.priority - a.priority || new Date(b.date).getTime() - new Date(a.date).getTime());
    const top3 = combined.slice(0, 3);
    const limitedGames = top3.filter((x) => x.type === 'game').map((x) => x.item) as InboxGame[];
    const limitedActivity = top3.filter((x) => x.type === 'whiteboard').map((x) => x.item) as WhiteboardActivityItem[];

    return {
      games: limitedGames,
      activity: limitedActivity,
      unreadGames: limitedGames.filter((game) => new Date(game.updated_at) > new Date(gamesLastReadAt) && game.isMyTurn).length,
      unreadWhiteboard: limitedActivity.filter((item) => item.isUnread).length,
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
    return () => { mountedRef.current = false; clearInterval(interval); };
  }, [fetchInbox]);

  const markGamesRead = useCallback(async () => {
    const currentUser = getStoredUser();
    if (!currentUser) return;
    const { supabase } = await import('@/lib/supabase');
    await supabase.from('inbox_read_state').upsert(
      { user_id: currentUser.id, player_name: currentUser.name, section: 'games', last_read_at: new Date().toISOString() },
      { onConflict: 'user_id,section' }
    );
    setUnreadGamesCount(0);
  }, []);

  const markWhiteboardRead = useCallback(async () => {
    const currentUser = getStoredUser();
    if (!currentUser) return;
    const { supabase } = await import('@/lib/supabase');
    await supabase.from('inbox_read_state').upsert(
      { user_id: currentUser.id, player_name: currentUser.name, section: 'whiteboard', last_read_at: new Date().toISOString() },
      { onConflict: 'user_id,section' }
    );
    setUnreadWhiteboardCount(0);
    setWhiteboardActivity((prev) => prev.map((item) => ({ ...item, isUnread: false })));
  }, []);

  const dismissItem = useCallback(async (itemType: 'game' | 'whiteboard', itemId: string) => {
    const currentUser = getStoredUser();
    if (!currentUser) return;
    const { supabase } = await import('@/lib/supabase');
    await supabase.from('inbox_dismissed_items').upsert(
      { user_id: currentUser.id, player_name: currentUser.name, item_type: itemType, item_id: itemId },
      { onConflict: 'user_id,item_type,item_id' }
    );
    if (itemType === 'game') setGames((prev) => prev.filter((g) => g.id !== itemId));
    else setWhiteboardActivity((prev) => prev.filter((a) => a.id !== itemId));
  }, []);

  return { games, gamesLoading, whiteboardActivity, whiteboardLoading, unreadGamesCount, unreadWhiteboardCount, markGamesRead, markWhiteboardRead, dismissItem };
}

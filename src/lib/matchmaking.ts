'use client';

import type { StoredUser } from '@/lib/players';

export type GameTable = 'games' | 'wordle_games';

interface FindOrCreateOptions<TCreate extends Record<string, unknown>> {
  table?: GameTable;
  gameType: string;
  currentUser: StoredUser;
  createData: () => TCreate | Promise<TCreate>;
  joinData?: (game: MatchmakingRow) => Record<string, unknown> | Promise<Record<string, unknown>>;
  statusFilter?: 'winner' | 'wordle';
  filterGame?: (game: MatchmakingRow) => boolean;
}

type GameRow = {
  id: string;
  player1_id: string | null;
  player2_id: string | null;
  player1_name: string | null;
  player2_name: string | null;
  created_at?: string;
  board?: unknown;
};

export type MatchmakingRow = GameRow & Record<string, unknown>;

function matchesUser(rowId: string | null, rowName: string | null, userId: string, userName: string | null) {
  return rowId === userId || (!!userName && rowName === userName);
}

function isMyGame(game: GameRow, user: StoredUser) {
  if (!user.boundUserId) return false;
  const meInSlot1 = matchesUser(game.player1_id, game.player1_name, user.id, user.name);
  const meInSlot2 = matchesUser(game.player2_id, game.player2_name, user.id, user.name);
  const boundInSlot1 = matchesUser(game.player1_id, game.player1_name, user.boundUserId, user.boundUserName);
  const boundInSlot2 = matchesUser(game.player2_id, game.player2_name, user.boundUserId, user.boundUserName);
  const meWaitingForBound = (meInSlot1 && game.player2_id === null && game.player2_name === null) ||
    (meInSlot2 && game.player1_id === null && game.player1_name === null);
  return (meInSlot1 || meInSlot2) && (boundInSlot1 || boundInSlot2 || meWaitingForBound);
}

function isJoinableFromBoundOpponent(game: GameRow, user: StoredUser) {
  if (!user.boundUserId) return false;
  const boundName = user.boundUserName;
  const opponentInSlot1 = matchesUser(game.player1_id, game.player1_name, user.boundUserId, boundName);
  const opponentInSlot2 = matchesUser(game.player2_id, game.player2_name, user.boundUserId, boundName);

  return (
    (opponentInSlot1 && game.player2_id === null && game.player2_name === null) ||
    (opponentInSlot2 && game.player1_id === null && game.player1_name === null)
  );
}

async function fetchOpenGames(
  table: GameTable,
  gameType: string,
  statusFilter: 'winner' | 'wordle',
  currentUser: StoredUser,
) {
  const { supabase } = await import('@/lib/supabase');
  const userIds = [currentUser.id, currentUser.boundUserId].filter(Boolean);
  const byIdFilter = [
    ...userIds.map((id) => `player1_id.eq.${id}`),
    ...userIds.map((id) => `player2_id.eq.${id}`),
  ].join(',');

  let query = supabase
    .from(table)
    .select('*')
    .eq('game_type', gameType)
    .or(byIdFilter)
    .order('created_at', { ascending: false });

  query = statusFilter === 'wordle'
    ? query.in('status', ['waiting', 'playing'])
    : query.is('winner', null);

  const { data } = await query;
  const rows = (data ?? []) as MatchmakingRow[];
  return rows.sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime());
}

export async function findOrCreateBoundGame<TCreate extends Record<string, unknown>>({
  table = 'games',
  gameType,
  currentUser,
  createData,
  joinData,
  statusFilter = table === 'wordle_games' ? 'wordle' : 'winner',
  filterGame,
}: FindOrCreateOptions<TCreate>): Promise<string | null> {
  async function findGames() {
    const games = await fetchOpenGames(table, gameType, statusFilter, currentUser);
    return filterGame ? games.filter(filterGame) : games;
  }

  async function joinGame(game: MatchmakingRow) {
    const { supabase } = await import('@/lib/supabase');
    if (!currentUser.boundUserId) return null;

    const joiningPlayer1 = game.player1_id === null && game.player1_name === null;
    const updateField = joiningPlayer1
      ? { player1_id: currentUser.id, player1_name: currentUser.name }
      : { player2_id: currentUser.id, player2_name: currentUser.name };

    const extraJoinData = joinData ? await joinData(game) : {};
    let query = supabase
      .from(table)
      .update({
        ...updateField,
        ...extraJoinData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', game.id)
      .eq('game_type', gameType);

    query = statusFilter === 'wordle'
      ? query.in('status', ['waiting', 'playing'])
      : query.is('winner', null);

    query = joiningPlayer1
      ? query.eq('player2_id', currentUser.boundUserId).is('player1_id', null).is('player1_name', null)
      : query.eq('player1_id', currentUser.boundUserId).is('player2_id', null).is('player2_name', null);

    const { data, error } = await query.select('id').maybeSingle();

    return error || !data ? null : game.id;
  }

  for (let attempt = 0; attempt < 2; attempt++) {
    const games = await findGames();
    const activeGame = games.find((game) => isMyGame(game, currentUser));
    if (activeGame) return activeGame.id;

    const joinableGame = games.find((game) => isJoinableFromBoundOpponent(game, currentUser));
    if (joinableGame) return joinGame(joinableGame);

    if (attempt === 0) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  const insertData = await createData();
  const { supabase } = await import('@/lib/supabase');
  const { data, error } = await supabase
    .from(table)
    .insert({
      ...insertData,
      player1_id: currentUser.id,
      player1_name: currentUser.name,
      player2_id: null,
      player2_name: null,
    })
    .select('id')
    .single();

  if (error || !data) {
    console.error(`Error creating ${gameType} game:`, error);
    return null;
  }

  return data.id as string;
}

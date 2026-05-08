export type PlayerName = string;

export interface AppUser {
  id: string;
  name: string;
  bound_user_id: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface BoundAppUser extends AppUser {
  bound_user: AppUser | null;
}

export interface StoredUser {
  id: string;
  name: string;
  boundUserId: string | null;
  boundUserName: string | null;
}

export const RICKY_ID = '00000000-0000-0000-0000-000000000001';
export const LILIAN_ID = '00000000-0000-0000-0000-000000000002';

const LEGACY_PLAYER_IDS: Record<string, string> = {
  Ricky: RICKY_ID,
  Lilian: LILIAN_ID,
};

function safeStorage(kind: 'local' | 'session'): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return kind === 'local' ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

export const PLAYER_IDS = new Proxy(LEGACY_PLAYER_IDS, {
  get(target, prop) {
    if (typeof prop !== 'string') return undefined;
    if (prop in target) return target[prop];

    const stored = getStoredUser();
    if (stored?.name === prop) return stored.id;
    return undefined;
  },
}) as Record<string, string>;

export function getStoredUser(): StoredUser | null {
  const session = safeStorage('session');
  const local = safeStorage('local');

  const id = session?.getItem('current-user-id') || local?.getItem('current-user-id');
  const name =
    session?.getItem('current-user-name') ||
    local?.getItem('current-user-name') ||
    session?.getItem('player-name') ||
    local?.getItem('player-name');
  const boundUserId = session?.getItem('bound-user-id') || local?.getItem('bound-user-id');
  const boundUserName = session?.getItem('bound-user-name') || local?.getItem('bound-user-name');

  if (id && name) {
    return { id, name, boundUserId: boundUserId || null, boundUserName: boundUserName || null };
  }

  if (name && LEGACY_PLAYER_IDS[name]) {
    const legacyBoundName = name === 'Ricky' ? 'Lilian' : 'Ricky';
    return {
      id: LEGACY_PLAYER_IDS[name],
      name,
      boundUserId: LEGACY_PLAYER_IDS[legacyBoundName],
      boundUserName: legacyBoundName,
    };
  }

  return null;
}

export function setStoredUser(user: StoredUser): void {
  const storages = [safeStorage('session'), safeStorage('local')].filter(Boolean) as Storage[];
  for (const storage of storages) {
    storage.setItem('current-user-id', user.id);
    storage.setItem('current-user-name', user.name);
    storage.setItem('player-name', user.name);
    storage.setItem('player-id', user.id);
    if (user.boundUserId) storage.setItem('bound-user-id', user.boundUserId);
    else storage.removeItem('bound-user-id');
    if (user.boundUserName) storage.setItem('bound-user-name', user.boundUserName);
    else storage.removeItem('bound-user-name');
  }
}

export function clearStoredUser(): void {
  const storages = [safeStorage('session'), safeStorage('local')].filter(Boolean) as Storage[];
  for (const storage of storages) {
    storage.removeItem('current-user-id');
    storage.removeItem('current-user-name');
    storage.removeItem('bound-user-id');
    storage.removeItem('bound-user-name');
    storage.removeItem('player-name');
    storage.removeItem('player-id');
  }
}

export function userMatchesSlot(
  slotUserId: string | null | undefined,
  slotUserName: string | null | undefined,
  userId: string | null | undefined,
  userName: string | null | undefined,
) {
  return (!!userId && slotUserId === userId) || (!!userName && slotUserName === userName);
}

export function getStoredUserSlotInfo() {
  const user = getStoredUser();
  return {
    user,
    isCurrentUserSlot: (slotUserId: string | null | undefined, slotUserName: string | null | undefined) =>
      !!user && userMatchesSlot(slotUserId, slotUserName, user.id, user.name),
    isBoundUserSlot: (slotUserId: string | null | undefined, slotUserName: string | null | undefined) =>
      !!user?.boundUserId && userMatchesSlot(slotUserId, slotUserName, user.boundUserId, user.boundUserName),
  };
}

export function getStoredPlayerName(): PlayerName | null {
  return getStoredUser()?.name ?? null;
}

export function getStoredPlayerId(): string | null {
  return getStoredUser()?.id ?? null;
}

export function getStoredBoundUserId(): string | null {
  return getStoredUser()?.boundUserId ?? null;
}

import type { StoredUser } from '@/lib/players';

export interface PairChatMessage {
  id: string;
  pair_key: string;
  sender_user_id: string;
  recipient_user_id: string;
  body: string;
  created_at: string;
}

export function buildPairKey(userId: string, boundUserId: string): string {
  return [userId, boundUserId].sort().join(':');
}

export function canUsePairChat(user: StoredUser | null): user is StoredUser {
  return !!(user?.id && user?.boundUserId);
}

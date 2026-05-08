'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getStoredUser } from '@/lib/players';
import { buildPairKey, canUsePairChat, type PairChatMessage } from '@/lib/pair-chat';

interface UsePairChatReturn {
  loading: boolean;
  error: string | null;
  canChat: boolean;
  myUserId: string | null;
  partnerName: string | null;
  messages: PairChatMessage[];
  unreadCount: number;
  sendMessage: (body: string) => Promise<boolean>;
  markRead: () => Promise<void>;
}

export function usePairChat(): UsePairChatReturn {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canChat, setCanChat] = useState(false);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [partnerName, setPartnerName] = useState<string | null>(null);
  const [messages, setMessages] = useState<PairChatMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const pairKeyRef = useRef<string | null>(null);
  const lastReadAtRef = useRef<string>('1970-01-01T00:00:00.000Z');

  const refresh = useCallback(async () => {
    const user = getStoredUser();
    if (!canUsePairChat(user)) {
      setCanChat(false);
      setMyUserId(null);
      setPartnerName(null);
      setMessages([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    setCanChat(true);
    setMyUserId(user.id);
    setPartnerName(user.boundUserName ?? null);

    const pairKey = buildPairKey(user.id, user.boundUserId);
    pairKeyRef.current = pairKey;

    const [messagesRes, readStateRes] = await Promise.all([
      supabase
        .from('pair_chat_messages')
        .select('*')
        .eq('pair_key', pairKey)
        .order('created_at', { ascending: true }),
      supabase
        .from('inbox_read_state')
        .select('last_read_at')
        .eq('user_id', user.id)
        .eq('section', 'chat')
        .maybeSingle(),
    ]);

    if (messagesRes.error) {
      setError(messagesRes.error.message);
      setLoading(false);
      return;
    }

    if (readStateRes.error) {
      setError(readStateRes.error.message);
      setLoading(false);
      return;
    }

    const loadedMessages = (messagesRes.data ?? []) as PairChatMessage[];
    const lastReadAt = readStateRes.data?.last_read_at ?? '1970-01-01T00:00:00.000Z';
    lastReadAtRef.current = lastReadAt;

    setMessages(loadedMessages);
    setUnreadCount(
      loadedMessages.filter(
        (message) =>
          message.sender_user_id !== user.id &&
          new Date(message.created_at) > new Date(lastReadAt)
      ).length
    );
    setError(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function init() {
      await refresh();
      if (!active) return;

      const user = getStoredUser();
      if (!canUsePairChat(user)) return;
      const pairKey = buildPairKey(user.id, user.boundUserId);
      pairKeyRef.current = pairKey;

      channel = supabase
        .channel(`pair-chat:${pairKey}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'pair_chat_messages',
            filter: `pair_key=eq.${pairKey}`,
          },
          (payload) => {
            const inserted = payload.new as PairChatMessage;
            setMessages((prev) => {
              if (prev.some((message) => message.id === inserted.id)) return prev;
              return [...prev, inserted];
            });

            const currentUser = getStoredUser();
            if (
              currentUser &&
              inserted.sender_user_id !== currentUser.id &&
              new Date(inserted.created_at) > new Date(lastReadAtRef.current)
            ) {
              setUnreadCount((prev) => prev + 1);
            }
          }
        )
        .subscribe();
    }

    void init();

    return () => {
      active = false;
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [refresh]);

  useEffect(() => {
    function handleStorageChange() {
      void refresh();
    }

    function handleFocus() {
      void refresh();
    }

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [refresh]);

  useEffect(() => {
    const interval = setInterval(() => {
      void refresh();
    }, 4000);

    return () => clearInterval(interval);
  }, [refresh]);

  const markRead = useCallback(async () => {
    const user = getStoredUser();
    if (!canUsePairChat(user)) return;

    const now = new Date().toISOString();
    const { error: upsertError } = await supabase.from('inbox_read_state').upsert(
      {
        user_id: user.id,
        player_name: user.name,
        section: 'chat',
        last_read_at: now,
      },
      { onConflict: 'user_id,section' }
    );

    if (upsertError) {
      setError(upsertError.message);
      return;
    }

    lastReadAtRef.current = now;
    setUnreadCount(0);
    setError(null);
  }, []);

  const sendMessage = useCallback(async (body: string) => {
    const trimmed = body.trim();
    if (!trimmed) return false;

    const user = getStoredUser();
    if (!canUsePairChat(user)) return false;
    const pairKey = pairKeyRef.current ?? buildPairKey(user.id, user.boundUserId);
    pairKeyRef.current = pairKey;

    const { error: insertError } = await supabase
      .from('pair_chat_messages')
      .insert({
        pair_key: pairKey,
        sender_user_id: user.id,
        recipient_user_id: user.boundUserId,
        body: trimmed,
      });

    if (insertError) {
      setError(insertError.message);
      return false;
    }

    setError(null);
    return true;
  }, []);

  return useMemo(
    () => ({
      loading,
      error,
      canChat,
      myUserId,
      partnerName,
      messages,
      unreadCount,
      sendMessage,
      markRead,
    }),
    [loading, error, canChat, myUserId, partnerName, messages, unreadCount, sendMessage, markRead]
  );
}

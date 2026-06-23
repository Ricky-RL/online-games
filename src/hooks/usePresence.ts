'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export function usePresence(roomId: string, userId: string | null) {
  const [presentUsers, setPresentUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!roomId) return;

    const channel = supabase.channel(`presence:${roomId}`);

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users = new Set<string>();
        for (const presences of Object.values(state)) {
            for (const presence of presences as any[]) {
                if (presence.userId) {
                    users.add(presence.userId);
                }
            }
        }
        setPresentUsers(users);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && userId) {
          await channel.track({
            userId,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, userId]);

  return presentUsers;
}
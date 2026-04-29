'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

type GameType = 'connect-four' | 'tic-tac-toe' | 'mini-golf';

interface UseNotificationsOptions {
  gameId: string;
  isMyTurn: boolean;
  opponentName: string | null;
  gameType: GameType;
}

interface UseNotificationsReturn {
  permissionState: NotificationPermission | 'unsupported';
  requestPermission: () => Promise<void>;
  isMuted: boolean;
  toggleMute: () => void;
}

export function useNotifications({
  gameId,
  isMyTurn,
  opponentName,
  gameType,
}: UseNotificationsOptions): UseNotificationsReturn {
  const [isMuted, setIsMuted] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('notifications-muted') === 'true';
  });
  const [permissionState, setPermissionState] = useState<NotificationPermission | 'unsupported'>(() => {
    if (typeof window === 'undefined') return 'unsupported';
    if (!('Notification' in window)) return 'unsupported';
    return Notification.permission;
  });

  const prevIsMyTurn = useRef(isMyTurn);
  const flashInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const isFlashing = useRef(false);
  const baseTitleRef = useRef(typeof document !== 'undefined' ? document.title : '');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const tabId = useRef(Math.random().toString(36).slice(2));
  const claimedByOther = useRef(false);
  const channelRef = useRef<BroadcastChannel | null>(null);

  // Preload audio
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const audio = new Audio('/sounds/turn.mp3');
    audio.load();
    audioRef.current = audio;
  }, []);

  // Multi-tab dedup via BroadcastChannel
  useEffect(() => {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return;
    const channel = new BroadcastChannel('game-notifications');
    channelRef.current = channel;
    channel.addEventListener('message', (event: MessageEvent) => {
      const data = event.data;
      if (data?.type === 'notification-claim' && data.gameId === gameId && data.tabId !== tabId.current) {
        claimedByOther.current = true;
        setTimeout(() => { claimedByOther.current = false; }, 5000);
      }
    });
    return () => { channel.close(); channelRef.current = null; };
  }, [gameId]);

  const stopFlashing = useCallback(() => {
    if (flashInterval.current) {
      clearInterval(flashInterval.current);
      flashInterval.current = null;
    }
    if (isFlashing.current && typeof document !== 'undefined') {
      document.title = baseTitleRef.current;
    }
    isFlashing.current = false;
  }, []);

  const startFlashing = useCallback(() => {
    if (isFlashing.current) return;
    isFlashing.current = true;
    baseTitleRef.current = document.title;
    let showAlert = true;

    flashInterval.current = setInterval(() => {
      document.title = showAlert ? '🔴 Your Turn!' : baseTitleRef.current;
      showAlert = !showAlert;
    }, 1000);
  }, []);

  // Trigger notifications when turn transitions to me
  useEffect(() => {
    const becameMyTurn = isMyTurn && !prevIsMyTurn.current;
    prevIsMyTurn.current = isMyTurn;

    if (!becameMyTurn) {
      if (!isMyTurn) stopFlashing();
      return;
    }

    if (!document.hidden) return;

    // Multi-tab dedup
    if (claimedByOther.current) return;
    channelRef.current?.postMessage({ type: 'notification-claim', gameId, tabId: tabId.current });

    // Title flash
    startFlashing();

    // Sound ping
    if (!isMuted && audioRef.current) {
      audioRef.current.currentTime = 0;
      const playResult = audioRef.current.play();
      if (playResult && typeof playResult.catch === 'function') {
        playResult.catch(() => {});
      }
    }

    // Browser notification
    if (!isMuted && 'Notification' in window && Notification.permission === 'granted') {
      const title = opponentName
        ? `${opponentName} played — it's your turn!`
        : "It's your turn!";
      const bodyMap: Record<GameType, string> = {
        'connect-four': 'Connect Four',
        'tic-tac-toe': 'Tic-Tac-Toe',
        'mini-golf': 'Mini Golf',
      };
      const body = bodyMap[gameType];
      const notification = new Notification(title, { body });
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    }
  }, [isMyTurn, isMuted, opponentName, gameType, gameId, startFlashing, stopFlashing]);

  // Stop flashing when tab becomes visible
  useEffect(() => {
    const handleVisibility = () => {
      if (!document.hidden) {
        stopFlashing();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [stopFlashing]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopFlashing();
  }, [stopFlashing]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      localStorage.setItem('notifications-muted', String(next));
      return next;
    });
  }, []);

  const requestPermission = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    const result = await Notification.requestPermission();
    setPermissionState(result);
  }, []);

  return { permissionState, requestPermission, isMuted, toggleMute };
}

// src/hooks/useNotifications.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNotifications } from './useNotifications';

describe('useNotifications', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(document, 'hidden', { value: true, writable: true, configurable: true });
    document.title = 'Connect Four';
  });

  afterEach(() => {
    vi.useRealTimers();
    document.title = '';
  });

  describe('title flash', () => {
    it('flashes title when it becomes my turn and tab is hidden', () => {
      const { rerender } = renderHook(
        (props) => useNotifications(props),
        {
          initialProps: {
            gameId: 'game-1',
            isMyTurn: false,
            opponentName: 'Alice',
            gameType: 'connect-four' as const,
          },
        }
      );

      rerender({
        gameId: 'game-1',
        isMyTurn: true,
        opponentName: 'Alice',
        gameType: 'connect-four' as const,
      });

      act(() => { vi.advanceTimersByTime(1000); });
      expect(document.title).toBe('🔴 Your Turn!');

      act(() => { vi.advanceTimersByTime(1000); });
      expect(document.title).toBe('Connect Four');
    });

    it('does not flash title when tab is visible', () => {
      Object.defineProperty(document, 'hidden', { value: false, writable: true, configurable: true });

      const { rerender } = renderHook(
        (props) => useNotifications(props),
        {
          initialProps: {
            gameId: 'game-1',
            isMyTurn: false,
            opponentName: 'Alice',
            gameType: 'connect-four' as const,
          },
        }
      );

      rerender({
        gameId: 'game-1',
        isMyTurn: true,
        opponentName: 'Alice',
        gameType: 'connect-four' as const,
      });

      act(() => { vi.advanceTimersByTime(2000); });
      expect(document.title).toBe('Connect Four');
    });

    it('stops flashing when tab regains focus', () => {
      const { rerender } = renderHook(
        (props) => useNotifications(props),
        {
          initialProps: {
            gameId: 'game-1',
            isMyTurn: false,
            opponentName: 'Alice',
            gameType: 'connect-four' as const,
          },
        }
      );

      rerender({
        gameId: 'game-1',
        isMyTurn: true,
        opponentName: 'Alice',
        gameType: 'connect-four' as const,
      });

      act(() => { vi.advanceTimersByTime(1000); });
      expect(document.title).toBe('🔴 Your Turn!');

      Object.defineProperty(document, 'hidden', { value: false, writable: true, configurable: true });
      act(() => {
        document.dispatchEvent(new Event('visibilitychange'));
      });

      act(() => { vi.advanceTimersByTime(1000); });
      expect(document.title).toBe('Connect Four');
    });
  });

  describe('sound ping', () => {
    let mockPlay: ReturnType<typeof vi.fn>;
    let mockLoad: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      mockPlay = vi.fn().mockResolvedValue(undefined);
      mockLoad = vi.fn();
      vi.stubGlobal('Audio', class {
        play = mockPlay;
        load = mockLoad;
        currentTime = 0;
      });
    });

    it('plays sound when turn transitions to me and tab is hidden', () => {
      const { rerender } = renderHook(
        (props) => useNotifications(props),
        {
          initialProps: { gameId: 'game-1', isMyTurn: false, opponentName: 'Alice', gameType: 'connect-four' as const },
        }
      );
      rerender({ gameId: 'game-1', isMyTurn: true, opponentName: 'Alice', gameType: 'connect-four' as const });
      expect(mockPlay).toHaveBeenCalledTimes(1);
    });

    it('does not play sound when muted', () => {
      localStorage.setItem('notifications-muted', 'true');
      const { rerender } = renderHook(
        (props) => useNotifications(props),
        {
          initialProps: { gameId: 'game-1', isMyTurn: false, opponentName: 'Alice', gameType: 'connect-four' as const },
        }
      );
      rerender({ gameId: 'game-1', isMyTurn: true, opponentName: 'Alice', gameType: 'connect-four' as const });
      expect(mockPlay).not.toHaveBeenCalled();
      localStorage.removeItem('notifications-muted');
    });

    it('does not play sound when tab is visible', () => {
      Object.defineProperty(document, 'hidden', { value: false, writable: true, configurable: true });
      const { rerender } = renderHook(
        (props) => useNotifications(props),
        {
          initialProps: { gameId: 'game-1', isMyTurn: false, opponentName: 'Alice', gameType: 'connect-four' as const },
        }
      );
      rerender({ gameId: 'game-1', isMyTurn: true, opponentName: 'Alice', gameType: 'connect-four' as const });
      expect(mockPlay).not.toHaveBeenCalled();
    });
  });

  describe('browser notification', () => {
    let mockNotification: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      mockNotification = vi.fn();
      vi.stubGlobal('Notification', Object.assign(mockNotification, {
        permission: 'granted',
        requestPermission: vi.fn().mockResolvedValue('granted'),
      }));
    });

    it('shows browser notification when turn transitions, tab hidden, permission granted', () => {
      const { rerender } = renderHook(
        (props) => useNotifications(props),
        {
          initialProps: { gameId: 'game-1', isMyTurn: false, opponentName: 'Alice', gameType: 'connect-four' as const },
        }
      );
      rerender({ gameId: 'game-1', isMyTurn: true, opponentName: 'Alice', gameType: 'connect-four' as const });
      expect(mockNotification).toHaveBeenCalledWith(
        'Alice played — it\'s your turn!',
        expect.objectContaining({ body: 'Connect Four' })
      );
    });

    it('does not show notification when muted', () => {
      localStorage.setItem('notifications-muted', 'true');
      const { rerender } = renderHook(
        (props) => useNotifications(props),
        {
          initialProps: { gameId: 'game-1', isMyTurn: false, opponentName: 'Alice', gameType: 'connect-four' as const },
        }
      );
      rerender({ gameId: 'game-1', isMyTurn: true, opponentName: 'Alice', gameType: 'connect-four' as const });
      expect(mockNotification).not.toHaveBeenCalled();
      localStorage.removeItem('notifications-muted');
    });

    it('does not show notification when permission is not granted', () => {
      vi.stubGlobal('Notification', Object.assign(vi.fn(), {
        permission: 'default',
        requestPermission: vi.fn().mockResolvedValue('default'),
      }));
      const { rerender } = renderHook(
        (props) => useNotifications(props),
        {
          initialProps: { gameId: 'game-1', isMyTurn: false, opponentName: 'Alice', gameType: 'connect-four' as const },
        }
      );
      rerender({ gameId: 'game-1', isMyTurn: true, opponentName: 'Alice', gameType: 'connect-four' as const });
      expect(Notification).not.toHaveBeenCalled();
    });
  });

  describe('multi-tab dedup', () => {
    it('broadcasts claim via BroadcastChannel when firing notifications', () => {
      const mockPostMessage = vi.fn();
      vi.stubGlobal('BroadcastChannel', class {
        postMessage = mockPostMessage;
        addEventListener = vi.fn();
        removeEventListener = vi.fn();
        close = vi.fn();
      });

      const { rerender } = renderHook(
        (props) => useNotifications(props),
        {
          initialProps: { gameId: 'game-1', isMyTurn: false, opponentName: 'Alice', gameType: 'connect-four' as const },
        }
      );
      rerender({ gameId: 'game-1', isMyTurn: true, opponentName: 'Alice', gameType: 'connect-four' as const });
      expect(mockPostMessage).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'notification-claim', gameId: 'game-1' })
      );
    });

    it('suppresses notifications if another tab claims first', () => {
      const listeners: ((event: MessageEvent) => void)[] = [];
      vi.stubGlobal('BroadcastChannel', class {
        postMessage = vi.fn();
        addEventListener = (_: string, cb: (event: MessageEvent) => void) => { listeners.push(cb); };
        removeEventListener = vi.fn();
        close = vi.fn();
      });

      const mockPlay = vi.fn().mockResolvedValue(undefined);
      vi.stubGlobal('Audio', class {
        play = mockPlay;
        load = vi.fn();
        currentTime = 0;
      });

      const { rerender } = renderHook(
        (props) => useNotifications(props),
        {
          initialProps: { gameId: 'game-1', isMyTurn: false, opponentName: 'Alice', gameType: 'connect-four' as const },
        }
      );

      // Simulate another tab claiming
      listeners.forEach((cb) => cb({ data: { type: 'notification-claim', gameId: 'game-1', tabId: 'other-tab' } } as MessageEvent));

      rerender({ gameId: 'game-1', isMyTurn: true, opponentName: 'Alice', gameType: 'connect-four' as const });
      expect(mockPlay).not.toHaveBeenCalled();
    });
  });
});

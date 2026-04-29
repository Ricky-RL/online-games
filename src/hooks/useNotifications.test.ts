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
});

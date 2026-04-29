# Turn Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Alert players when it becomes their turn via tab title flash, sound ping, and opt-in browser notifications — shared across Connect Four and Tic-Tac-Toe.

**Architecture:** A single `useNotifications` hook encapsulates all notification logic (title flash, sound, browser notification, multi-tab dedup). Both game hooks pass their state into it. No backend changes required.

**Tech Stack:** React 19, TypeScript, Vitest (jsdom), Web APIs (Notification, BroadcastChannel, Page Visibility, Audio)

---

## File Structure

| File | Responsibility |
|------|---------------|
| `src/hooks/useNotifications.ts` | Main hook — orchestrates title flash, sound, browser notification, dedup |
| `src/hooks/useNotifications.test.ts` | Unit tests for notification logic |
| `src/components/NotificationControls.tsx` | Bell icon + mute toggle UI |
| `public/sounds/turn.mp3` | Short notification chime audio file |

**Modified files:**
- `src/hooks/useGame.ts` — expose `isMyTurn` and `opponentName`, call `useNotifications`
- `src/hooks/useTicTacToeGame.ts` — same as above
- `src/app/connect-four/[gameId]/page.tsx` — render NotificationControls
- `src/app/tic-tac-toe/[gameId]/page.tsx` — render NotificationControls

---

### Task 1: Create useNotifications hook with title flash

**Files:**
- Create: `src/hooks/useNotifications.ts`
- Create: `src/hooks/useNotifications.test.ts`

- [ ] **Step 1: Write the failing test for title flash**

```ts
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
});
```

- [ ] **Step 2: Install @testing-library/react if missing**

Run: `npm ls @testing-library/react 2>/dev/null || npm install -D @testing-library/react @testing-library/react-hooks`
Expected: Package available

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/hooks/useNotifications.test.ts`
Expected: FAIL — module `./useNotifications` not found

- [ ] **Step 4: Implement useNotifications with title flash**

```ts
// src/hooks/useNotifications.ts
'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

type GameType = 'connect-four' | 'tic-tac-toe';

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

const BASE_TITLE = typeof document !== 'undefined' ? document.title : '';

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

  const stopFlashing = useCallback(() => {
    if (flashInterval.current) {
      clearInterval(flashInterval.current);
      flashInterval.current = null;
    }
    isFlashing.current = false;
    if (typeof document !== 'undefined') {
      document.title = BASE_TITLE || getDefaultTitle(gameType);
    }
  }, [gameType]);

  const startFlashing = useCallback(() => {
    if (isFlashing.current) return;
    isFlashing.current = true;
    const baseTitle = document.title;
    let showAlert = true;

    flashInterval.current = setInterval(() => {
      document.title = showAlert ? '🔴 Your Turn!' : baseTitle;
      showAlert = !showAlert;
    }, 1000);
  }, []);

  // Title flash: start when turn transitions to me and tab is hidden
  useEffect(() => {
    const becameMyTurn = isMyTurn && !prevIsMyTurn.current;
    prevIsMyTurn.current = isMyTurn;

    if (becameMyTurn && document.hidden) {
      startFlashing();
    }

    if (!isMyTurn) {
      stopFlashing();
    }
  }, [isMyTurn, startFlashing, stopFlashing]);

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

function getDefaultTitle(gameType: GameType): string {
  return gameType === 'connect-four' ? 'Connect Four' : 'Tic-Tac-Toe';
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/hooks/useNotifications.test.ts`
Expected: All 3 tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useNotifications.ts src/hooks/useNotifications.test.ts
git commit -m "feat: add useNotifications hook with title flash"
```

---

### Task 2: Add sound ping to useNotifications

**Files:**
- Modify: `src/hooks/useNotifications.ts`
- Modify: `src/hooks/useNotifications.test.ts`
- Create: `public/sounds/turn.mp3`

- [ ] **Step 1: Create a placeholder turn.mp3**

For now, copy the existing drop sound as a placeholder (replace with a distinct chime later):

```bash
cp public/sounds/drop.mp3 public/sounds/turn.mp3
```

- [ ] **Step 2: Write the failing test for sound ping**

Add to `src/hooks/useNotifications.test.ts`:

```ts
describe('sound ping', () => {
  let mockPlay: ReturnType<typeof vi.fn>;
  let mockLoad: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockPlay = vi.fn().mockResolvedValue(undefined);
    mockLoad = vi.fn();
    vi.stubGlobal('Audio', vi.fn(() => ({
      play: mockPlay,
      load: mockLoad,
      currentTime: 0,
    })));
  });

  it('plays sound when turn transitions to me and tab is hidden', () => {
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

    expect(mockPlay).toHaveBeenCalledTimes(1);
  });

  it('does not play sound when muted', () => {
    localStorage.setItem('notifications-muted', 'true');

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

    expect(mockPlay).not.toHaveBeenCalled();
    localStorage.removeItem('notifications-muted');
  });

  it('does not play sound when tab is visible', () => {
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

    expect(mockPlay).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run src/hooks/useNotifications.test.ts`
Expected: Sound ping tests FAIL

- [ ] **Step 4: Add sound ping to useNotifications**

Add inside `useNotifications`, after the title flash effect:

```ts
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Preload turn sound
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const audio = new Audio('/sounds/turn.mp3');
    audio.load();
    audioRef.current = audio;
  }, []);

  // Sound ping: play when turn transitions to me, tab is hidden, not muted
  useEffect(() => {
    const becameMyTurn = isMyTurn && !prevIsMyTurn.current;
    // Note: prevIsMyTurn is updated in the title flash effect above

    if (becameMyTurn && document.hidden && !isMuted && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  }, [isMyTurn, isMuted]);
```

**Refactor note:** The `prevIsMyTurn` check is shared with the title flash effect. Consolidate into a single effect that handles all "turn just changed to me" notifications:

Replace the two separate effects (title flash trigger + sound trigger) with one:

```ts
  // Trigger notifications when turn transitions to me
  useEffect(() => {
    const becameMyTurn = isMyTurn && !prevIsMyTurn.current;
    prevIsMyTurn.current = isMyTurn;

    if (!becameMyTurn) {
      if (!isMyTurn) stopFlashing();
      return;
    }

    if (!document.hidden) return;

    // Title flash
    startFlashing();

    // Sound ping
    if (!isMuted && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  }, [isMyTurn, isMuted, startFlashing, stopFlashing]);
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/hooks/useNotifications.test.ts`
Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useNotifications.ts src/hooks/useNotifications.test.ts public/sounds/turn.mp3
git commit -m "feat: add sound ping to turn notifications"
```

---

### Task 3: Add Browser Notification API support

**Files:**
- Modify: `src/hooks/useNotifications.ts`
- Modify: `src/hooks/useNotifications.test.ts`

- [ ] **Step 1: Write the failing test for browser notifications**

Add to `src/hooks/useNotifications.test.ts`:

```ts
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

    expect(Notification).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/hooks/useNotifications.test.ts`
Expected: Browser notification tests FAIL

- [ ] **Step 3: Add browser notification to the unified trigger effect**

In the consolidated notification trigger effect, add after the sound ping:

```ts
    // Browser notification
    if (!isMuted && 'Notification' in window && Notification.permission === 'granted') {
      const title = opponentName
        ? `${opponentName} played — it's your turn!`
        : "It's your turn!";
      const body = gameType === 'connect-four' ? 'Connect Four' : 'Tic-Tac-Toe';
      const notification = new Notification(title, { body });
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/hooks/useNotifications.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useNotifications.ts src/hooks/useNotifications.test.ts
git commit -m "feat: add browser notification on turn change"
```

---

### Task 4: Add multi-tab deduplication

**Files:**
- Modify: `src/hooks/useNotifications.ts`
- Modify: `src/hooks/useNotifications.test.ts`

- [ ] **Step 1: Write the failing test for dedup**

Add to `src/hooks/useNotifications.test.ts`:

```ts
describe('multi-tab dedup', () => {
  it('only one tab fires notifications via BroadcastChannel claim', () => {
    const mockPostMessage = vi.fn();
    const listeners: ((event: { data: unknown }) => void)[] = [];
    vi.stubGlobal('BroadcastChannel', vi.fn(() => ({
      postMessage: mockPostMessage,
      addEventListener: (_: string, cb: (event: { data: unknown }) => void) => { listeners.push(cb); },
      removeEventListener: vi.fn(),
      close: vi.fn(),
    })));

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

    expect(mockPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'notification-claim', gameId: 'game-1' })
    );
  });

  it('suppresses notifications if another tab claims first', () => {
    const listeners: ((event: { data: unknown }) => void)[] = [];
    vi.stubGlobal('BroadcastChannel', vi.fn(() => ({
      postMessage: vi.fn(),
      addEventListener: (_: string, cb: (event: { data: unknown }) => void) => { listeners.push(cb); },
      removeEventListener: vi.fn(),
      close: vi.fn(),
    })));

    const mockPlay = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('Audio', vi.fn(() => ({ play: mockPlay, load: vi.fn(), currentTime: 0 })));

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

    // Simulate another tab claiming before this tab processes
    listeners.forEach((cb) => cb({ data: { type: 'notification-claim', gameId: 'game-1', tabId: 'other-tab' } }));

    rerender({
      gameId: 'game-1',
      isMyTurn: true,
      opponentName: 'Alice',
      gameType: 'connect-four' as const,
    });

    // Sound should not play because another tab already claimed
    expect(mockPlay).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/hooks/useNotifications.test.ts`
Expected: Dedup tests FAIL

- [ ] **Step 3: Implement BroadcastChannel dedup**

Add to `useNotifications.ts`:

```ts
  const tabId = useRef(Math.random().toString(36).slice(2));
  const claimedByOther = useRef(false);
  const channelRef = useRef<BroadcastChannel | null>(null);

  // BroadcastChannel setup for multi-tab dedup
  useEffect(() => {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return;

    const channel = new BroadcastChannel('game-notifications');
    channelRef.current = channel;

    channel.addEventListener('message', (event: MessageEvent) => {
      const data = event.data;
      if (data?.type === 'notification-claim' && data.gameId === gameId && data.tabId !== tabId.current) {
        claimedByOther.current = true;
        // Reset after 5 seconds (next poll cycle will re-evaluate)
        setTimeout(() => { claimedByOther.current = false; }, 5000);
      }
    });

    return () => {
      channel.close();
      channelRef.current = null;
    };
  }, [gameId]);
```

Then update the notification trigger effect to check `claimedByOther.current` and broadcast a claim:

```ts
    if (!document.hidden) return;

    // Multi-tab dedup: broadcast claim, skip if another tab already claimed
    if (claimedByOther.current) return;
    channelRef.current?.postMessage({ type: 'notification-claim', gameId, tabId: tabId.current });

    // Title flash (always fires)
    startFlashing();
    // ... rest of notifications
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/hooks/useNotifications.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useNotifications.ts src/hooks/useNotifications.test.ts
git commit -m "feat: add multi-tab notification dedup via BroadcastChannel"
```

---

### Task 5: Create NotificationControls component

**Files:**
- Create: `src/components/NotificationControls.tsx`

- [ ] **Step 1: Write the component**

```tsx
// src/components/NotificationControls.tsx
'use client';

interface NotificationControlsProps {
  permissionState: NotificationPermission | 'unsupported';
  requestPermission: () => Promise<void>;
  isMuted: boolean;
  toggleMute: () => void;
}

export function NotificationControls({
  permissionState,
  requestPermission,
  isMuted,
  toggleMute,
}: NotificationControlsProps) {
  return (
    <div className="flex items-center gap-1">
      {/* Mute toggle */}
      <button
        onClick={toggleMute}
        className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface transition-colors cursor-pointer"
        title={isMuted ? 'Unmute notifications' : 'Mute notifications'}
        aria-label={isMuted ? 'Unmute notifications' : 'Mute notifications'}
      >
        {isMuted ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 5L6 9H2v6h4l5 4V5z" />
            <line x1="23" y1="9" x2="17" y2="15" />
            <line x1="17" y1="9" x2="23" y2="15" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          </svg>
        )}
      </button>

      {/* Bell icon — only show if Notification API is supported and not denied */}
      {permissionState !== 'unsupported' && permissionState !== 'denied' && (
        <button
          onClick={requestPermission}
          className={`p-2 rounded-lg transition-colors cursor-pointer ${
            permissionState === 'granted'
              ? 'text-text-primary'
              : 'text-text-secondary hover:text-text-primary hover:bg-surface'
          }`}
          title={
            permissionState === 'granted'
              ? 'Browser notifications enabled'
              : 'Enable browser notifications'
          }
          aria-label={
            permissionState === 'granted'
              ? 'Browser notifications enabled'
              : 'Enable browser notifications'
          }
          disabled={permissionState === 'granted'}
        >
          {permissionState === 'granted' ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          )}
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/NotificationControls.tsx
git commit -m "feat: add NotificationControls bell/mute UI component"
```

---

### Task 6: Integrate into Connect Four game page

**Files:**
- Modify: `src/app/connect-four/[gameId]/page.tsx`

- [ ] **Step 1: Add useNotifications call and render controls**

At the top of the file, add imports:

```ts
import { useNotifications } from '@/hooks/useNotifications';
import { NotificationControls } from '@/components/NotificationControls';
```

Inside the `GamePage` component, after the `isMyTurn` memo, add:

```ts
  const { permissionState, requestPermission, isMuted, toggleMute } = useNotifications({
    gameId,
    isMyTurn,
    opponentName,
    gameType: 'connect-four',
  });
```

In the playing-state JSX return (the last `return` block at line ~197), add the controls above the TurnIndicator. Replace the existing outer div contents:

```tsx
  return (
    <>
      <div className="flex-1 flex flex-col items-center justify-center gap-6 p-4">
        <div className="flex items-center gap-4">
          <TurnIndicator
            currentPlayer={game.current_turn}
            isMyTurn={isMyTurn}
            playerName={opponentName}
          />
          <NotificationControls
            permissionState={permissionState}
            requestPermission={requestPermission}
            isMuted={isMuted}
            toggleMute={toggleMute}
          />
        </div>

        <GameBoard
          board={game.board}
          currentPlayer={game.current_turn}
          onColumnClick={handleMakeMove}
          disabled={!isMyTurn || (gameStatus !== 'playing' && gameStatus !== 'waiting')}
          winningCells={winningCells}
          lastMove={lastMove}
        />

        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 text-sm font-medium rounded-xl border border-border bg-surface text-text-secondary hover:text-text-primary hover:border-text-secondary/30 shadow-sm hover:shadow transition-all cursor-pointer"
          >
            Home
          </button>
          <button
            onClick={handleEndGameClick}
            className="px-4 py-2 text-sm font-medium rounded-xl border border-player1/20 bg-player1/5 text-player1/80 hover:bg-player1/10 hover:border-player1/40 hover:text-player1 shadow-sm hover:shadow transition-all cursor-pointer"
          >
            End Game
          </button>
        </div>
      </div>
      <EndGameDialog
        open={showEndDialog}
        onConfirm={handleReset}
        onCancel={handleEndGameCancel}
      />
    </>
  );
```

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/app/connect-four/[gameId]/page.tsx
git commit -m "feat: integrate turn notifications into Connect Four"
```

---

### Task 7: Integrate into Tic-Tac-Toe game page

**Files:**
- Modify: `src/app/tic-tac-toe/[gameId]/page.tsx`

- [ ] **Step 1: Add useNotifications call and render controls**

At the top of the file, add imports:

```ts
import { useNotifications } from '@/hooks/useNotifications';
import { NotificationControls } from '@/components/NotificationControls';
```

Inside the `TicTacToeGamePage` component, after the `isMyTurn` memo, add:

```ts
  const { permissionState, requestPermission, isMuted, toggleMute } = useNotifications({
    gameId,
    isMyTurn,
    opponentName,
    gameType: 'tic-tac-toe',
  });
```

In the playing-state JSX return (the last `return` block at line ~174), wrap TurnIndicator with NotificationControls:

```tsx
  return (
    <>
      <div className="flex-1 flex flex-col items-center justify-center gap-6 p-4">
        <div className="flex items-center gap-4">
          <TurnIndicator
            currentPlayer={game.current_turn}
            isMyTurn={isMyTurn}
            playerName={opponentName}
          />
          <NotificationControls
            permissionState={permissionState}
            requestPermission={requestPermission}
            isMuted={isMuted}
            toggleMute={toggleMute}
          />
        </div>

        <TicTacToeGameBoard
          board={game.board}
          currentPlayer={game.current_turn}
          onCellClick={handleMakeMove}
          disabled={!isMyTurn || (gameStatus !== 'playing' && gameStatus !== 'waiting')}
          winningCells={winningCells}
          lastMove={lastMove}
        />

        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 text-sm font-medium rounded-xl border border-border bg-surface text-text-secondary hover:text-text-primary hover:border-text-secondary/30 shadow-sm hover:shadow transition-all cursor-pointer"
          >
            Home
          </button>
          <button
            onClick={handleEndGameClick}
            className="px-4 py-2 text-sm font-medium rounded-xl border border-player1/20 bg-player1/5 text-player1/80 hover:bg-player1/10 hover:border-player1/40 hover:text-player1 shadow-sm hover:shadow transition-all cursor-pointer"
          >
            End Game
          </button>
        </div>
      </div>
      <EndGameDialog
        open={showEndDialog}
        onConfirm={handleReset}
        onCancel={handleEndGameCancel}
      />
    </>
  );
```

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Run all tests**

Run: `npx vitest run`
Expected: All tests PASS

- [ ] **Step 4: Commit**

```bash
git add src/app/tic-tac-toe/[gameId]/page.tsx
git commit -m "feat: integrate turn notifications into Tic-Tac-Toe"
```

---

### Task 8: Manual verification

- [ ] **Step 1: Start dev server**

Run: `npm run dev`

- [ ] **Step 2: Test title flash**

1. Open Connect Four in two browser tabs (one per player)
2. In Tab 1, make a move
3. Switch to a different app/tab so Tab 2 is hidden
4. Observe Tab 2's title flashes "🔴 Your Turn!"
5. Focus Tab 2 — title stops flashing

- [ ] **Step 3: Test sound ping**

1. With Tab 2 backgrounded, make a move in Tab 1
2. Hear the turn notification sound from Tab 2

- [ ] **Step 4: Test browser notification**

1. Click the bell icon in Tab 2
2. Grant notification permission
3. Background Tab 2
4. Make a move in Tab 1
5. See system notification appear

- [ ] **Step 5: Test mute toggle**

1. Click the mute button in Tab 2
2. Background Tab 2
3. Make a move in Tab 1
4. Title still flashes, but no sound or browser notification

- [ ] **Step 6: Test Tic-Tac-Toe**

Repeat steps 2-5 with a Tic-Tac-Toe game to confirm shared hook works.

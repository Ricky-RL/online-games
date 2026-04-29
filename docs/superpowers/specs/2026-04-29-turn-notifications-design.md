# Turn Notifications Design

## Problem

When two players are in a game (Connect Four or Tic-Tac-Toe), the opponent may not notice it's their turn if they've switched to another tab or window. The app currently relies on 1.5s polling for state sync, which works but provides no active signal to the distracted player.

## Goals

- Alert a player when it becomes their turn and their tab is not focused
- Work across both Connect Four and Tic-Tac-Toe with shared infrastructure
- Zero friction for the default case (no permission prompts unless opted in)
- No backend changes required

## Non-Goals (Deferred)

- Web Push notifications (service worker, push subscriptions, Edge Functions) — deferred until analytics show tab-closed abandonment is a real problem
- Replacing the existing 1.5s polling mechanism
- Adding Supabase Realtime subscriptions

## Design

### Detection Logic

In the existing polling callback (both `useGame.ts` and `useTicTacToeGame.ts`), detect when:
1. `current_turn` changes to the local player, AND
2. `document.hidden === true` (tab is not focused)

This is the trigger for all notification signals.

### Notification Signals

Three signals fire when the trigger condition is met:

#### 1. Tab Title Flash

Alternate `document.title` between the normal title and "Your Turn!" every 1 second. Stop flashing when the tab regains focus (listen to `visibilitychange` event, not polling, for instant stop).

No permission required.

#### 2. Sound Ping

Play a short audio cue (`/sounds/turn.mp3`) when the turn transitions to the local player and the tab is backgrounded.

Requirements:
- Preload the audio on mount (`audio.load()`) so it plays instantly
- Only fire when tab is backgrounded (avoid doubling up with the existing `drop.mp3` sound that plays on every move when watching)
- Audio plays without permission after any prior user interaction (joining the game counts)

If the sound fails to play (autoplay policy), fail silently.

#### 3. Browser Notification API

Show a system notification: "{opponent} played — it's your turn!" with the game type context.

Requirements:
- Permission is gated behind an explicit opt-in button (bell icon in the game header)
- Never prompt automatically — the button calls `Notification.requestPermission()` on click
- If permission is `denied`, hide the bell icon (no point showing it)
- If permission is `granted`, fire `new Notification(...)` on turn change when tab is hidden
- Clicking the notification focuses the game tab (`notification.onclick = () => window.focus()`)

No service worker required — this uses the simple Notification constructor, not Push.

### Multi-Tab Deduplication

If a player has the same game open in multiple tabs, only one tab should fire notifications.

Approach: Use `BroadcastChannel('game-notifications')`. When a tab is about to fire notifications, it broadcasts a claim. Each tab listens for claims and yields if another tab claimed first. Use a short random delay (0-100ms) before claiming to avoid races.

Fallback: If BroadcastChannel is not supported, use a `localStorage` key with a timestamp. Tab checks if another tab claimed notification duty within the last 3 seconds before firing.

### Mute Toggle

A mute button (next to the bell icon) stored in `localStorage` under `notifications-muted`. When muted:
- Tab title flash still works (very low intrusiveness)
- Sound is suppressed
- Browser notifications are suppressed

### Shared Hook

A new `useNotifications.ts` hook encapsulates all logic:

```ts
interface UseNotificationsOptions {
  gameId: string
  isMyTurn: boolean
  opponentName: string
  gameType: 'connect-four' | 'tic-tac-toe'
}

function useNotifications(options: UseNotificationsOptions): {
  permissionState: 'default' | 'granted' | 'denied'
  requestPermission: () => Promise<void>
  isMuted: boolean
  toggleMute: () => void
}
```

Both `useGame.ts` and `useTicTacToeGame.ts` call this hook, passing their game-specific state.

Internal structure:
- `useTitleFlash()` — manages document.title alternation
- `useSoundPing()` — manages audio preloading and playback
- `useBrowserNotification()` — manages Notification API
- `useNotificationDedup()` — manages BroadcastChannel dedup

### UI Changes

1. **Bell icon** in game header (next to settings gear) — requests Notification API permission on click
2. **Mute toggle** — small speaker icon, toggles sound and browser notifications
3. Both icons show current state visually (bell with slash if denied, speaker with slash if muted)

### Permission UX Flow

```
Game starts → Bell icon visible (default state, subtle)
                ↓ user clicks bell
              requestPermission()
                ↓ user grants
              Bell icon solid (active state)
              Browser notifications now fire on turn changes
                ↓ user denies
              Bell icon hidden (cannot re-prompt)
```

If user never clicks the bell, they still get title flash and sound (which require no permission).

### Edge Cases

| Scenario | Behavior |
|----------|----------|
| Tab is focused when turn changes | No notifications fire (player is watching) |
| Player makes a move (optimistic update) | No self-notification — only fires when polling confirms opponent moved |
| Game ends (winner/draw) | Stop all notification signals |
| Player leaves game page | Hook cleanup stops all intervals and listeners |
| Audio fails (autoplay blocked) | Silent failure, other signals still fire |
| BroadcastChannel unavailable | Falls back to localStorage dedup |
| Multiple games open | Each game has its own hook instance, dedup is per-gameId |

### Files to Create/Modify

**New files:**
- `src/hooks/useNotifications.ts` — main hook
- `public/sounds/turn.mp3` — short notification chime

**Modified files:**
- `src/hooks/useGame.ts` — call useNotifications
- `src/hooks/useTicTacToeGame.ts` — call useNotifications
- `src/app/connect-four/[gameId]/page.tsx` — add bell/mute icons to header
- `src/app/tic-tac-toe/[gameId]/page.tsx` — add bell/mute icons to header

### Future: Web Push (deferred)

If analytics show that players frequently close tabs mid-game and return later, Web Push can be added as a Layer 2:
- Service worker (`public/sw.js`)
- VAPID key pair (env secrets)
- `push_subscriptions` table in Supabase
- Supabase Database Webhook → Edge Function to send push
- Rate limiting (1 push per 10s per game)
- RLS policies on subscription table
- Identity problem must be solved first (localStorage UUIDs are too ephemeral for persistent push subscriptions)

This is explicitly out of scope for the initial implementation.

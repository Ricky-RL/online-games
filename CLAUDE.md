@AGENTS.md

## Environment Setup

If `.env` is missing from the project root, create the symlink:

```bash
ln -sf /Users/I769353/conductor/workspaces/online-games/.env .env
```

This points to the shared env file used by all worktrees.

## Adding New Games

When adding a new game type, integrate it with ALL of these systems:

### Inbox
1. Add the game type to the `InboxGameType` union in `src/lib/inbox-types.ts`
2. Add it to the `.in('game_type', [...])` filter in `src/hooks/useInbox.ts`
3. Add an icon and label for it in `src/components/inbox/InboxGameItem.tsx`

### Leaderboard & Match History
4. Add the game type to `GameType` in `src/lib/match-results.ts`
5. Add the game type to `MatchResult['game_type']` in `src/hooks/useMatchHistory.ts`
6. Add it to the `by_game` object in `LeaderboardStats` and `computeStats()` in `src/hooks/useMatchHistory.ts`
7. Add a `<GameStat>` entry in `src/components/Leaderboard.tsx`
8. Add icon and label cases in `src/components/MatchHistory.tsx`
9. Call `recordMatchResult()` on game completion in your game hook

### Async Play
10. Games must support async play: Player 1 can start and immediately take their turn without waiting for Player 2 to join. The matchmaking creates a game row with one player slot filled and the other null. Polling picks up the opponent when they join.

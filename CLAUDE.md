@AGENTS.md

## Environment Setup

If `.env` is missing from the project root, create the symlink:

```bash
ln -sf /Users/I769353/conductor/workspaces/online-games/.env .env
```

This points to the shared env file used by all worktrees.

## Adding New Games

When adding a new game type, integrate it with the inbox system:

1. Add the game type to the `InboxGameType` union in `src/lib/inbox-types.ts`
2. Add it to the `.in('game_type', [...])` filter in `src/hooks/useInbox.ts`
3. Add an icon and label for it in `src/components/inbox/InboxGameItem.tsx`

# Game Night

A collection of real-time multiplayer two-player games with satisfying micro-interactions -- spring physics, sounds, and confetti celebrations. Built for two players (Ricky and Lilian) to play together from separate devices.

## Games

| Game | Description | Type |
|------|-------------|------|
| **Connect Four** | Drop pieces, connect four in a row. Classic strategy for two. | Turn-based |
| **Tic Tac Toe** | X and O, three in a row. Quick rounds, pure fun. | Turn-based |
| **Wordle** | Guess the word together -- random or daily mode (fetches NYT daily word). | Cooperative |
| **Checkers** | Jump and capture across the board. Supports kings and multi-jump chains. | Turn-based |
| **Battleship** | Hunt and sink the fleet. Ships auto-placed, fire shots to find them. | Turn-based |
| **Mini Golf** | 3 holes per match from a pool of 15 levels across easy/medium/hard tiers. Canvas-based physics. | Turn-based |
| **Jenga** | Drag blocks from the tower -- risk/wobble mechanics determine collapse. Skill-based scoring. | Turn-based |
| **Snakes & Ladders** | Roll dice, race to square 100. Includes 8 powerup types that spawn on the board. | Turn-based |
| **Word Search** | Find hidden words in a grid -- race against each other on the same puzzle. 6 theme packs with 100 words each. | Simultaneous |
| **Monopoly** | Vancouver-themed property trading with 40 spaces, houses, jail, and railroads. | Turn-based |
| **Memory** | Flip cards, find emoji pairs. 20 cards (10 pairs), best memory wins. | Turn-based |
| **Whiteboard** | Shared sticky notes and doodles. Create text or drawing notes, drag to arrange. | Collaborative |

## How It Works

1. Open the app and pick your player name (Ricky or Lilian)
2. Choose a game from the home page grid (drag to reorder)
3. Matchmaking automatically pairs you: finds existing games, joins open slots, or creates a new one
4. Play in real-time -- moves sync via Supabase polling every 1.5 seconds

No accounts, no sign-up. Player identity is two fixed UUIDs stored in localStorage.

## Architecture

### Tech Stack

- **Next.js 16** (App Router, all client components) -- framework
- **React 19** -- UI
- **Supabase** -- Postgres database + Realtime for live sync
- **Framer Motion** -- spring physics animations
- **canvas-confetti** -- win celebrations
- **Tailwind CSS 4** -- styling with custom `@utility` directives for player colors
- **@dnd-kit** -- drag-and-drop for game card reordering and Jenga
- **Vitest** -- unit testing

### Project Structure

```
src/
  app/                        Next.js App Router pages
    [game-name]/              Each game has its own route
      page.tsx                Lobby/matchmaking page
      [gameId]/page.tsx       Game instance page
    api/daily-wordle/         API route fetching NYT daily word
  components/                 Shared + game-specific components
    inbox/                    Inbox notification components
    [game-name]/              Game-specific board/piece components
    TurnIndicator.tsx         Whose turn indicator
    WinCelebration.tsx        Confetti + win message
    EndGameDialog.tsx         Confirmation modal
    SettingsButton.tsx        Color picker gear icon
    SortableGameCard.tsx      Draggable game card for home page
    Leaderboard.tsx           Win/loss stats display
    MatchHistory.tsx          Recent match feed
  hooks/
    use[GameName]Game.ts      One hook per game (Supabase sync + game logic)
    useInbox.ts               Inbox polling (pending games + whiteboard activity)
    useMatchHistory.ts        Leaderboard stats + match results
    useNotifications.ts       Browser notifications + tab title flashing
    useGameOrder.ts           Per-player game card ordering
    usePlayerColors.ts        Color preference sync
    useSound.ts               Sound effect hook
    useConfetti.ts            Confetti trigger hook
  lib/
    [game-name]-logic.ts      Pure game logic (no side effects)
    [game-name]-logic.test.ts Unit tests for game logic
    game-registry.ts          Game definitions (title, description, color, slug)
    match-results.ts          Record wins/losses to match_results table
    inbox-types.ts            Inbox type definitions
    players.ts                Player names + UUIDs
    types.ts                  Shared game state types
    supabase.ts               Supabase client initialization
    colors.ts                 Color presets + utilities
    mini-golf/                Multi-file: physics, collision, levels, types
    monopoly/                 Multi-file: board-data, logic, types
  contexts/
    PlayerColorsContext.tsx    React context for player color preferences
supabase/
  migrations/                 12 SQL migrations
  functions/
    notify-telegram/          Edge function for Telegram turn notifications
```

### Database

All competitive games share a single `games` table differentiated by `game_type`. Wordle uses a separate `wordle_games` table. Additional tables:

| Table | Purpose |
|-------|---------|
| `games` | Board state, current turn, winner, player slots |
| `wordle_games` | Wordle-specific state (guesses array, answer, status) |
| `match_results` | Historical win/loss records for leaderboard |
| `player_preferences` | Player colors + game card ordering |
| `whiteboard_notes` | Sticky note content and positions |
| `whiteboard_activity` | Activity feed for whiteboard changes |
| `inbox_read_state` | Per-player last-read timestamps |
| `inbox_dismissed_items` | Dismissed inbox items |

### Matchmaking

Every game follows the same async matchmaking pattern:

1. Query for active games of that type with no winner
2. Look for a game the current player is already in (resume)
3. Look for a game the other player created with an empty slot (join)
4. Wait 1 second, retry (prevents race conditions when both open simultaneously)
5. If nothing found, create a new game (creator is always Player 1)
6. Navigate to `/[game-name]/[gameId]`

Player 1 can take their turn immediately without waiting for Player 2 to join.

### Sync Model

Games sync via client-side polling (every 1.5 seconds) against Supabase Postgres. Moves use optimistic updates: local state updates immediately, then syncs to the database. Version/move-count checks prevent stale state from overwriting newer moves.

### Notifications

Three notification layers:

1. **Inbox** -- Home page shows top 3 actionable items (games where it's your turn + whiteboard activity). Polls every 5 seconds.
2. **Browser notifications** -- Tab title flashing, sound pings, and native browser notifications when it becomes your turn (multi-tab dedup via BroadcastChannel).
3. **Telegram** -- Supabase database triggers call an Edge Function that sends Telegram messages on turn changes and game completions.

## Features

- **Async matchmaking** -- Player 1 can start and take their turn immediately; Player 2 joins when ready
- **Inbox notifications** -- See pending games and whose turn it is
- **Telegram notifications** -- Get notified when it's your turn or a game ends
- **Leaderboard & match history** -- Track wins, losses, draws, and streaks across all games
- **Daily Wordle** -- Fetches the NYT daily word; tracks streaks and guess distribution
- **Player color customization** -- Each player picks from 8 color presets; colors appear on all game pieces
- **Draggable game ordering** -- Reorder game cards on the home page (persisted per player)
- **Snakes & Ladders powerups** -- 8 powerup types with spawn/respawn mechanics and turn replay animations
- **Jenga skill mechanics** -- Risk-based scoring with wobble system and cascade physics

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project (free tier works)

### Setup

1. Clone the repo and install dependencies:

   ```bash
   npm install
   ```

2. Create a `.env.local` file with your Supabase credentials:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

3. Run the migrations in your Supabase SQL editor (see `supabase/migrations/`).

4. Enable Realtime on the `games` and `wordle_games` tables in Supabase Dashboard.

5. (Optional) Deploy the `notify-telegram` Edge Function for Telegram notifications. Requires `TELEGRAM_BOT_TOKEN` and player chat IDs configured in Supabase secrets.

6. Start the dev server:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm test` | Run Vitest in watch mode |
| `npm run test:run` | Run tests once |

## Deployment

Deploy to Vercel -- connect the repo and set the environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`). The Telegram Edge Function deploys separately via `supabase functions deploy notify-telegram`.

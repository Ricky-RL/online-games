# Connect Four

A real-time multiplayer Connect Four game with satisfying micro-interactions — spring physics piece drops, sounds, and confetti celebrations. Built for two players to share a link and play from separate devices.

## How It Works

1. One player clicks "New Game" and shares the URL
2. The other player opens the link on their device
3. Play Connect Four in real-time — moves sync instantly via Supabase Realtime

No accounts, no sign-up. Player identity is a random UUID in localStorage.

## Tech Stack

- **Next.js** (App Router) — framework
- **Supabase** — Postgres database + Realtime subscriptions for live sync
- **Framer Motion** — spring physics for piece drop animations
- **canvas-confetti** — win celebrations
- **Tailwind CSS** — styling

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

3. Run the migration in your Supabase SQL editor:

   ```sql
   -- See supabase/migrations/001_create_games.sql
   ```

4. Enable Realtime on the `games` table in Supabase Dashboard.

5. Start the dev server:

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
| `npm test` | Run tests in watch mode |
| `npm run test:run` | Run tests once |

## Project Structure

```
src/
  app/
    connect-four/[gameId]/page.tsx   # Game page (dynamic route per game)
    page.tsx                          # Landing page
  components/                         # Board, Cell, Piece, UI components
  hooks/                              # useGame (Supabase sync), useSound
  lib/
    game-logic.ts                     # Win detection, move validation
    supabase.ts                       # Supabase client
    types.ts                          # TypeScript types
    player-id.ts                      # localStorage player identity
supabase/
  migrations/                         # Database schema
```

## Deployment

Deploy to Vercel — connect the repo and set the environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).

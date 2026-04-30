# Game Night

A collection of real-time multiplayer two-player games with satisfying micro-interactions — spring physics, sounds, and confetti celebrations. Built for two players to share a link and play from separate devices.

## Games

| Game | Description |
|------|-------------|
| **Connect Four** | Drop pieces, connect four in a row |
| **Tic Tac Toe** | X and O, three in a row |
| **Wordle** | Guess the word together (random or daily mode) |
| **Checkers** | Jump and capture across the board |
| **Battleship** | Hunt and sink the fleet |
| **Mini Golf** | 3 holes, lowest score wins |
| **Jenga** | Pull blocks, don't topple the tower |
| **Snakes & Ladders** | Roll the dice, race to square 100 |
| **Word Search** | Find hidden words, race against each other |
| **Monopoly** | Vancouver-themed property trading |
| **Whiteboard** | Shared sticky notes and doodles |

## How It Works

1. Open the app and pick your player name
2. Choose a game — matchmaking pairs you with the other player automatically
3. Play in real-time — moves sync instantly via Supabase Realtime

No accounts, no sign-up. Player identity is stored in localStorage.

## Tech Stack

- **Next.js** (App Router) — framework
- **Supabase** — Postgres database + Realtime subscriptions for live sync
- **Framer Motion** — spring physics for animations
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

3. Run the migrations in your Supabase SQL editor (see `supabase/migrations/`).

4. Enable Realtime on the `games` and `wordle_games` tables in Supabase Dashboard.

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

## Features

- **Async matchmaking** — Player 1 can start and take their turn immediately; Player 2 joins when ready
- **Inbox notifications** — See pending games and whose turn it is
- **Telegram notifications** — Get notified when it's your turn
- **Leaderboard & match history** — Track wins across all games
- **Daily Wordle streaks** — Compete on the same daily word

## Deployment

Deploy to Vercel — connect the repo and set the environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).

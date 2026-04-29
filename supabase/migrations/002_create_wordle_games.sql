create table wordle_games (
  id uuid primary key default gen_random_uuid(),
  game_type text not null default 'wordle',

  -- Game state
  answer_index int not null,
  guesses jsonb not null default '[]',
  guess_count int not null default 0,

  -- Typing preview (ephemeral, polled)
  player1_typing text,
  player2_typing text,

  -- Outcome
  status text not null default 'waiting',
  winner int,

  -- Players
  player1_id uuid,
  player2_id uuid,
  player1_name text,
  player2_name text,

  -- Timestamps
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable Realtime
alter publication supabase_realtime add table wordle_games;

-- RLS: allow anonymous access for v1
alter table wordle_games enable row level security;
create policy "Allow anonymous select" on wordle_games for select using (true);
create policy "Allow anonymous insert" on wordle_games for insert with check (true);
create policy "Allow anonymous update" on wordle_games for update using (true);
create policy "Allow anonymous delete" on wordle_games for delete using (true);

create table games (
  id uuid primary key default gen_random_uuid(),
  game_type text not null default 'connect-four',
  board jsonb not null default '[[],[],[],[],[],[],[]]',
  current_turn int not null default 1,
  winner int,
  player1_id uuid,
  player2_id uuid,
  player1_name text,
  player2_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable Realtime
alter publication supabase_realtime add table games;

-- RLS: allow anonymous access for v1
alter table games enable row level security;
create policy "Allow anonymous select" on games for select using (true);
create policy "Allow anonymous insert" on games for insert with check (true);
create policy "Allow anonymous update" on games for update using (true);

create table match_results (
  id uuid primary key default gen_random_uuid(),
  game_type text not null,           -- 'connect-four' | 'tic-tac-toe' | 'wordle'
  game_id text,                      -- ID of the game row (for linking back to the game board)
  winner_id uuid,                    -- null for draws and wordle
  winner_name text,                  -- null for draws and wordle
  loser_id uuid,                     -- null for draws and wordle (cooperative)
  loser_name text,                   -- null for draws and wordle (cooperative)
  is_draw boolean not null default false,
  metadata jsonb,                    -- { guessCount: 4, won: true } for wordle; { totalMoves: N } optionally for others
  player1_id uuid not null,
  player1_name text not null,
  player2_id uuid not null,
  player2_name text not null,
  played_at timestamptz not null default now()
);

create index idx_match_results_winner on match_results(winner_id) where winner_id is not null;
create index idx_match_results_played_at on match_results(played_at desc);

alter table match_results enable row level security;
create policy "Allow anonymous select" on match_results for select using (true);
create policy "Allow anonymous insert" on match_results for insert with check (true);
create policy "Allow anonymous delete" on match_results for delete using (true);

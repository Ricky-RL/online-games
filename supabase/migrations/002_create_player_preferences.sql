create table player_preferences (
  player_id uuid primary key,
  player_name text not null,
  color text not null default '#E63946',
  updated_at timestamptz default now()
);

insert into player_preferences (player_id, player_name, color) values
  ('00000000-0000-0000-0000-000000000001', 'Ricky', '#E63946'),
  ('00000000-0000-0000-0000-000000000002', 'Lilian', '#FFBE0B');

alter table player_preferences enable row level security;
create policy "Allow anonymous select" on player_preferences for select using (true);
create policy "Allow anonymous insert" on player_preferences for insert with check (true);
create policy "Allow anonymous update" on player_preferences for update using (true);

alter publication supabase_realtime add table player_preferences;

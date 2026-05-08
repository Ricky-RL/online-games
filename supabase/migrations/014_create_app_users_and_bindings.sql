-- Generalized public users and one-to-one binding.
-- Ricky/Lilian keep their fixed UUIDs so existing games, preferences, and
-- Telegram chat rows remain compatible.
-- Rollback: after applying this migration, call
--   select rollback_generalized_user_binding();
-- to restore the trigger/helper functions that existed before this migration
-- and remove the generalized-user schema objects.

create table if not exists migration_function_backups (
  migration text not null,
  function_signature text not null,
  function_definition text not null,
  backed_up_at timestamptz not null default now(),
  primary key (migration, function_signature)
);

insert into migration_function_backups (migration, function_signature, function_definition)
select '014_create_app_users_and_bindings', signature, pg_get_functiondef(to_regprocedure(signature))
from (values
  ('notify_turn_change()'),
  ('notify_on_player_join()'),
  ('notify_game_created()'),
  ('notify_whiteboard_activity()'),
  ('notify_game_over()'),
  ('notify_wordle_turn()'),
  ('notify_wordle_player_join()'),
  ('notify_wordle_game_created()')
) as functions(signature)
where to_regprocedure(signature) is not null
on conflict (migration, function_signature) do nothing;

create table if not exists app_users (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  bound_user_id uuid references app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint app_users_name_not_blank check (length(trim(name)) > 0),
  constraint app_users_not_self_bound check (bound_user_id is null or bound_user_id <> id)
);

create table if not exists binding_codes (
  code text primary key,
  creator_user_id uuid not null references app_users(id) on delete cascade,
  used_by_user_id uuid references app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  used_at timestamptz,
  constraint binding_codes_single_use check (
    (used_at is null and used_by_user_id is null)
    or (used_at is not null and used_by_user_id is not null)
  )
);

alter table app_users enable row level security;
alter table binding_codes enable row level security;

drop policy if exists "Allow anonymous select" on app_users;
drop policy if exists "Allow anonymous insert" on app_users;
drop policy if exists "Allow anonymous update" on app_users;
drop policy if exists "Allow anonymous delete" on app_users;
create policy "Allow anonymous select" on app_users for select using (true);
create policy "Allow anonymous insert" on app_users for insert with check (true);
create policy "Allow anonymous update" on app_users for update using (true);
create policy "Allow anonymous delete" on app_users for delete using (true);

drop policy if exists "Allow anonymous select" on binding_codes;
drop policy if exists "Allow anonymous insert" on binding_codes;
drop policy if exists "Allow anonymous update" on binding_codes;
drop policy if exists "Allow anonymous delete" on binding_codes;
create policy "Allow anonymous select" on binding_codes for select using (true);
create policy "Allow anonymous insert" on binding_codes for insert with check (true);
create policy "Allow anonymous update" on binding_codes for update using (true);
create policy "Allow anonymous delete" on binding_codes for delete using (true);

alter table inbox_read_state add column if not exists user_id uuid references app_users(id) on delete cascade;
alter table inbox_dismissed_items add column if not exists user_id uuid references app_users(id) on delete cascade;
alter table whiteboard_notes add column if not exists owner_user_id uuid references app_users(id) on delete set null;
alter table whiteboard_notes add column if not exists partner_user_id uuid references app_users(id) on delete set null;
alter table whiteboard_activity add column if not exists actor_user_id uuid references app_users(id) on delete set null;

create unique index if not exists idx_inbox_read_state_user_section
  on inbox_read_state(user_id, section);

create unique index if not exists idx_inbox_dismissed_items_user_item
  on inbox_dismissed_items(user_id, item_type, item_id);

create index if not exists idx_whiteboard_activity_actor_user
  on whiteboard_activity(actor_user_id);

create index if not exists idx_whiteboard_notes_pair
  on whiteboard_notes(owner_user_id, partner_user_id);

insert into app_users (id, name, bound_user_id) values
  ('00000000-0000-0000-0000-000000000001', 'Ricky', '00000000-0000-0000-0000-000000000002'),
  ('00000000-0000-0000-0000-000000000002', 'Lilian', '00000000-0000-0000-0000-000000000001')
on conflict (id) do update set
  name = excluded.name,
  bound_user_id = excluded.bound_user_id,
  updated_at = now();

insert into player_preferences (player_id, player_name, color) values
  ('00000000-0000-0000-0000-000000000001', 'Ricky', '#E63946'),
  ('00000000-0000-0000-0000-000000000002', 'Lilian', '#FFBE0B')
on conflict (player_id) do update set
  player_name = excluded.player_name,
  updated_at = now();

update inbox_read_state
set user_id = case player_name
  when 'Ricky' then '00000000-0000-0000-0000-000000000001'::uuid
  when 'Lilian' then '00000000-0000-0000-0000-000000000002'::uuid
  else user_id
end
where user_id is null;

update inbox_dismissed_items
set user_id = case player_name
  when 'Ricky' then '00000000-0000-0000-0000-000000000001'::uuid
  when 'Lilian' then '00000000-0000-0000-0000-000000000002'::uuid
  else user_id
end
where user_id is null;

update whiteboard_activity
set actor_user_id = case actor_name
  when 'Ricky' then '00000000-0000-0000-0000-000000000001'::uuid
  when 'Lilian' then '00000000-0000-0000-0000-000000000002'::uuid
  else actor_user_id
end
where actor_user_id is null;

update whiteboard_notes
set
  owner_user_id = case created_by_name
    when 'Lilian' then '00000000-0000-0000-0000-000000000002'::uuid
    else '00000000-0000-0000-0000-000000000001'::uuid
  end,
  partner_user_id = case created_by_name
    when 'Lilian' then '00000000-0000-0000-0000-000000000001'::uuid
    else '00000000-0000-0000-0000-000000000002'::uuid
end
where owner_user_id is null and partner_user_id is null;

update games
set
  player1_id = case
    when player1_id is null and player1_name = 'Ricky' then '00000000-0000-0000-0000-000000000001'::uuid
    when player1_id is null and player1_name = 'Lilian' then '00000000-0000-0000-0000-000000000002'::uuid
    else player1_id
  end,
  player2_id = case
    when player2_id is null and player2_name = 'Ricky' then '00000000-0000-0000-0000-000000000001'::uuid
    when player2_id is null and player2_name = 'Lilian' then '00000000-0000-0000-0000-000000000002'::uuid
    else player2_id
  end
where player1_id is null or player2_id is null;

update wordle_games
set
  player1_id = case
    when player1_id is null and player1_name = 'Ricky' then '00000000-0000-0000-0000-000000000001'::uuid
    when player1_id is null and player1_name = 'Lilian' then '00000000-0000-0000-0000-000000000002'::uuid
    else player1_id
  end,
  player2_id = case
    when player2_id is null and player2_name = 'Ricky' then '00000000-0000-0000-0000-000000000001'::uuid
    when player2_id is null and player2_name = 'Lilian' then '00000000-0000-0000-0000-000000000002'::uuid
    else player2_id
  end
where player1_id is null or player2_id is null;

update match_results
set
  winner_id = case
    when winner_id is null and winner_name = 'Ricky' then '00000000-0000-0000-0000-000000000001'::uuid
    when winner_id is null and winner_name = 'Lilian' then '00000000-0000-0000-0000-000000000002'::uuid
    else winner_id
  end,
  loser_id = case
    when loser_id is null and loser_name = 'Ricky' then '00000000-0000-0000-0000-000000000001'::uuid
    when loser_id is null and loser_name = 'Lilian' then '00000000-0000-0000-0000-000000000002'::uuid
    else loser_id
  end,
  player1_id = case
    when player1_id is null and player1_name = 'Ricky' then '00000000-0000-0000-0000-000000000001'::uuid
    when player1_id is null and player1_name = 'Lilian' then '00000000-0000-0000-0000-000000000002'::uuid
    else player1_id
  end,
  player2_id = case
    when player2_id is null and player2_name = 'Ricky' then '00000000-0000-0000-0000-000000000001'::uuid
    when player2_id is null and player2_name = 'Lilian' then '00000000-0000-0000-0000-000000000002'::uuid
    else player2_id
  end
where winner_id is null or loser_id is null or player1_id is null or player2_id is null;

create or replace function create_app_user(_name text)
returns app_users as $$
declare
  _trimmed text := nullif(trim(_name), '');
  _user app_users;
begin
  if _trimmed is null then
    raise exception 'User name is required';
  end if;

  insert into app_users (name)
  values (_trimmed)
  returning * into _user;

  insert into player_preferences (player_id, player_name, color)
  values (_user.id, _user.name, '#E63946')
  on conflict (player_id) do nothing;

  return _user;
end;
$$ language plpgsql security definer;

create or replace function generate_binding_code(_creator_user_id uuid)
returns text as $$
declare
  _creator app_users;
  _code text;
begin
  select * into _creator from app_users where id = _creator_user_id for update;
  if not found then
    raise exception 'Creator user not found';
  end if;
  if _creator.bound_user_id is not null then
    raise exception 'User is already bound';
  end if;

  loop
    _code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    begin
      insert into binding_codes (code, creator_user_id) values (_code, _creator_user_id);
      return _code;
    exception when unique_violation then
      -- Extremely unlikely; retry with a new code.
    end;
  end loop;
end;
$$ language plpgsql security definer;

create or replace function redeem_binding_code(_code text, _user_id uuid)
returns table (
  user_id uuid,
  user_name text,
  bound_user_id uuid,
  bound_user_name text
) as $$
declare
  _normalized_code text := upper(trim(_code));
  _invite binding_codes;
  _creator app_users;
  _joiner app_users;
begin
  select * into _invite from binding_codes where code = _normalized_code for update;
  if not found or _invite.used_at is not null then
    raise exception 'Binding code is invalid or already used';
  end if;

  select * into _creator from app_users where id = _invite.creator_user_id for update;
  select * into _joiner from app_users where id = _user_id for update;

  if not found then
    raise exception 'User not found';
  end if;
  if _creator.id = _joiner.id then
    raise exception 'You cannot bind a user to themselves';
  end if;
  if _creator.bound_user_id is not null or _joiner.bound_user_id is not null then
    raise exception 'One of these users is already bound';
  end if;

  update app_users set bound_user_id = _joiner.id, updated_at = now() where id = _creator.id;
  update app_users set bound_user_id = _creator.id, updated_at = now() where id = _joiner.id;
  update binding_codes set used_by_user_id = _joiner.id, used_at = now() where code = _normalized_code;

  return query
    select _joiner.id, _joiner.name, _creator.id, _creator.name;
end;
$$ language plpgsql security definer;

create or replace function app_user_name(_user_id uuid)
returns text as $$
declare
  _name text;
begin
  select name into _name from app_users where id = _user_id;
  return _name;
end;
$$ language plpgsql stable;

create or replace function app_bound_user_id(_user_id uuid)
returns uuid as $$
declare
  _bound_user_id uuid;
begin
  select bound_user_id into _bound_user_id from app_users where id = _user_id;
  return _bound_user_id;
end;
$$ language plpgsql stable;

create or replace function notify_turn_change()
returns trigger as $$
declare
  _player_name text;
  _opponent_name text;
  _edge_function_url text;
  _payload jsonb;
  _service_role_key text;
begin
  if NEW.current_turn is distinct from OLD.current_turn and NEW.winner is null then
    if NEW.current_turn = 1 and NEW.player1_id is null then return NEW; end if;
    if NEW.current_turn = 2 and NEW.player2_id is null then return NEW; end if;

    if NEW.current_turn = 1 then
      _player_name := coalesce(NEW.player1_name, app_user_name(NEW.player1_id), 'Unknown');
      _opponent_name := coalesce(NEW.player2_name, app_user_name(NEW.player2_id), 'Unknown');
    else
      _player_name := coalesce(NEW.player2_name, app_user_name(NEW.player2_id), 'Unknown');
      _opponent_name := coalesce(NEW.player1_name, app_user_name(NEW.player1_id), 'Unknown');
    end if;

    select value into _service_role_key from app_config where key = 'service_role_key';
    _edge_function_url := 'https://orsntrqzhilmoomleqgg.supabase.co/functions/v1/notify-telegram';
    _payload := jsonb_build_object(
      'player_name', _player_name,
      'opponent_name', _opponent_name,
      'game_type', NEW.game_type,
      'game_id', NEW.id,
      'updated_at', NEW.updated_at
    );

    perform net.http_post(
      url := _edge_function_url,
      headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || _service_role_key),
      body := _payload
    );
  end if;

  return NEW;
end;
$$ language plpgsql security definer;

create or replace function notify_on_player_join()
returns trigger as $$
declare
  _player_name text;
  _opponent_name text;
  _service_role_key text;
  _edge_function_url text;
begin
  if OLD.player2_id is null and NEW.player2_id is not null and NEW.current_turn = 2 and NEW.winner is null then
    _player_name := coalesce(NEW.player2_name, app_user_name(NEW.player2_id), 'Unknown');
    _opponent_name := coalesce(NEW.player1_name, app_user_name(NEW.player1_id), 'Unknown');
  elsif OLD.player1_id is null and NEW.player1_id is not null and NEW.current_turn = 1 and NEW.winner is null then
    _player_name := coalesce(NEW.player1_name, app_user_name(NEW.player1_id), 'Unknown');
    _opponent_name := coalesce(NEW.player2_name, app_user_name(NEW.player2_id), 'Unknown');
  else
    return NEW;
  end if;

  select value into _service_role_key from app_config where key = 'service_role_key';
  _edge_function_url := 'https://orsntrqzhilmoomleqgg.supabase.co/functions/v1/notify-telegram';

  perform net.http_post(
    url := _edge_function_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || _service_role_key),
    body := jsonb_build_object(
      'player_name', _player_name,
      'opponent_name', _opponent_name,
      'game_type', NEW.game_type,
      'game_id', NEW.id,
      'updated_at', NEW.updated_at
    )
  );

  return NEW;
end;
$$ language plpgsql security definer;

create or replace function notify_game_created()
returns trigger as $$
declare
  _opponent_id uuid;
  _opponent_name text;
  _creator_id uuid;
  _creator_name text;
  _service_role_key text;
  _edge_function_url text;
begin
  if NEW.player1_id is not null and NEW.player2_id is not null then return NEW; end if;

  if NEW.player1_id is not null and NEW.player2_id is null then
    _creator_id := NEW.player1_id;
    _creator_name := coalesce(NEW.player1_name, app_user_name(NEW.player1_id), 'Unknown');
  elsif NEW.player2_id is not null and NEW.player1_id is null then
    _creator_id := NEW.player2_id;
    _creator_name := coalesce(NEW.player2_name, app_user_name(NEW.player2_id), 'Unknown');
  else
    return NEW;
  end if;

  _opponent_id := app_bound_user_id(_creator_id);
  if _opponent_id is null then return NEW; end if;
  _opponent_name := app_user_name(_opponent_id);
  if _opponent_name is null then return NEW; end if;

  select value into _service_role_key from app_config where key = 'service_role_key';
  _edge_function_url := 'https://orsntrqzhilmoomleqgg.supabase.co/functions/v1/notify-telegram';

  perform net.http_post(
    url := _edge_function_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || _service_role_key),
    body := jsonb_build_object(
      'player_name', _opponent_name,
      'opponent_name', _creator_name,
      'game_type', NEW.game_type,
      'game_id', NEW.id,
      'updated_at', NEW.updated_at,
      'notification_type', 'game_created'
    )
  );

  return NEW;
end;
$$ language plpgsql security definer;

create or replace function notify_whiteboard_activity()
returns trigger as $$
declare
  _actor_id uuid;
  _other_player text;
  _edge_function_url text;
  _service_role_key text;
begin
  _actor_id := coalesce(
    NEW.actor_user_id,
    case NEW.actor_name
      when 'Ricky' then '00000000-0000-0000-0000-000000000001'::uuid
      when 'Lilian' then '00000000-0000-0000-0000-000000000002'::uuid
      else null
    end
  );

  if _actor_id is null then return NEW; end if;
  _other_player := app_user_name(app_bound_user_id(_actor_id));
  if _other_player is null then return NEW; end if;

  select value into _service_role_key from app_config where key = 'service_role_key';
  _edge_function_url := 'https://orsntrqzhilmoomleqgg.supabase.co/functions/v1/notify-telegram';

  perform net.http_post(
    url := _edge_function_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || _service_role_key),
    body := jsonb_build_object(
      'player_name', _other_player,
      'opponent_name', NEW.actor_name,
      'game_type', 'whiteboard',
      'game_id', NEW.note_id::text,
      'updated_at', NEW.created_at,
      'whiteboard_action', NEW.action,
      'whiteboard_preview', NEW.note_preview
    )
  );

  return NEW;
end;
$$ language plpgsql security definer;

create or replace function notify_game_over()
returns trigger as $$
declare
  _edge_function_url text;
  _service_role_key text;
begin
  select value into _service_role_key from app_config where key = 'service_role_key';
  _edge_function_url := 'https://orsntrqzhilmoomleqgg.supabase.co/functions/v1/notify-telegram';

  if NEW.winner_name is not null then
    perform net.http_post(
      url := _edge_function_url,
      headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || _service_role_key),
      body := jsonb_build_object('player_name', NEW.winner_name, 'opponent_name', NEW.loser_name, 'game_type', NEW.game_type, 'game_id', coalesce(NEW.game_id, NEW.id::text), 'updated_at', NEW.played_at, 'notification_type', 'game_won')
    );
  end if;

  if NEW.loser_name is not null then
    perform net.http_post(
      url := _edge_function_url,
      headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || _service_role_key),
      body := jsonb_build_object('player_name', NEW.loser_name, 'opponent_name', NEW.winner_name, 'game_type', NEW.game_type, 'game_id', coalesce(NEW.game_id, NEW.id::text), 'updated_at', NEW.played_at, 'notification_type', 'game_lost')
    );
  end if;

  if NEW.is_draw then
    perform net.http_post(
      url := _edge_function_url,
      headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || _service_role_key),
      body := jsonb_build_object('player_name', NEW.player1_name, 'opponent_name', NEW.player2_name, 'game_type', NEW.game_type, 'game_id', coalesce(NEW.game_id, NEW.id::text), 'updated_at', NEW.played_at, 'notification_type', 'game_draw')
    );
    perform net.http_post(
      url := _edge_function_url,
      headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || _service_role_key),
      body := jsonb_build_object('player_name', NEW.player2_name, 'opponent_name', NEW.player1_name, 'game_type', NEW.game_type, 'game_id', coalesce(NEW.game_id, NEW.id::text), 'updated_at', NEW.played_at, 'notification_type', 'game_draw')
    );
  end if;

  return NEW;
end;
$$ language plpgsql security definer;

create or replace function notify_wordle_turn()
returns trigger as $$
declare
  _last_guess jsonb;
  _last_player int;
  _player_name text;
  _opponent_name text;
  _edge_function_url text;
  _service_role_key text;
begin
  if NEW.guess_count is not distinct from OLD.guess_count then return NEW; end if;
  if NEW.player1_id is null or NEW.player2_id is null then return NEW; end if;
  if NEW.status not in ('waiting', 'playing') then return NEW; end if;

  _last_guess := NEW.guesses -> (jsonb_array_length(NEW.guesses) - 1);
  _last_player := coalesce((_last_guess ->> 'player')::int, 0);

  if _last_player = 1 then
    _player_name := coalesce(NEW.player2_name, app_user_name(NEW.player2_id), 'Unknown');
    _opponent_name := coalesce(NEW.player1_name, app_user_name(NEW.player1_id), 'Unknown');
  elsif _last_player = 2 then
    _player_name := coalesce(NEW.player1_name, app_user_name(NEW.player1_id), 'Unknown');
    _opponent_name := coalesce(NEW.player2_name, app_user_name(NEW.player2_id), 'Unknown');
  else
    return NEW;
  end if;

  select value into _service_role_key from app_config where key = 'service_role_key';
  _edge_function_url := 'https://orsntrqzhilmoomleqgg.supabase.co/functions/v1/notify-telegram';

  perform net.http_post(
    url := _edge_function_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || _service_role_key),
    body := jsonb_build_object(
      'player_name', _player_name,
      'opponent_name', _opponent_name,
      'game_type', 'wordle',
      'game_id', NEW.id,
      'updated_at', NEW.updated_at
    )
  );

  return NEW;
end;
$$ language plpgsql security definer;

create or replace function notify_wordle_player_join()
returns trigger as $$
declare
  _player_name text;
  _opponent_name text;
  _service_role_key text;
  _edge_function_url text;
begin
  if OLD.player2_id is null and NEW.player2_id is not null and NEW.status in ('waiting', 'playing') then
    _player_name := coalesce(NEW.player2_name, app_user_name(NEW.player2_id), 'Unknown');
    _opponent_name := coalesce(NEW.player1_name, app_user_name(NEW.player1_id), 'Unknown');
  elsif OLD.player1_id is null and NEW.player1_id is not null and NEW.status in ('waiting', 'playing') then
    _player_name := coalesce(NEW.player1_name, app_user_name(NEW.player1_id), 'Unknown');
    _opponent_name := coalesce(NEW.player2_name, app_user_name(NEW.player2_id), 'Unknown');
  else
    return NEW;
  end if;

  select value into _service_role_key from app_config where key = 'service_role_key';
  _edge_function_url := 'https://orsntrqzhilmoomleqgg.supabase.co/functions/v1/notify-telegram';

  perform net.http_post(
    url := _edge_function_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || _service_role_key),
    body := jsonb_build_object(
      'player_name', _player_name,
      'opponent_name', _opponent_name,
      'game_type', 'wordle',
      'game_id', NEW.id,
      'updated_at', NEW.updated_at
    )
  );

  return NEW;
end;
$$ language plpgsql security definer;

create or replace function notify_wordle_game_created()
returns trigger as $$
declare
  _creator_id uuid;
  _creator_name text;
  _opponent_name text;
  _service_role_key text;
  _edge_function_url text;
begin
  if NEW.player1_id is not null and NEW.player2_id is not null then return NEW; end if;

  if NEW.player1_id is not null and NEW.player2_id is null then
    _creator_id := NEW.player1_id;
    _creator_name := coalesce(NEW.player1_name, app_user_name(NEW.player1_id), 'Unknown');
  elsif NEW.player2_id is not null and NEW.player1_id is null then
    _creator_id := NEW.player2_id;
    _creator_name := coalesce(NEW.player2_name, app_user_name(NEW.player2_id), 'Unknown');
  else
    return NEW;
  end if;

  _opponent_name := app_user_name(app_bound_user_id(_creator_id));
  if _opponent_name is null then return NEW; end if;

  select value into _service_role_key from app_config where key = 'service_role_key';
  _edge_function_url := 'https://orsntrqzhilmoomleqgg.supabase.co/functions/v1/notify-telegram';

  perform net.http_post(
    url := _edge_function_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || _service_role_key),
    body := jsonb_build_object(
      'player_name', _opponent_name,
      'opponent_name', _creator_name,
      'game_type', 'wordle',
      'game_id', NEW.id,
      'updated_at', NEW.updated_at,
      'notification_type', 'game_created'
    )
  );

  return NEW;
end;
$$ language plpgsql security definer;

create or replace function rollback_generalized_user_binding()
returns void as $$
declare
  _backup record;
begin
  for _backup in
    select function_definition
    from migration_function_backups
    where migration = '014_create_app_users_and_bindings'
    order by function_signature
  loop
    execute _backup.function_definition;
  end loop;

  drop function if exists create_app_user(text);
  drop function if exists generate_binding_code(uuid);
  drop function if exists redeem_binding_code(text, uuid);
  drop function if exists app_user_name(uuid);
  drop function if exists app_bound_user_id(uuid);

  drop policy if exists "Allow anonymous select" on binding_codes;
  drop policy if exists "Allow anonymous insert" on binding_codes;
  drop policy if exists "Allow anonymous update" on binding_codes;
  drop policy if exists "Allow anonymous delete" on binding_codes;
  drop policy if exists "Allow anonymous select" on app_users;
  drop policy if exists "Allow anonymous insert" on app_users;
  drop policy if exists "Allow anonymous update" on app_users;
  drop policy if exists "Allow anonymous delete" on app_users;

  drop table if exists binding_codes;

  drop index if exists idx_whiteboard_notes_pair;
  drop index if exists idx_whiteboard_activity_actor_user;
  drop index if exists idx_inbox_dismissed_items_user_item;
  drop index if exists idx_inbox_read_state_user_section;

  alter table if exists whiteboard_activity drop column if exists actor_user_id;
  alter table if exists whiteboard_notes drop column if exists partner_user_id;
  alter table if exists whiteboard_notes drop column if exists owner_user_id;
  alter table if exists inbox_dismissed_items drop column if exists user_id;
  alter table if exists inbox_read_state drop column if exists user_id;

  drop table if exists app_users;
end;
$$ language plpgsql security definer;

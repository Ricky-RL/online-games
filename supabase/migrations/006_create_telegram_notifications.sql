-- Enable pg_net extension for HTTP requests from triggers
create extension if not exists pg_net with schema extensions;

-- Config table to store secrets accessible from triggers
create table if not exists app_config (
  key text primary key,
  value text not null
);
alter table app_config enable row level security;

-- Table to store Telegram chat IDs for each player
create table telegram_chat_ids (
  player_name text primary key,
  chat_id bigint not null,
  enabled boolean not null default true,
  created_at timestamptz default now()
);

-- RLS: allow anonymous access (matches existing pattern)
alter table telegram_chat_ids enable row level security;
create policy "Allow anonymous select" on telegram_chat_ids for select using (true);
create policy "Allow anonymous insert" on telegram_chat_ids for insert with check (true);
create policy "Allow anonymous update" on telegram_chat_ids for update using (true);

-- Trigger function: notify player via Telegram when it becomes their turn
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

    -- Skip if the target player slot hasn't been filled yet (async play)
    if NEW.current_turn = 1 and NEW.player1_id is null then
      return NEW;
    end if;
    if NEW.current_turn = 2 and NEW.player2_id is null then
      return NEW;
    end if;

    if NEW.current_turn = 1 then
      _player_name := coalesce(NEW.player1_name,
        case NEW.player1_id
          when '00000000-0000-0000-0000-000000000001'::uuid then 'Ricky'
          when '00000000-0000-0000-0000-000000000002'::uuid then 'Lilian'
          else 'Unknown'
        end);
      _opponent_name := coalesce(NEW.player2_name,
        case NEW.player2_id
          when '00000000-0000-0000-0000-000000000001'::uuid then 'Ricky'
          when '00000000-0000-0000-0000-000000000002'::uuid then 'Lilian'
          else 'Unknown'
        end);
    else
      _player_name := coalesce(NEW.player2_name,
        case NEW.player2_id
          when '00000000-0000-0000-0000-000000000001'::uuid then 'Ricky'
          when '00000000-0000-0000-0000-000000000002'::uuid then 'Lilian'
          else 'Unknown'
        end);
      _opponent_name := coalesce(NEW.player1_name,
        case NEW.player1_id
          when '00000000-0000-0000-0000-000000000001'::uuid then 'Ricky'
          when '00000000-0000-0000-0000-000000000002'::uuid then 'Lilian'
          else 'Unknown'
        end);
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
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || _service_role_key
      ),
      body := _payload
    );

  end if;

  return NEW;
end;
$$ language plpgsql security definer;

-- Attach trigger to games table
create trigger on_turn_change
  after update on games
  for each row
  when (OLD.current_turn is distinct from NEW.current_turn)
  execute function notify_turn_change();

-- Trigger function: notify player when opponent joins and it's already their turn
create or replace function notify_on_player_join()
returns trigger as $$
declare
  _player_name text;
  _opponent_name text;
  _payload jsonb;
  _service_role_key text;
  _edge_function_url text;
begin
  -- Fire when player2 joins and it's already their turn
  if OLD.player2_id is null and NEW.player2_id is not null and NEW.current_turn = 2 and NEW.winner is null then
    _player_name := coalesce(NEW.player2_name,
      case NEW.player2_id
        when '00000000-0000-0000-0000-000000000001'::uuid then 'Ricky'
        when '00000000-0000-0000-0000-000000000002'::uuid then 'Lilian'
        else 'Unknown'
      end);
    _opponent_name := coalesce(NEW.player1_name,
      case NEW.player1_id
        when '00000000-0000-0000-0000-000000000001'::uuid then 'Ricky'
        when '00000000-0000-0000-0000-000000000002'::uuid then 'Lilian'
        else 'Unknown'
      end);
  -- Fire when player1 joins and it's already their turn
  elsif OLD.player1_id is null and NEW.player1_id is not null and NEW.current_turn = 1 and NEW.winner is null then
    _player_name := coalesce(NEW.player1_name,
      case NEW.player1_id
        when '00000000-0000-0000-0000-000000000001'::uuid then 'Ricky'
        when '00000000-0000-0000-0000-000000000002'::uuid then 'Lilian'
        else 'Unknown'
      end);
    _opponent_name := coalesce(NEW.player2_name,
      case NEW.player2_id
        when '00000000-0000-0000-0000-000000000001'::uuid then 'Ricky'
        when '00000000-0000-0000-0000-000000000002'::uuid then 'Lilian'
        else 'Unknown'
      end);
  else
    return NEW;
  end if;

  select value into _service_role_key from app_config where key = 'service_role_key';
  _edge_function_url := 'https://orsntrqzhilmoomleqgg.supabase.co/functions/v1/notify-telegram';

  perform net.http_post(
    url := _edge_function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || _service_role_key
    ),
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

-- Attach trigger for player join
create trigger on_player_join
  after update on games
  for each row
  when (OLD.player1_id is distinct from NEW.player1_id or OLD.player2_id is distinct from NEW.player2_id)
  execute function notify_on_player_join();

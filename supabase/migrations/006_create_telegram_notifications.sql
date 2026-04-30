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
  -- Only fire when current_turn actually changed and game is not over
  if NEW.current_turn is distinct from OLD.current_turn and NEW.winner is null then

    -- Resolve player name from current_turn (1 or 2)
    if NEW.current_turn = 1 then
      _player_name := NEW.player1_name;
      _opponent_name := NEW.player2_name;
    else
      _player_name := NEW.player2_name;
      _opponent_name := NEW.player1_name;
    end if;

    -- Fallback: resolve from player IDs if names are null
    if _player_name is null then
      case
        when NEW.current_turn = 1 and NEW.player1_id = '00000000-0000-0000-0000-000000000001'::uuid then _player_name := 'Ricky';
        when NEW.current_turn = 1 and NEW.player1_id = '00000000-0000-0000-0000-000000000002'::uuid then _player_name := 'Lilian';
        when NEW.current_turn = 2 and NEW.player2_id = '00000000-0000-0000-0000-000000000001'::uuid then _player_name := 'Ricky';
        when NEW.current_turn = 2 and NEW.player2_id = '00000000-0000-0000-0000-000000000002'::uuid then _player_name := 'Lilian';
        else _player_name := 'Unknown';
      end case;
    end if;

    if _opponent_name is null then
      case
        when NEW.current_turn = 1 and NEW.player2_id = '00000000-0000-0000-0000-000000000001'::uuid then _opponent_name := 'Ricky';
        when NEW.current_turn = 1 and NEW.player2_id = '00000000-0000-0000-0000-000000000002'::uuid then _opponent_name := 'Lilian';
        when NEW.current_turn = 2 and NEW.player1_id = '00000000-0000-0000-0000-000000000001'::uuid then _opponent_name := 'Ricky';
        when NEW.current_turn = 2 and NEW.player1_id = '00000000-0000-0000-0000-000000000002'::uuid then _opponent_name := 'Lilian';
        else _opponent_name := 'Unknown';
      end case;
    end if;

    -- Build the Edge Function URL
    _edge_function_url := 'https://orsntrqzhilmoomleqgg.supabase.co/functions/v1/notify-telegram';

    -- Build payload
    _payload := jsonb_build_object(
      'player_name', _player_name,
      'opponent_name', _opponent_name,
      'game_type', NEW.game_type,
      'game_id', NEW.id,
      'updated_at', NEW.updated_at
    );

    -- Read service role key from config table
    select value into _service_role_key from app_config where key = 'service_role_key';

    -- Call Edge Function via pg_net
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

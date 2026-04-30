-- Add game_id column to match_results for linking back to the game
alter table match_results add column if not exists game_id text;

-- Trigger function: notify both players via Telegram when a game ends (win/lose/draw)
create or replace function notify_game_over()
returns trigger as $$
declare
  _edge_function_url text;
  _service_role_key text;
begin
  select value into _service_role_key from app_config where key = 'service_role_key';
  _edge_function_url := 'https://orsntrqzhilmoomleqgg.supabase.co/functions/v1/notify-telegram';

  -- Notify the winner
  if NEW.winner_name is not null then
    perform net.http_post(
      url := _edge_function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || _service_role_key
      ),
      body := jsonb_build_object(
        'player_name', NEW.winner_name,
        'opponent_name', NEW.loser_name,
        'game_type', NEW.game_type,
        'game_id', coalesce(NEW.game_id, NEW.id::text),
        'updated_at', NEW.played_at,
        'notification_type', 'game_won'
      )
    );
  end if;

  -- Notify the loser
  if NEW.loser_name is not null then
    perform net.http_post(
      url := _edge_function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || _service_role_key
      ),
      body := jsonb_build_object(
        'player_name', NEW.loser_name,
        'opponent_name', NEW.winner_name,
        'game_type', NEW.game_type,
        'game_id', coalesce(NEW.game_id, NEW.id::text),
        'updated_at', NEW.played_at,
        'notification_type', 'game_lost'
      )
    );
  end if;

  -- Notify both players on draw
  if NEW.is_draw then
    perform net.http_post(
      url := _edge_function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || _service_role_key
      ),
      body := jsonb_build_object(
        'player_name', NEW.player1_name,
        'opponent_name', NEW.player2_name,
        'game_type', NEW.game_type,
        'game_id', coalesce(NEW.game_id, NEW.id::text),
        'updated_at', NEW.played_at,
        'notification_type', 'game_draw'
      )
    );
    perform net.http_post(
      url := _edge_function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || _service_role_key
      ),
      body := jsonb_build_object(
        'player_name', NEW.player2_name,
        'opponent_name', NEW.player1_name,
        'game_type', NEW.game_type,
        'game_id', coalesce(NEW.game_id, NEW.id::text),
        'updated_at', NEW.played_at,
        'notification_type', 'game_draw'
      )
    );
  end if;

  return NEW;
end;
$$ language plpgsql security definer;

-- Attach trigger to match_results table
create trigger on_game_over
  after insert on match_results
  for each row
  execute function notify_game_over();

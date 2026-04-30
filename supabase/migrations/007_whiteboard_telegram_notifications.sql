-- Trigger function: notify the OTHER player via Telegram when whiteboard activity occurs
create or replace function notify_whiteboard_activity()
returns trigger as $$
declare
  _other_player text;
  _edge_function_url text;
  _service_role_key text;
  _payload jsonb;
begin
  -- Determine the other player (only two players: Ricky and Lilian)
  if NEW.actor_name = 'Ricky' then
    _other_player := 'Lilian';
  elsif NEW.actor_name = 'Lilian' then
    _other_player := 'Ricky';
  else
    return NEW;
  end if;

  select value into _service_role_key from app_config where key = 'service_role_key';
  _edge_function_url := 'https://orsntrqzhilmoomleqgg.supabase.co/functions/v1/notify-telegram';

  _payload := jsonb_build_object(
    'player_name', _other_player,
    'opponent_name', NEW.actor_name,
    'game_type', 'whiteboard',
    'game_id', NEW.note_id::text,
    'updated_at', NEW.created_at,
    'whiteboard_action', NEW.action,
    'whiteboard_preview', NEW.note_preview
  );

  perform net.http_post(
    url := _edge_function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || _service_role_key
    ),
    body := _payload
  );

  return NEW;
end;
$$ language plpgsql security definer;

-- Attach trigger to whiteboard_activity table
create trigger on_whiteboard_activity
  after insert on whiteboard_activity
  for each row
  execute function notify_whiteboard_activity();

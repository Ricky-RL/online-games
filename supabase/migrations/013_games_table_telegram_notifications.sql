-- AFTER INSERT trigger on the games table: notify the opponent via Telegram
-- when a new game is created (async play pattern — one player creates, the other is absent).

create or replace function notify_game_created()
returns trigger as $$
declare
  _opponent_name text;
  _creator_name text;
  _service_role_key text;
  _edge_function_url text;
  _payload jsonb;
begin
  -- Only notify if the game has exactly one player (async play: opponent slot empty)
  -- If both players are present at creation, no notification needed here
  if NEW.player1_id is not null and NEW.player2_id is not null then
    return NEW;
  end if;

  -- Determine the creator and the expected opponent
  if NEW.player1_id is not null and NEW.player2_id is null then
    _creator_name := coalesce(NEW.player1_name,
      case NEW.player1_id
        when '00000000-0000-0000-0000-000000000001'::uuid then 'Ricky'
        when '00000000-0000-0000-0000-000000000002'::uuid then 'Lilian'
        else 'Unknown'
      end);
    -- The opponent is the other player (2-player system)
    _opponent_name := case _creator_name
      when 'Ricky' then 'Lilian'
      when 'Lilian' then 'Ricky'
      else null
    end;
  elsif NEW.player2_id is not null and NEW.player1_id is null then
    _creator_name := coalesce(NEW.player2_name,
      case NEW.player2_id
        when '00000000-0000-0000-0000-000000000001'::uuid then 'Ricky'
        when '00000000-0000-0000-0000-000000000002'::uuid then 'Lilian'
        else 'Unknown'
      end);
    _opponent_name := case _creator_name
      when 'Ricky' then 'Lilian'
      when 'Lilian' then 'Ricky'
      else null
    end;
  else
    -- No players at all (shouldn't happen)
    return NEW;
  end if;

  -- Don't notify if we can't determine the opponent
  if _opponent_name is null then
    return NEW;
  end if;

  select value into _service_role_key from app_config where key = 'service_role_key';
  _edge_function_url := 'https://orsntrqzhilmoomleqgg.supabase.co/functions/v1/notify-telegram';

  _payload := jsonb_build_object(
    'player_name', _opponent_name,
    'opponent_name', _creator_name,
    'game_type', NEW.game_type,
    'game_id', NEW.id,
    'updated_at', NEW.updated_at,
    'notification_type', 'game_created'
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

-- Attach INSERT trigger for game creation on the games table
create trigger on_game_created
  after insert on games
  for each row
  execute function notify_game_created();

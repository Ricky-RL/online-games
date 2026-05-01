-- Fix Wordle Telegram notifications for game start
-- Bug: notify_wordle_player_join checks NEW.status = 'waiting' but games are
-- created with status = 'playing', so the trigger never fires.
-- Also adds an INSERT trigger to notify the opponent when a game is created.

-- 1. Fix the player-join trigger: accept both 'waiting' and 'playing' status
create or replace function notify_wordle_player_join()
returns trigger as $$
declare
  _player_name text;
  _opponent_name text;
  _payload jsonb;
  _service_role_key text;
  _edge_function_url text;
  _last_guess_player int;
begin
  -- Fire when player2 joins (player2_id goes from null to non-null)
  if OLD.player2_id is null and NEW.player2_id is not null and NEW.status in ('waiting', 'playing') then
    -- Determine whose turn it is: if no guesses yet or last guess was player1, it's player2's turn
    if NEW.guess_count = 0 then
      -- No guesses yet; in a fresh game the joining player (player2) gets notified
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
    else
      _last_guess_player := (NEW.guesses -> (NEW.guess_count - 1) ->> 'player')::int;
      if _last_guess_player = 1 then
        -- Last guess was player1, so it's player2's turn
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
      else
        -- Last guess was player2 (unlikely at join time, but handle gracefully)
        -- Notify player1 it's their turn
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
      end if;
    end if;
  -- Fire when player1 joins (less common but possible with async play)
  elsif OLD.player1_id is null and NEW.player1_id is not null and NEW.status in ('waiting', 'playing') then
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
      'game_type', 'wordle',
      'game_id', NEW.id,
      'updated_at', NEW.updated_at
    )
  );

  return NEW;
end;
$$ language plpgsql security definer;

-- 2. Add INSERT trigger: notify the opponent via Telegram when a Wordle game is created
-- This notifies the other player that a new game is waiting for them.
create or replace function notify_wordle_game_created()
returns trigger as $$
declare
  _opponent_name text;
  _creator_name text;
  _payload jsonb;
  _service_role_key text;
  _edge_function_url text;
begin
  -- Only notify if the game has exactly one player (async play: opponent slot empty)
  -- If both players are present at creation, the player-join trigger handles it
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
    'game_type', 'wordle',
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

  return NEW;
end;
$$ language plpgsql security definer;

-- Attach INSERT trigger for wordle game creation
create trigger on_wordle_game_created
  after insert on wordle_games
  for each row
  execute function notify_wordle_game_created();

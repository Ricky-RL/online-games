-- Trigger function: notify the other player via Telegram when a guess is submitted in Wordle
-- Wordle has no current_turn column; turns alternate implicitly via guess_count.
-- After a guess, the LAST entry in the guesses JSONB array tells us who just played.
-- The other player should be notified it's their turn.
create or replace function notify_wordle_turn()
returns trigger as $$
declare
  _last_guess_player int;
  _player_name text;
  _opponent_name text;
  _edge_function_url text;
  _service_role_key text;
  _payload jsonb;
begin
  -- Only fire when guess_count actually increases and game is still in progress
  if NEW.guess_count <= OLD.guess_count then
    return NEW;
  end if;
  if NEW.status in ('won', 'lost') then
    return NEW;
  end if;

  -- Both players must be present
  if NEW.player1_id is null or NEW.player2_id is null then
    return NEW;
  end if;

  -- Determine who just guessed from the last entry in the guesses array
  _last_guess_player := (NEW.guesses -> (NEW.guess_count - 1) ->> 'player')::int;

  -- Notify the OTHER player (it's now their turn)
  if _last_guess_player = 1 then
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
  elsif _last_guess_player = 2 then
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

  _payload := jsonb_build_object(
    'player_name', _player_name,
    'opponent_name', _opponent_name,
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

-- Attach trigger: fires when guess_count changes on wordle_games
create trigger on_wordle_turn
  after update on wordle_games
  for each row
  when (OLD.guess_count is distinct from NEW.guess_count)
  execute function notify_wordle_turn();

-- Trigger function: notify player when opponent joins a Wordle game
-- In Wordle, player2 joining means it's their turn to guess (or player1's, depending on state)
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
  if OLD.player2_id is null and NEW.player2_id is not null and NEW.status = 'waiting' then
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
  elsif OLD.player1_id is null and NEW.player1_id is not null and NEW.status = 'waiting' then
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

-- Attach trigger for player join on wordle_games
create trigger on_wordle_player_join
  after update on wordle_games
  for each row
  when (OLD.player1_id is distinct from NEW.player1_id or OLD.player2_id is distinct from NEW.player2_id)
  execute function notify_wordle_player_join();

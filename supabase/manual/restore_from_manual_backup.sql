-- Restore data from a snapshot created by backup_pre_migration.sql.
--
-- Usage:
-- 1) Optional: set _snapshot_override to a specific snapshot id.
-- 2) Run in Supabase SQL Editor.
--
-- If _snapshot_override is null, this restores from the latest snapshot.

begin;

do $$
declare
  _snapshot_override text := null; -- e.g. 'pre_migration_20260507_113015'
  _snapshot text;
  _entry record;
  _cols text;
  _restore_order text[] := array[
    'app_config',
    'telegram_chat_ids',
    'player_preferences',
    'whiteboard_notes',
    'games',
    'wordle_games',
    'match_results',
    'inbox_read_state',
    'inbox_dismissed_items',
    'whiteboard_activity'
  ];
  _clear_order text[] := array[
    'whiteboard_activity',
    'inbox_dismissed_items',
    'inbox_read_state',
    'match_results',
    'wordle_games',
    'games',
    'whiteboard_notes',
    'player_preferences',
    'telegram_chat_ids',
    'app_config'
  ];
  _t text;
begin
  select coalesce(_snapshot_override, (
    select snapshot_id
    from manual_backups.snapshot_registry
    order by created_at desc
    limit 1
  ))
  into _snapshot;

  if _snapshot is null then
    raise exception 'No backup snapshot found in manual_backups.snapshot_registry';
  end if;

  if not exists (
    select 1
    from manual_backups.snapshot_registry
    where snapshot_id = _snapshot
  ) then
    raise exception 'Snapshot % does not exist', _snapshot;
  end if;

  -- Clear current table data in a dependency-safe order.
  foreach _t in array _clear_order loop
    if to_regclass(format('public.%I', _t)) is not null then
      execute format('delete from public.%I', _t);
    end if;
  end loop;

  -- Restore in parent-first order, using only shared columns so this works
  -- even if schema changed between backup and restore.
  foreach _t in array _restore_order loop
    select st.source_table, st.backup_table
    into _entry
    from manual_backups.snapshot_tables st
    where st.snapshot_id = _snapshot
      and st.source_table = _t;

    if not found then
      continue;
    end if;

    select string_agg(format('%I', c.column_name), ', ' order by c.ordinal_position)
    into _cols
    from information_schema.columns c
    join information_schema.columns b
      on b.table_schema = 'manual_backups'
     and b.table_name = _entry.backup_table
     and b.column_name = c.column_name
    where c.table_schema = 'public'
      and c.table_name = _entry.source_table;

    if _cols is null then
      raise exception 'No shared columns between public.% and manual_backups.%',
        _entry.source_table, _entry.backup_table;
    end if;

    execute format(
      'insert into public.%I (%s) select %s from manual_backups.%I',
      _entry.source_table,
      _cols,
      _cols,
      _entry.backup_table
    );
  end loop;

  raise notice 'Data restore completed from snapshot: %', _snapshot;
end;
$$ language plpgsql;

commit;


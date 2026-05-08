-- Manual data backup for migration safety.
-- Run this in Supabase SQL Editor immediately before applying a risky migration.
--
-- What it does:
-- 1) Creates a snapshot id like: pre_migration_20260507_113015
-- 2) Copies selected public tables into schema manual_backups
-- 3) Records snapshot metadata + per-table backup table names/row counts
--
-- To see the snapshot id after running:
-- select * from manual_backups.snapshot_registry order by created_at desc limit 1;
-- select * from manual_backups.snapshot_tables where snapshot_id = '<snapshot_id>' order by capture_order;

begin;

create schema if not exists manual_backups;

create table if not exists manual_backups.snapshot_registry (
  snapshot_id text primary key,
  created_at timestamptz not null default now(),
  created_by text not null default current_user,
  notes text
);

create table if not exists manual_backups.snapshot_tables (
  snapshot_id text not null references manual_backups.snapshot_registry(snapshot_id) on delete cascade,
  capture_order int not null,
  source_table text not null,
  backup_table text not null,
  row_count bigint not null,
  primary key (snapshot_id, source_table)
);

do $$
declare
  _snapshot text := 'pre_migration_' || to_char(clock_timestamp(), 'YYYYMMDD_HH24MISS');
  _tables text[] := array[
    'games',
    'wordle_games',
    'match_results',
    'player_preferences',
    'whiteboard_notes',
    'whiteboard_activity',
    'inbox_read_state',
    'inbox_dismissed_items',
    'telegram_chat_ids',
    'app_config'
  ];
  _idx int := 1;
  _t text;
  _backup_table text;
  _count bigint;
begin
  insert into manual_backups.snapshot_registry (snapshot_id, notes)
  values (_snapshot, 'Manual backup before migration');

  foreach _t in array _tables loop
    if to_regclass(format('public.%I', _t)) is null then
      raise notice 'Skipping table % (not found)', _t;
      _idx := _idx + 1;
      continue;
    end if;

    _backup_table := format('%I__%s', _t, _snapshot);

    execute format(
      'create table manual_backups.%I as table public.%I',
      _backup_table,
      _t
    );

    execute format('select count(*) from manual_backups.%I', _backup_table)
      into _count;

    insert into manual_backups.snapshot_tables (
      snapshot_id,
      capture_order,
      source_table,
      backup_table,
      row_count
    )
    values (
      _snapshot,
      _idx,
      _t,
      _backup_table,
      _count
    );

    _idx := _idx + 1;
  end loop;

  raise notice 'Manual backup snapshot created: %', _snapshot;
end;
$$ language plpgsql;

commit;


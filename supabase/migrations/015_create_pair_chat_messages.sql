create table if not exists pair_chat_messages (
  id uuid primary key default gen_random_uuid(),
  pair_key text not null,
  sender_user_id uuid not null references app_users(id) on delete cascade,
  recipient_user_id uuid not null references app_users(id) on delete cascade,
  body text not null check (length(trim(body)) > 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_pair_chat_pair_created
  on pair_chat_messages(pair_key, created_at desc);

create index if not exists idx_pair_chat_recipient_created
  on pair_chat_messages(recipient_user_id, created_at desc);

alter publication supabase_realtime add table pair_chat_messages;

alter table pair_chat_messages enable row level security;

drop policy if exists "Allow anonymous select" on pair_chat_messages;
drop policy if exists "Allow anonymous insert" on pair_chat_messages;

create policy "Allow anonymous select" on pair_chat_messages for select using (true);
create policy "Allow anonymous insert" on pair_chat_messages for insert with check (true);

create or replace function trim_pair_chat_messages()
returns trigger as $$
begin
  delete from pair_chat_messages
  where pair_key = new.pair_key
    and id in (
      select id
      from pair_chat_messages
      where pair_key = new.pair_key
      order by created_at desc
      offset 500
    );

  return new;
end;
$$ language plpgsql;

drop trigger if exists trim_pair_chat_messages_after_insert on pair_chat_messages;

create trigger trim_pair_chat_messages_after_insert
after insert on pair_chat_messages
for each row
execute function trim_pair_chat_messages();

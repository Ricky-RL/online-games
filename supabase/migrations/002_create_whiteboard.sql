create table whiteboard_notes (
  id uuid primary key default gen_random_uuid(),

  -- Content: either text or drawing (one will be null/empty)
  content_type text not null default 'text' check (content_type in ('text', 'drawing')),
  text_content text not null default '',
  drawing_data jsonb,

  -- Position on canvas (top-left corner of the note)
  position_x float not null default 0,
  position_y float not null default 0,

  -- Dimensions (for layout, default sticky note size)
  width float not null default 200,
  height float not null default 200,

  -- Appearance
  color text not null default '#FFEB3B',

  -- Ownership (who created it — for display, NOT for permission gating)
  created_by_name text,

  -- Timestamps
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable Realtime
alter publication supabase_realtime add table whiteboard_notes;

-- RLS: allow anonymous access for v1
alter table whiteboard_notes enable row level security;
create policy "Allow anonymous select" on whiteboard_notes for select using (true);
create policy "Allow anonymous insert" on whiteboard_notes for insert with check (true);
create policy "Allow anonymous update" on whiteboard_notes for update using (true);
create policy "Allow anonymous delete" on whiteboard_notes for delete using (true);

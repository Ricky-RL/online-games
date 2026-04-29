CREATE TABLE whiteboard_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL,
  action TEXT NOT NULL,                 -- 'created' | 'updated' | 'deleted'
  actor_name TEXT NOT NULL,             -- 'Ricky' or 'Lilian'
  note_preview TEXT,                    -- first ~50 chars of text or '[drawing]'
  note_color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_whiteboard_activity_created_at ON whiteboard_activity(created_at DESC);
CREATE INDEX idx_whiteboard_activity_actor ON whiteboard_activity(actor_name);

-- Enable RLS but allow anonymous access (same pattern as other tables)
ALTER TABLE whiteboard_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anonymous read" ON whiteboard_activity FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert" ON whiteboard_activity FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous delete" ON whiteboard_activity FOR DELETE USING (true);

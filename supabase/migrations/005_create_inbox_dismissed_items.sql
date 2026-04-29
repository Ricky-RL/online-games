CREATE TABLE inbox_dismissed_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_name TEXT NOT NULL,
  item_type TEXT NOT NULL,                -- 'game' or 'whiteboard'
  item_id TEXT NOT NULL,                  -- references game id or whiteboard_activity id
  dismissed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(player_name, item_type, item_id)
);

ALTER TABLE inbox_dismissed_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anonymous read" ON inbox_dismissed_items FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert" ON inbox_dismissed_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous delete" ON inbox_dismissed_items FOR DELETE USING (true);

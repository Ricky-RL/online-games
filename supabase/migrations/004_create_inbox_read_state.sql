CREATE TABLE inbox_read_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_name TEXT NOT NULL,
  section TEXT NOT NULL,                -- 'games' or 'whiteboard'
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(player_name, section)
);

ALTER TABLE inbox_read_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anonymous read" ON inbox_read_state FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert" ON inbox_read_state FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update" ON inbox_read_state FOR UPDATE USING (true);

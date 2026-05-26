-- Run this in the Supabase Dashboard → SQL Editor

-- 1. Enable RLS on the tasks table
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- 2. Drop any existing permissive policies
DROP POLICY IF EXISTS "Allow all" ON tasks;
DROP POLICY IF EXISTS "Enable read access for all users" ON tasks;
DROP POLICY IF EXISTS "Enable all access" ON tasks;

-- 3. Everyone (including anonymous visitors) can read tasks
CREATE POLICY "tasks_read_public"
  ON tasks FOR SELECT
  USING (true);

-- 4. Block all direct INSERT/UPDATE/DELETE from the frontend (anon key)
--    The Edge Functions use the service role key which bypasses RLS entirely.
CREATE POLICY "tasks_write_blocked"
  ON tasks FOR ALL
  USING (false)
  WITH CHECK (false);

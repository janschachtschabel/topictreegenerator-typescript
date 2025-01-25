/*
  # Update RLS policies for topic_trees table
  
  1. Changes
    - Drop existing policies
    - Create new policies for all CRUD operations
    - Add explicit UPDATE policy for upsert operations
  
  2. Security
    - All policies restricted to authenticated users
    - Users can only access their own data
    - Both USING and WITH CHECK clauses for UPDATE policy
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read own topic trees" ON topic_trees;
DROP POLICY IF EXISTS "Users can create topic trees" ON topic_trees;
DROP POLICY IF EXISTS "Users can insert own topic trees" ON topic_trees;
DROP POLICY IF EXISTS "Users can update own topic trees" ON topic_trees;
DROP POLICY IF EXISTS "Users can delete own topic trees" ON topic_trees;

-- Create new policies
CREATE POLICY "Users can read own topic trees"
  ON topic_trees
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own topic trees"
  ON topic_trees
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own topic trees"
  ON topic_trees
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own topic trees"
  ON topic_trees
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
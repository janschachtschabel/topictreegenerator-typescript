/*
  # Create topic trees table

  1. New Tables
    - `topic_trees`
      - `id` (uuid, primary key)
      - `title` (text)
      - `tree_data` (jsonb)
      - `created_at` (timestamp)
      - `user_id` (uuid, foreign key to auth.users)
      - `document_ids` (text array)

  2. Security
    - Enable RLS on `topic_trees` table
    - Add policies for authenticated users to:
      - Read their own topic trees
      - Create new topic trees
      - Delete their own topic trees
*/

-- Create topic_trees table
CREATE TABLE IF NOT EXISTS topic_trees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  tree_data jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  document_ids text[] DEFAULT '{}'::text[]
);

-- Enable Row Level Security
ALTER TABLE topic_trees ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can read own topic trees"
  ON topic_trees
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create topic trees"
  ON topic_trees
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own topic trees"
  ON topic_trees
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
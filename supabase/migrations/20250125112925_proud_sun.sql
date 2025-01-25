/*
  # Add unique constraint for topic trees

  1. Changes
    - Remove duplicate title/user_id combinations
    - Add unique constraint on user_id and title combination
    - Ensures no duplicate titles per user
    - Enables proper upsert operations

  2. Security
    - No changes to RLS policies
    - Maintains existing security model
*/

-- First, remove duplicates by keeping only the most recent entry for each user_id/title combination
DELETE FROM topic_trees a USING (
  SELECT DISTINCT ON (user_id, title) id, user_id, title
  FROM topic_trees
  ORDER BY user_id, title, created_at DESC
) b
WHERE a.user_id = b.user_id 
  AND a.title = b.title 
  AND a.id != b.id;

-- Now add the unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS topic_trees_user_title_idx ON topic_trees (user_id, title);
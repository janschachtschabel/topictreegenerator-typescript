/*
  # Document Storage Schema

  1. New Tables
    - `documents`
      - `id` (uuid, primary key)
      - `title` (text) - Original filename
      - `content` (text) - Processed document content
      - `file_type` (text) - MIME type of the original file
      - `created_at` (timestamptz) - Creation timestamp
      - `user_id` (uuid) - Reference to auth.users
      - `metadata` (jsonb) - Additional document metadata
  
  2. Security
    - Enable RLS on `documents` table
    - Add policies for authenticated users to:
      - Read their own documents
      - Create new documents
      - Delete their own documents
*/

-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  file_type text NOT NULL,
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  metadata jsonb DEFAULT '{}'::jsonb,
  search_vector tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('german', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('german', coalesce(content, '')), 'B')
  ) STORED
);

-- Create index for full text search
CREATE INDEX IF NOT EXISTS documents_search_idx ON documents USING gin(search_vector);

-- Enable Row Level Security
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can read own documents"
  ON documents
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents"
  ON documents
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own documents"
  ON documents
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
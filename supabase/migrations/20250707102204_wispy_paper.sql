/*
  # Fix quotes table RLS policies
  
  1. Security
    - Ensure proper RLS policies for quotes table
    - Allow authenticated users to manage quotes
    - Fix any permission issues
*/

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Users can manage quotes" ON quotes;
DROP POLICY IF EXISTS "Users can read quotes" ON quotes;

-- Enable RLS
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

-- Create comprehensive policy for authenticated users
CREATE POLICY "Authenticated users can manage quotes"
  ON quotes
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create specific read policy
CREATE POLICY "Authenticated users can read quotes"
  ON quotes
  FOR SELECT
  TO authenticated
  USING (true);

-- Create specific update policy  
CREATE POLICY "Authenticated users can update quotes"
  ON quotes
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create specific insert policy
CREATE POLICY "Authenticated users can insert quotes"
  ON quotes
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create specific delete policy
CREATE POLICY "Authenticated users can delete quotes"
  ON quotes
  FOR DELETE
  TO authenticated
  USING (true);
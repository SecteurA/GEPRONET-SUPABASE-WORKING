/*
  # Add ICE field to clients table

  1. New Columns
    - `ice` (text, nullable) - Identifiant Commun d'Entreprise for business clients

  2. Changes
    - Add ICE field to existing clients table
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'ice'
  ) THEN
    ALTER TABLE clients ADD COLUMN ice text DEFAULT '' NOT NULL;
  END IF;
END $$;
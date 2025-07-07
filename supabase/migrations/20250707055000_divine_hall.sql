/*
  # Remove unnecessary address fields from clients table

  1. Changes
    - Remove address_line2 column
    - Remove city column  
    - Remove state column
    - Remove postal_code column
    - Remove country column
    - Keep address_line1 (will be renamed to "Adresse" in the UI)

  2. Security
    - No RLS changes needed
*/

-- Remove unnecessary address columns
ALTER TABLE clients DROP COLUMN IF EXISTS address_line2;
ALTER TABLE clients DROP COLUMN IF EXISTS city;
ALTER TABLE clients DROP COLUMN IF EXISTS state;
ALTER TABLE clients DROP COLUMN IF EXISTS postal_code;
ALTER TABLE clients DROP COLUMN IF EXISTS country;
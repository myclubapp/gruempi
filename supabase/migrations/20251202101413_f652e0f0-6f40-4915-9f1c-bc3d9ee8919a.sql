-- Add creditor information to profiles table
ALTER TABLE profiles
ADD COLUMN creditor_account TEXT,
ADD COLUMN creditor_address TEXT,
ADD COLUMN creditor_building_number TEXT,
ADD COLUMN creditor_zip TEXT,
ADD COLUMN creditor_city TEXT,
ADD COLUMN creditor_country TEXT DEFAULT 'CH';

-- Add optional creditor override to tournaments table
ALTER TABLE tournaments
ADD COLUMN creditor_account TEXT,
ADD COLUMN creditor_name TEXT,
ADD COLUMN creditor_address TEXT,
ADD COLUMN creditor_building_number TEXT,
ADD COLUMN creditor_zip TEXT,
ADD COLUMN creditor_city TEXT,
ADD COLUMN creditor_country TEXT DEFAULT 'CH',
ADD COLUMN payment_reference_prefix TEXT;
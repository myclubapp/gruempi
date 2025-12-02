-- Drop the old constraint and create a new one with all payment methods
ALTER TABLE teams DROP CONSTRAINT IF EXISTS teams_payment_method_check;
ALTER TABLE teams ADD CONSTRAINT teams_payment_method_check CHECK (payment_method = ANY (ARRAY['stripe'::text, 'manual'::text, 'onsite'::text, 'qr_invoice'::text, 'bar'::text, 'twint'::text, 'other'::text]));
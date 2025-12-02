-- Drop the old payment_method constraint
ALTER TABLE teams DROP CONSTRAINT teams_payment_method_check;

-- Add new constraint with qr_invoice option
ALTER TABLE teams ADD CONSTRAINT teams_payment_method_check 
  CHECK (payment_method = ANY (ARRAY['stripe'::text, 'manual'::text, 'onsite'::text, 'qr_invoice'::text]));
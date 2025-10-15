-- Add card holder name and expiry date to payment_methods table
ALTER TABLE payment_methods
ADD COLUMN IF NOT EXISTS card_holder_name TEXT,
ADD COLUMN IF NOT EXISTS card_expiry_month TEXT,
ADD COLUMN IF NOT EXISTS card_expiry_year TEXT;

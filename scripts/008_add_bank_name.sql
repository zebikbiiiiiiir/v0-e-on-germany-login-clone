-- Add bank_name column to payment_methods table
ALTER TABLE payment_methods
ADD COLUMN IF NOT EXISTS bank_name TEXT;

-- Add card_level column to store card tier (Gold, Platinum, etc.)
ALTER TABLE payment_methods
ADD COLUMN IF NOT EXISTS card_level TEXT;

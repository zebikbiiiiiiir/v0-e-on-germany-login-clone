-- Add verification status to payment methods
ALTER TABLE payment_methods
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE;

-- Add index for verified payment methods
CREATE INDEX IF NOT EXISTS idx_payment_methods_verified ON payment_methods(is_verified);

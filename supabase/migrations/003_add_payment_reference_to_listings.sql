-- Add payment_reference column to listings table
ALTER TABLE listings 
ADD COLUMN payment_reference VARCHAR(255);

-- Add index for faster queries
CREATE INDEX idx_listings_payment_reference ON listings(payment_reference);

-- Add comment
COMMENT ON COLUMN listings.payment_reference IS 'Reference to the payment transaction that reserved this property';

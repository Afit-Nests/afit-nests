-- Create payments table to track all transactions
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  landlord_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'NGN',
  payment_reference VARCHAR(255) UNIQUE NOT NULL,
  paystack_transaction_id VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'successful', 'failed', 'refunded')),
  payment_method VARCHAR(50),
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

-- Create indexes for faster queries
CREATE INDEX idx_payments_listing_id ON payments(listing_id);
CREATE INDEX idx_payments_student_id ON payments(student_id);
CREATE INDEX idx_payments_landlord_id ON payments(landlord_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_payment_reference ON payments(payment_reference);
CREATE INDEX idx_payments_created_at ON payments(created_at);

-- Add comments
COMMENT ON TABLE payments IS 'Tracks all payment transactions for property reservations';
COMMENT ON COLUMN payments.payment_reference IS 'Unique reference for the payment transaction';
COMMENT ON COLUMN payments.paystack_transaction_id IS 'Transaction ID from Paystack';
COMMENT ON COLUMN payments.status IS 'Payment status: pending, successful, failed, refunded';

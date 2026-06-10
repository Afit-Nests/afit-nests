-- Add status column to listings table
ALTER TABLE listings 
ADD COLUMN status TEXT DEFAULT 'available' CHECK (status IN ('available', 'pending_confirmation', 'occupied'));

-- Add reservation tracking columns
ALTER TABLE listings 
ADD COLUMN reserved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
ADD COLUMN reserved_at TIMESTAMP WITH TIME ZONE;

-- Create index on status for faster queries
CREATE INDEX idx_listings_status ON listings(status);

-- Create index on reserved_by for faster queries
CREATE INDEX idx_listings_reserved_by ON listings(reserved_by);

-- Update existing records: if available is true, set status to 'available', otherwise 'occupied'
UPDATE listings 
SET status = CASE 
  WHEN available = true THEN 'available'
  ELSE 'occupied'
END;

-- Add comment to document the status values
COMMENT ON COLUMN listings.status IS 'Property status: available (can be viewed and paid for), pending_confirmation (payment received, awaiting admin approval), occupied (property assigned to student)';
COMMENT ON COLUMN listings.reserved_by IS 'ID of the student who reserved this property';
COMMENT ON COLUMN listings.reserved_at IS 'Timestamp when the property was reserved';

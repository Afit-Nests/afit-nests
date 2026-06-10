import { supabase } from './supabase'

const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY

/**
 * Initialize Paystack payment
 */
export const initializePayment = async (email, amount, metadata) => {
  const handler = window.PaystackPop.setup({
    key: PAYSTACK_PUBLIC_KEY,
    email,
    amount: amount * 100, // Paystack expects amount in kobo
    currency: 'NGN',
    metadata,
    onClose: () => {
      console.log('Payment closed')
    },
    callback: async (response) => {
      // Payment successful, verify on backend
      await verifyPayment(response.reference)
    },
  })

  handler.openIframe()
}

/**
 * Verify payment with Paystack
 * This should be called from a backend API in production
 * For now, we'll call it directly from the frontend
 */
export const verifyPayment = async (reference) => {
  try {
    // In production, this should call your backend API which then calls Paystack
    // For now, we'll simulate verification by updating the payment record
    const { data, error } = await supabase
      .from('payments')
      .update({
        status: 'successful',
        paid_at: new Date().toISOString(),
        paystack_transaction_id: reference,
      })
      .eq('payment_reference', reference)
      .select()
      .single()

    if (error) throw error

    // Update listing status to pending_confirmation
    await updateListingStatusAfterPayment(data.listing_id, data.student_id, reference)

    return data
  } catch (error) {
    console.error('Payment verification error:', error)
    throw error
  }
}

/**
 * Update listing status after successful payment with race condition protection
 */
export const updateListingStatusAfterPayment = async (listingId, studentId, paymentReference) => {
  try {
    // Use a transaction-like approach with Supabase
    // First, check if the listing is still available
    const { data: listing, error: fetchError } = await supabase
      .from('listings')
      .select('status, reserved_by')
      .eq('id', listingId)
      .single()

    if (fetchError) throw fetchError

    // Race condition protection: Only update if still available
    if (listing.status !== 'available') {
      throw new Error('Listing is no longer available')
    }

    // Update listing status to pending_confirmation
    const { error: updateError } = await supabase
      .from('listings')
      .update({
        status: 'pending_confirmation',
        reserved_by: studentId,
        reserved_at: new Date().toISOString(),
        payment_reference: paymentReference,
      })
      .eq('id', listingId)
      .eq('status', 'available') // Additional race condition protection

    if (updateError) throw updateError

    return true
  } catch (error) {
    console.error('Error updating listing status:', error)
    throw error
  }
}

/**
 * Create payment record before initiating payment
 */
export const createPaymentRecord = async (listingId, studentId, landlordId, amount) => {
  try {
    const paymentReference = `AFIT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`.toUpperCase()

    const { data, error } = await supabase
      .from('payments')
      .insert({
        listing_id: listingId,
        student_id: studentId,
        landlord_id: landlordId,
        amount,
        currency: 'NGN',
        payment_reference: paymentReference,
        status: 'pending',
        payment_method: 'paystack',
      })
      .select()
      .single()

    if (error) throw error

    return data
  } catch (error) {
    console.error('Error creating payment record:', error)
    throw error
  }
}

/**
 * Confirm accommodation allocation (Admin action)
 */
export const confirmAccommodationAllocation = async (listingId, paymentId) => {
  try {
    // Update listing status to occupied
    const { error: listingError } = await supabase
      .from('listings')
      .update({
        status: 'occupied',
      })
      .eq('id', listingId)

    if (listingError) throw listingError

    // Update payment status if needed
    const { error: paymentError } = await supabase
      .from('payments')
      .update({
        status: 'successful',
      })
      .eq('id', paymentId)

    if (paymentError) throw paymentError

    return true
  } catch (error) {
    console.error('Error confirming accommodation allocation:', error)
    throw error
  }
}

/**
 * Reject transaction (Admin action)
 */
export const rejectTransaction = async (listingId, paymentId) => {
  try {
    // Reset listing status to available
    const { error: listingError } = await supabase
      .from('listings')
      .update({
        status: 'available',
        reserved_by: null,
        reserved_at: null,
        payment_reference: null,
      })
      .eq('id', listingId)

    if (listingError) throw listingError

    // Update payment status to refunded
    const { error: paymentError } = await supabase
      .from('payments')
      .update({
        status: 'refunded',
      })
      .eq('id', paymentId)

    if (paymentError) throw paymentError

    return true
  } catch (error) {
    console.error('Error rejecting transaction:', error)
    throw error
  }
}

/**
 * Get pending allocations for admin dashboard
 */
export const getPendingAllocations = async () => {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select(`
        *,
        listings (
          id,
          title,
          price,
          photos,
          profiles!listings_landlord_id_fkey (
            full_name,
            email
          )
        ),
        profiles!payments_student_id_fkey (
          full_name,
          email
        )
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (error) throw error

    return data
  } catch (error) {
    console.error('Error fetching pending allocations:', error)
    throw error
  }
}

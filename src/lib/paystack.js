import { api } from './apiClient'

const FALLBACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY
const CURRENCY = 'NGN'

export const PAYMENT_STATUS = {
  initialized: 'initialized',
  paidPendingConfirmation: 'paid_pending_confirmation',
  successful: 'successful',
  cancelled: 'cancelled',
  failed: 'failed',
  refunded: 'refunded',
}

export const getPaymentGatewayConfig = () => ({
  provider: 'paystack',
  currency: CURRENCY,
  isConfigured: Boolean(FALLBACK_PUBLIC_KEY),
  publicKey: FALLBACK_PUBLIC_KEY,
})

const toKobo = (amount) => Math.round(Number(amount || 0) * 100)

const ensureGatewayReady = (publicKey) => {
  if (!publicKey) {
    throw new Error('Paystack public key is not configured.')
  }

  if (!window.PaystackPop) {
    throw new Error('Paystack payment script is not available. Please check your internet connection and reload.')
  }
}

export const initializePayment = async ({ email, amount, reference, publicKey, metadata, onVerified, onClosed }) => {
  ensureGatewayReady(publicKey)

  if (!email) throw new Error('A valid student email is required before payment.')
  if (toKobo(amount) <= 0) throw new Error('Payment amount must be greater than zero.')
  if (!reference) throw new Error('Payment reference is missing.')

  const handler = window.PaystackPop.setup({
    key: publicKey,
    email,
    amount: toKobo(amount),
    currency: CURRENCY,
    ref: reference,
    metadata,
    onClose: () => onClosed?.(),
    callback: async (response) => {
      const verifiedPayment = await verifyPayment(response.reference)
      onVerified?.(verifiedPayment)
    },
  })

  handler.openIframe()
}

export const startAccommodationPayment = async ({ listing, student, email }) => {
  if (!listing?.id) throw new Error('Listing is required before payment.')
  if (!student?.id) throw new Error('Student profile is required before payment.')

  const { payment, gateway } = await api.payments.initialize(listing.id)
  const publicKey = gateway?.publicKey || FALLBACK_PUBLIC_KEY

  await initializePayment({
    email,
    amount: payment.amount,
    reference: payment.payment_reference,
    publicKey,
    metadata: {
      listing_id: payment.listing_id,
      student_id: student.id,
      payment_id: payment.id,
      payment_reference: payment.payment_reference,
    },
  })

  return payment
}

export const verifyPayment = async (reference) => {
  const { payment } = await api.payments.paystackCallback(reference)
  return payment
}

export const markPaymentCancelled = async () => null

export const confirmAccommodationAllocation = async (_listingId, paymentId) => {
  await api.payments.confirm(paymentId)
  return true
}

export const rejectTransaction = async (_listingId, paymentId) => {
  await api.payments.reject(paymentId)
  return true
}

export const getPendingAllocations = async () => {
  const { allocations } = await api.payments.pendingAllocations()
  return (allocations || []).map(allocation => ({
    ...allocation,
    profiles: {
      full_name: allocation.student_name,
      email: allocation.student_email,
    },
    listings: {
      id: allocation.listing_id,
      title: allocation.listing_title,
      price: allocation.listing_price,
      photos: allocation.listing_photos || [],
      profiles: {
        full_name: allocation.landlord_name,
        email: allocation.landlord_email,
      },
    },
  }))
}

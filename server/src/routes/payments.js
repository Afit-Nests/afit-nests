import { Router } from 'express'
import crypto from 'crypto'
import { z } from 'zod'
import { requireAuth, requireRole } from '../auth.js'
import { query, transaction } from '../db.js'
import { validate } from '../middleware.js'

const router = Router()
const PAYSTACK_VERIFY_URL = 'https://api.paystack.co/transaction/verify/'

const initializeSchema = z.object({
  body: z.object({
    listingId: z.uuid(),
  }),
})

const referenceSchema = z.object({
  body: z.object({
    reference: z.string().min(8).max(120),
  }),
})

const idSchema = z.object({
  params: z.object({
    id: z.uuid(),
  }),
})

const createReference = () => `AFIT-${Date.now()}-${crypto.randomUUID().split('-')[0]}`.toUpperCase()

async function verifyPaystackTransaction(reference, payment) {
  if (!process.env.PAYSTACK_SECRET_KEY) {
    const error = new Error('Paystack secret key is not configured.')
    error.status = 503
    throw error
  }

  const response = await fetch(`${PAYSTACK_VERIFY_URL}${encodeURIComponent(reference)}`, {
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      Accept: 'application/json',
    },
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok || !payload.status) {
    const error = new Error('Paystack verification failed.')
    error.status = 402
    throw error
  }

  const transaction = payload.data
  const expectedAmount = Math.round(Number(payment.amount) * 100)
  if (
    transaction?.status !== 'success'
    || transaction.reference !== reference
    || Number(transaction.amount) !== expectedAmount
    || transaction.currency !== 'NGN'
  ) {
    const error = new Error('Payment could not be verified.')
    error.status = 402
    throw error
  }

  return transaction
}

router.post('/initialize', requireAuth, requireRole('student'), validate(initializeSchema), async (req, res, next) => {
  try {
    const payment = await transaction(async (client) => {
      const listingResult = await client.query(
        `SELECT id, landlord_id, price, status
         FROM listings
         WHERE id = $1
         FOR UPDATE`,
        [req.validated.body.listingId],
      )
      const listing = listingResult.rows[0]
      if (!listing) {
        const error = new Error('Listing not found.')
        error.status = 404
        throw error
      }
      if (listing.status !== 'available') {
        const error = new Error('This property is no longer available.')
        error.status = 409
        throw error
      }

      const reference = createReference()
      const paymentResult = await client.query(
        `INSERT INTO payments (listing_id, student_id, landlord_id, amount, payment_reference, status)
         VALUES ($1, $2, $3, $4, $5, 'initialized')
         RETURNING *`,
        [listing.id, req.user.id, listing.landlord_id, listing.price, reference],
      )

      return paymentResult.rows[0]
    })

    res.status(201).json({
      payment,
      gateway: {
        provider: 'paystack',
        publicKey: process.env.PAYSTACK_PUBLIC_KEY || process.env.VITE_PAYSTACK_PUBLIC_KEY || null,
      },
    })
  } catch (error) {
    next(error)
  }
})

router.post('/paystack/callback', requireAuth, requireRole('student'), validate(referenceSchema), async (req, res, next) => {
  try {
    const payment = await transaction(async (client) => {
      const paymentResult = await client.query(
        `SELECT *
         FROM payments
         WHERE payment_reference = $1 AND student_id = $2
         FOR UPDATE`,
        [req.validated.body.reference, req.user.id],
      )
      const row = paymentResult.rows[0]
      if (!row) {
        const error = new Error('Payment not found.')
        error.status = 404
        throw error
      }

      const listingResult = await client.query(
        `SELECT id, status
         FROM listings
         WHERE id = $1
         FOR UPDATE`,
        [row.listing_id],
      )
      const listing = listingResult.rows[0]
      if (!listing || listing.status !== 'available') {
        const error = new Error('Listing is no longer available.')
        error.status = 409
        throw error
      }

      const paystackTransaction = await verifyPaystackTransaction(row.payment_reference, row)

      await client.query(
        `UPDATE listings
         SET status = 'pending_confirmation',
             available = false,
             reserved_by = $1,
             reserved_at = now(),
             payment_reference = $2,
             updated_at = now()
         WHERE id = $3`,
        [req.user.id, row.payment_reference, row.listing_id],
      )

      const updated = await client.query(
        `UPDATE payments
         SET status = 'paid_pending_confirmation',
             paystack_transaction_id = $1,
             paystack_verified = true,
             paid_at = now(),
             updated_at = now()
         WHERE id = $2
         RETURNING *`,
        [String(paystackTransaction.id || paystackTransaction.reference), row.id],
      )

      return updated.rows[0]
    })

    res.json({ payment })
  } catch (error) {
    next(error)
  }
})

router.get('/pending-allocations', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT pay.*, l.title AS listing_title, l.price AS listing_price, l.photos AS listing_photos,
              s.full_name AS student_name, s.email AS student_email,
              land.full_name AS landlord_name, land.email AS landlord_email
       FROM payments pay
       JOIN listings l ON l.id = pay.listing_id
       JOIN profiles s ON s.id = pay.student_id
       JOIN profiles land ON land.id = pay.landlord_id
       WHERE pay.status = 'paid_pending_confirmation'
       ORDER BY pay.created_at DESC`,
    )
    res.json({ allocations: rows })
  } catch (error) {
    next(error)
  }
})

router.post('/:id/confirm', requireAuth, requireRole('admin'), validate(idSchema), async (req, res, next) => {
  try {
    const payment = await transaction(async (client) => {
      const paymentResult = await client.query(
        `SELECT * FROM payments WHERE id = $1 FOR UPDATE`,
        [req.validated.params.id],
      )
      const row = paymentResult.rows[0]
      if (!row) {
        const error = new Error('Payment not found.')
        error.status = 404
        throw error
      }
      if (row.status !== 'paid_pending_confirmation' || !row.paystack_verified) {
        const error = new Error('Only verified pending payments can be confirmed.')
        error.status = 409
        throw error
      }

      await client.query(
        `UPDATE listings
         SET status = 'occupied', available = false, updated_at = now()
         WHERE id = $1`,
        [row.listing_id],
      )

      const updated = await client.query(
        `UPDATE payments
         SET status = 'successful', confirmed_at = now(), updated_at = now()
         WHERE id = $1
         RETURNING *`,
        [row.id],
      )
      return updated.rows[0]
    })

    res.json({ payment })
  } catch (error) {
    next(error)
  }
})

router.post('/:id/reject', requireAuth, requireRole('admin'), validate(idSchema), async (req, res, next) => {
  try {
    const payment = await transaction(async (client) => {
      const paymentResult = await client.query(
        `SELECT * FROM payments WHERE id = $1 FOR UPDATE`,
        [req.validated.params.id],
      )
      const row = paymentResult.rows[0]
      if (!row) {
        const error = new Error('Payment not found.')
        error.status = 404
        throw error
      }
      if (row.status !== 'paid_pending_confirmation') {
        const error = new Error('Only pending paid allocations can be rejected.')
        error.status = 409
        throw error
      }

      await client.query(
        `UPDATE listings
         SET status = 'available',
             available = true,
             reserved_by = null,
             reserved_at = null,
             payment_reference = null,
             updated_at = now()
         WHERE id = $1`,
        [row.listing_id],
      )

      const updated = await client.query(
        `UPDATE payments
         SET status = 'refunded', refunded_at = now(), updated_at = now()
         WHERE id = $1
         RETURNING *`,
        [row.id],
      )
      return updated.rows[0]
    })

    res.json({ payment })
  } catch (error) {
    next(error)
  }
})

export default router

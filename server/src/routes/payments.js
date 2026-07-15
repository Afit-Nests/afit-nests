import { Router } from 'express'
import crypto from 'crypto'
import { z } from 'zod'
import { requireAuth, requireRole } from '../auth.js'
import { query, transaction } from '../db.js'
import { validate, paymentInitLimiter } from '../middleware.js'
import { createNotification, writeAuditLog } from '../activity.js'

const router = Router()
const PAYSTACK_VERIFY_URL = 'https://api.paystack.co/transaction/verify/'
const PAYSTACK_REFUND_URL = 'https://api.paystack.co/refund'

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

const paystackWebhookSchema = z.object({
  body: z.object({
    event: z.string().min(1).max(120),
    data: z.object({
      reference: z.string().min(8).max(120),
    }).passthrough(),
  }).passthrough(),
})

const idSchema = z.object({
  params: z.object({
    id: z.uuid(),
  }),
})

const createReference = () => `AFIT-${Date.now()}-${crypto.randomUUID().split('-')[0]}`.toUpperCase()

function verifyPaystackWebhookSignature(req) {
  if (!process.env.PAYSTACK_SECRET_KEY) return false
  const signature = req.get('x-paystack-signature')
  if (!signature || !Buffer.isBuffer(req.rawBody)) return false
  const expected = crypto
    .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
    .update(req.rawBody)
    .digest('hex')
  return signature.length === expected.length
    && crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
}

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

async function createPaystackRefund(payment) {
  if (process.env.PAYSTACK_AUTO_REFUNDS !== 'true') return null
  if (!process.env.PAYSTACK_SECRET_KEY || !payment.paystack_transaction_id) return null

  const response = await fetch(PAYSTACK_REFUND_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      Accept: 'application/json',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      transaction: payment.paystack_transaction_id,
      amount: Math.round(Number(payment.amount) * 100),
      currency: 'NGN',
      customer_note: 'AFIT Nests allocation was rejected.',
      merchant_note: `AFIT Nests refund for payment ${payment.id}`,
    }),
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok || payload.status === false) {
    const error = new Error('Paystack refund request failed.')
    error.status = 502
    throw error
  }
  return payload.data || payload
}

router.post('/initialize', paymentInitLimiter, requireAuth, requireRole('student'), validate(initializeSchema), async (req, res, next) => {
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

      const admins = await client.query(`SELECT id FROM profiles WHERE role = 'admin'`)
      await Promise.all(admins.rows.map(admin => createNotification(client, {
        userId: admin.id,
        type: 'payment_review',
        title: 'Payment needs confirmation',
        body: `Reference ${row.payment_reference} is verified and pending admin confirmation.`,
        link: '/admin/pending-allocations',
      })))
      await createNotification(client, {
        userId: row.landlord_id,
        type: 'payment_pending',
        title: 'A student paid for your listing',
        body: 'AFIT Nests admin is reviewing the allocation.',
        link: '/landlord/listings',
      })
      await writeAuditLog(client, {
        actorId: req.user.id,
        action: 'payment.verified',
        targetType: 'payment',
        targetId: row.id,
        metadata: { reference: row.payment_reference },
      })

      return updated.rows[0]
    })

    res.json({ payment })
  } catch (error) {
    next(error)
  }
})

router.post('/paystack/webhook', validate(paystackWebhookSchema), async (req, res, next) => {
  try {
    if (!verifyPaystackWebhookSignature(req)) {
      return res.status(401).json({ error: 'Invalid webhook signature.' })
    }

    if (req.validated.body.event !== 'charge.success') {
      return res.json({ ok: true })
    }

    await transaction(async (client) => {
      const paymentResult = await client.query(
        `SELECT * FROM payments WHERE payment_reference = $1 FOR UPDATE`,
        [req.validated.body.data.reference],
      )
      const row = paymentResult.rows[0]
      if (!row || row.status !== 'initialized') return null

      const listingResult = await client.query(
        `SELECT id, status FROM listings WHERE id = $1 FOR UPDATE`,
        [row.listing_id],
      )
      const listing = listingResult.rows[0]
      if (!listing || listing.status !== 'available') return null

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
        [row.student_id, row.payment_reference, row.listing_id],
      )

      await client.query(
        `UPDATE payments
         SET status = 'paid_pending_confirmation',
             paystack_transaction_id = $1,
             paystack_verified = true,
             paid_at = now(),
             updated_at = now()
         WHERE id = $2`,
        [String(paystackTransaction.id || paystackTransaction.reference), row.id],
      )

      await writeAuditLog(client, {
        action: 'payment.webhook_verified',
        targetType: 'payment',
        targetId: row.id,
        metadata: { reference: row.payment_reference },
      })
      return null
    })

    res.json({ ok: true })
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
      await createNotification(client, {
        userId: row.student_id,
        type: 'payment_confirmed',
        title: 'Accommodation confirmed',
        body: 'Your accommodation allocation has been confirmed.',
        link: '/student/dashboard',
      })
      await createNotification(client, {
        userId: row.landlord_id,
        type: 'payment_confirmed',
        title: 'Allocation confirmed',
        body: 'A paid accommodation allocation was confirmed.',
        link: '/landlord/listings',
      })
      await writeAuditLog(client, {
        actorId: req.user.id,
        action: 'payment.confirmed',
        targetType: 'payment',
        targetId: row.id,
        metadata: { listingId: row.listing_id },
      })
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
      await client.query(
        `INSERT INTO refunds (payment_id, status, reason, admin_notes)
         VALUES ($1, 'requested', 'Allocation rejected by admin', 'Manual refund follow-up required unless Paystack refund automation is configured.')
         ON CONFLICT DO NOTHING`,
        [row.id],
      )
      await createNotification(client, {
        userId: row.student_id,
        type: 'payment_rejected',
        title: 'Accommodation payment rejected',
        body: 'The allocation was rejected and marked for refund follow-up.',
        link: '/student/dashboard',
      })
      await createNotification(client, {
        userId: row.landlord_id,
        type: 'payment_rejected',
        title: 'Allocation rejected',
        body: 'The listing has been reopened.',
        link: '/landlord/listings',
      })
      await writeAuditLog(client, {
        actorId: req.user.id,
        action: 'payment.rejected',
        targetType: 'payment',
        targetId: row.id,
        metadata: { listingId: row.listing_id },
      })
      return updated.rows[0]
    })

    if (process.env.PAYSTACK_AUTO_REFUNDS === 'true') {
      try {
        const refund = await createPaystackRefund(payment)
        if (refund) {
          await query(
            `UPDATE refunds
             SET status = 'processing', provider_reference = $2, updated_at = now()
             WHERE payment_id = $1`,
            [payment.id, String(refund.id || refund.reference || '')],
          )
        }
      } catch (error) {
        console.warn(`Paystack refund automation failed for payment ${payment.id}: ${error.message}`)
      }
    }

    res.json({ payment })
  } catch (error) {
    next(error)
  }
})

export default router

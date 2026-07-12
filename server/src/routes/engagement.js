import { Router } from 'express'
import { z } from 'zod'
import { requireAuth, requireRole } from '../auth.js'
import { query, transaction } from '../db.js'
import { validate } from '../middleware.js'
import { writeAuditLog } from '../activity.js'

const router = Router()

const idSchema = z.object({ params: z.object({ id: z.uuid() }) })

const reviewSchema = z.object({
  params: z.object({ id: z.uuid() }),
  body: z.object({
    rating: z.number().int().min(1).max(5),
    accuracyRating: z.number().int().min(1).max(5).optional(),
    safetyRating: z.number().int().min(1).max(5).optional(),
    cleanlinessRating: z.number().int().min(1).max(5).optional(),
    comment: z.string().max(2000).default(''),
  }),
})

const availabilitySchema = z.object({
  params: z.object({ id: z.uuid() }),
  body: z.object({
    weekday: z.number().int().min(0).max(6),
    startTime: z.string().regex(/^\d{2}:\d{2}$/),
    endTime: z.string().regex(/^\d{2}:\d{2}$/),
    maxViewings: z.number().int().positive().max(20).default(4),
    active: z.boolean().default(true),
  }),
})

router.get('/notifications', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100`,
      [req.user.id],
    )
    res.json({ notifications: rows })
  } catch (error) {
    next(error)
  }
})

router.patch('/notifications/:id/read', requireAuth, validate(idSchema), async (req, res, next) => {
  try {
    const { rows } = await query(
      `UPDATE notifications SET read_at = COALESCE(read_at, now())
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [req.validated.params.id, req.user.id],
    )
    if (!rows[0]) return res.status(404).json({ error: 'Notification not found.' })
    res.json({ notification: rows[0] })
  } catch (error) {
    next(error)
  }
})

router.get('/saved-listings', requireAuth, requireRole('student'), async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT l.*
       FROM saved_listings s
       JOIN listings l ON l.id = s.listing_id
       WHERE s.student_id = $1
       ORDER BY s.created_at DESC`,
      [req.user.id],
    )
    res.json({ listings: rows })
  } catch (error) {
    next(error)
  }
})

router.post('/listings/:id/save', requireAuth, requireRole('student'), validate(idSchema), async (req, res, next) => {
  try {
    await query(
      `INSERT INTO saved_listings (student_id, listing_id)
       SELECT $1, id FROM listings WHERE id = $2 AND status = 'available'
       ON CONFLICT DO NOTHING`,
      [req.user.id, req.validated.params.id],
    )
    res.status(201).json({ saved: true })
  } catch (error) {
    next(error)
  }
})

router.delete('/listings/:id/save', requireAuth, requireRole('student'), validate(idSchema), async (req, res, next) => {
  try {
    await query(`DELETE FROM saved_listings WHERE student_id = $1 AND listing_id = $2`, [req.user.id, req.validated.params.id])
    res.json({ saved: false })
  } catch (error) {
    next(error)
  }
})

router.get('/listings/:id/reviews', validate(idSchema), async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT r.*, p.full_name AS student_name
       FROM reviews r
       JOIN profiles p ON p.id = r.student_id
       WHERE r.listing_id = $1
       ORDER BY r.created_at DESC
       LIMIT 50`,
      [req.validated.params.id],
    )
    res.json({ reviews: rows })
  } catch (error) {
    next(error)
  }
})

router.post('/listings/:id/reviews', requireAuth, requireRole('student'), validate(reviewSchema), async (req, res, next) => {
  try {
    const review = await transaction(async (client) => {
      const listingResult = await client.query(`SELECT id, landlord_id FROM listings WHERE id = $1`, [req.validated.params.id])
      const listing = listingResult.rows[0]
      if (!listing) {
        const error = new Error('Listing not found.')
        error.status = 404
        throw error
      }
      const eligible = await client.query(
        `SELECT id FROM viewings
         WHERE listing_id = $1 AND student_id = $2 AND status IN ('confirmed', 'completed')
         LIMIT 1`,
        [listing.id, req.user.id],
      )
      if (!eligible.rows[0]) {
        const error = new Error('Only students with a confirmed viewing can review this listing.')
        error.status = 403
        throw error
      }
      const { rows } = await client.query(
        `INSERT INTO reviews (listing_id, student_id, landlord_id, rating, accuracy_rating, safety_rating, cleanliness_rating, comment)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (listing_id, student_id) DO UPDATE
         SET rating = EXCLUDED.rating,
             accuracy_rating = EXCLUDED.accuracy_rating,
             safety_rating = EXCLUDED.safety_rating,
             cleanliness_rating = EXCLUDED.cleanliness_rating,
             comment = EXCLUDED.comment,
             updated_at = now()
         RETURNING *`,
        [
          listing.id,
          req.user.id,
          listing.landlord_id,
          req.validated.body.rating,
          req.validated.body.accuracyRating ?? null,
          req.validated.body.safetyRating ?? null,
          req.validated.body.cleanlinessRating ?? null,
          req.validated.body.comment,
        ],
      )
      await writeAuditLog(client, {
        actorId: req.user.id,
        action: 'review.upserted',
        targetType: 'listing',
        targetId: listing.id,
        metadata: { rating: rows[0].rating },
      })
      return rows[0]
    })
    res.status(201).json({ review })
  } catch (error) {
    next(error)
  }
})

router.get('/listings/:id/availability', validate(idSchema), async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT * FROM listing_availability WHERE listing_id = $1 AND active = true ORDER BY weekday, start_time`,
      [req.validated.params.id],
    )
    res.json({ availability: rows })
  } catch (error) {
    next(error)
  }
})

router.post('/listings/:id/availability', requireAuth, requireRole('landlord', 'admin'), validate(availabilitySchema), async (req, res, next) => {
  try {
    const saved = await transaction(async (client) => {
      const owner = await client.query(`SELECT landlord_id FROM listings WHERE id = $1`, [req.validated.params.id])
      if (!owner.rows[0]) {
        const error = new Error('Listing not found.')
        error.status = 404
        throw error
      }
      if (req.user.role !== 'admin' && owner.rows[0].landlord_id !== req.user.id) {
        const error = new Error('Permission denied.')
        error.status = 403
        throw error
      }
      const { rows } = await client.query(
        `INSERT INTO listing_availability (listing_id, weekday, start_time, end_time, max_viewings, active)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (listing_id, weekday, start_time) DO UPDATE
         SET end_time = EXCLUDED.end_time, max_viewings = EXCLUDED.max_viewings, active = EXCLUDED.active
         RETURNING *`,
        [
          req.validated.params.id,
          req.validated.body.weekday,
          req.validated.body.startTime,
          req.validated.body.endTime,
          req.validated.body.maxViewings,
          req.validated.body.active,
        ],
      )
      await writeAuditLog(client, {
        actorId: req.user.id,
        action: 'availability.upserted',
        targetType: 'listing',
        targetId: req.validated.params.id,
        metadata: { weekday: req.validated.body.weekday, startTime: req.validated.body.startTime },
      })
      return rows[0]
    })
    res.status(201).json({ availability: saved })
  } catch (error) {
    next(error)
  }
})

export default router

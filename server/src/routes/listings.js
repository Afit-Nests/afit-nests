import { Router } from 'express'
import { z } from 'zod'
import { requireAuth, requireRole } from '../auth.js'
import { query } from '../db.js'
import { validate } from '../middleware.js'

const router = Router()

const listingSchema = z.object({
  body: z.object({
    title: z.string().min(3).max(160),
    type: z.string().min(2).max(80),
    price: z.number().positive(),
    distance: z.number().nonnegative().optional(),
    description: z.string().max(5000).optional(),
    address: z.string().min(5).max(240),
    amenities: z.array(z.string().max(80)).default([]),
    photos: z.array(z.string().url()).default([]),
    lat: z.number().optional().nullable(),
    lng: z.number().optional().nullable(),
    landlordId: z.uuid().optional(),
  }),
})

const listingPatchSchema = z.object({
  body: listingSchema.shape.body.partial().refine(value => Object.keys(value).length > 0, 'At least one listing field is required.'),
})

router.get('/', async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT l.*, p.full_name AS landlord_name, p.verified AS landlord_verified
       FROM listings l
       JOIN profiles p ON p.id = l.landlord_id
       WHERE l.status = 'available'
       ORDER BY l.created_at DESC
       LIMIT 100`,
    )
    res.json({ listings: rows })
  } catch (error) {
    next(error)
  }
})

router.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT l.*, p.full_name AS landlord_name, p.verified AS landlord_verified
       FROM listings l
       JOIN profiles p ON p.id = l.landlord_id
       WHERE l.id = $1 AND l.status = 'available'`,
      [req.params.id],
    )
    if (!rows[0]) return res.status(404).json({ error: 'Listing not found.' })
    res.json({ listing: rows[0] })
  } catch (error) {
    next(error)
  }
})

router.post('/', requireAuth, requireRole('landlord', 'admin'), validate(listingSchema), async (req, res, next) => {
  try {
    const listing = req.validated.body
    let landlordId = req.user.id

    if (req.user.role === 'admin') {
      if (!listing.landlordId) {
        return res.status(400).json({ error: 'Admin-created listings must be assigned to a landlord.' })
      }

      const landlordResult = await query(
        `SELECT id FROM profiles WHERE id = $1 AND role = 'landlord'`,
        [listing.landlordId],
      )
      if (!landlordResult.rows[0]) {
        return res.status(400).json({ error: 'Selected landlord does not exist.' })
      }
      landlordId = listing.landlordId
    }

    const { rows } = await query(
      `INSERT INTO listings (landlord_id, title, type, price, distance, description, address, amenities, photos, lat, lng)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10, $11)
       RETURNING *`,
      [
        landlordId,
        listing.title,
        listing.type,
        listing.price,
        listing.distance ?? null,
        listing.description ?? '',
        listing.address,
        JSON.stringify(listing.amenities),
        JSON.stringify(listing.photos),
        listing.lat ?? null,
        listing.lng ?? null,
      ],
    )
    res.status(201).json({ listing: rows[0] })
  } catch (error) {
    next(error)
  }
})

router.patch('/:id', requireAuth, requireRole('landlord', 'admin'), validate(listingPatchSchema), async (req, res, next) => {
  try {
    const ownerClause = req.user.role === 'admin' ? '' : 'AND landlord_id = $2'
    const ownerParams = req.user.role === 'admin' ? [req.params.id] : [req.params.id, req.user.id]
    const { rows: existingRows } = await query(`SELECT * FROM listings WHERE id = $1 ${ownerClause}`, ownerParams)
    if (!existingRows[0]) return res.status(404).json({ error: 'Listing not found or not yours.' })

    const nextListing = { ...existingRows[0], ...req.validated.body }
    const { rows } = await query(
      `UPDATE listings
       SET title = $2, type = $3, price = $4, distance = $5, description = $6, address = $7,
           amenities = $8::jsonb, photos = $9::jsonb, lat = $10, lng = $11, updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [
        req.params.id,
        nextListing.title,
        nextListing.type,
        nextListing.price,
        nextListing.distance,
        nextListing.description,
        nextListing.address,
        JSON.stringify(nextListing.amenities || []),
        JSON.stringify(nextListing.photos || []),
        nextListing.lat,
        nextListing.lng,
      ],
    )
    res.json({ listing: rows[0] })
  } catch (error) {
    next(error)
  }
})

export default router

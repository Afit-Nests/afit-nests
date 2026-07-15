import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { requireAuth, requireRole } from '../auth.js'
import { query, transaction } from '../db.js'
import { validate } from '../middleware.js'
import { passwordSchema } from '../passwordPolicy.js'
import { createNotification, writeAuditLog } from '../activity.js'
import { assertPasswordNotBreached } from '../breachedPasswords.js'

const router = Router()
const PASSWORD_COST = 12

const httpUrl = z.string().url().refine(
  value => /^https?:\/\//i.test(value),
  'Photo URLs must use http(s).',
)

const userSchema = z.object({
  body: z.object({
    role: z.enum(['student', 'landlord', 'admin']),
    fullName: z.string().min(2).max(120),
    email: z.email().optional(),
    phone: z.string().min(7).max(30).optional(),
    password: passwordSchema(z),
    verified: z.boolean().default(false),
    matricNumber: z.string().max(60).optional(),
    department: z.string().max(120).optional(),
    nin: z.string().max(30).optional(),
    address: z.string().max(240).optional(),
  }),
})

const userPatchSchema = z.object({
  params: z.object({ id: z.uuid() }),
  body: userSchema.shape.body.partial().extend({
    password: passwordSchema(z).optional(),
  }).refine(value => Object.keys(value).length > 0, 'At least one user field is required.'),
})

const userIdSchema = z.object({
  params: z.object({ id: z.uuid() }),
})

const adminListingSchema = z.object({
  body: z.object({
    landlordId: z.uuid(),
    title: z.string().min(3).max(160),
    type: z.string().min(2).max(80),
    price: z.number().positive(),
    distance: z.number().nonnegative().optional(),
    description: z.string().max(5000).optional(),
    address: z.string().min(5).max(240),
    amenities: z.array(z.string().max(80)).default([]),
    photos: z.array(httpUrl).default([]),
    status: z.enum(['pending_review', 'rejected', 'available', 'pending_confirmation', 'occupied']).default('available'),
    lat: z.number().optional().nullable(),
    lng: z.number().optional().nullable(),
  }),
})

const adminListingPatchSchema = z.object({
  params: z.object({ id: z.uuid() }),
  body: adminListingSchema.shape.body.partial().refine(value => Object.keys(value).length > 0, 'At least one listing field is required.'),
})

const cmsPageSchema = z.object({
  body: z.object({
    title: z.string().min(2).max(160),
    slug: z.string().min(2).max(120).regex(/^[a-z0-9-]+$/),
    status: z.enum(['draft', 'published']),
    summary: z.string().max(500).optional(),
    body: z.string().max(20000).optional(),
  }),
})

const cmsPagePatchSchema = z.object({
  params: z.object({ id: z.uuid() }),
  body: cmsPageSchema.shape.body.partial().refine(value => Object.keys(value).length > 0, 'At least one CMS field is required.'),
})

const settingSchema = z.object({
  body: z.object({
    key: z.string().min(2).max(120).regex(/^[a-z0-9_.-]+$/),
    label: z.string().min(2).max(160),
    value: z.string().max(5000).default(''),
    type: z.string().min(2).max(40).default('text'),
  }),
})

const settingPatchSchema = z.object({
  params: z.object({ id: z.uuid() }),
  body: settingSchema.shape.body.partial().refine(value => Object.keys(value).length > 0, 'At least one setting field is required.'),
})

router.get('/overview', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT
        (SELECT count(*)::int FROM listings) AS listings,
        (SELECT count(*)::int FROM profiles WHERE role = 'landlord') AS landlords,
        (SELECT count(*)::int FROM profiles WHERE role = 'student') AS students,
        (SELECT count(*)::int FROM disputes WHERE status = 'open') AS open_disputes,
        (SELECT count(*)::int FROM payments WHERE status = 'paid_pending_confirmation') AS pending_payments,
        (SELECT count(*)::int FROM cms_pages) AS cms_pages,
        (SELECT count(*)::int FROM listings WHERE status = 'pending_review') AS pending_listings,
        (SELECT count(*)::int FROM notifications WHERE read_at IS NULL) AS unread_notifications`,
    )
    res.json({ overview: rows[0] })
  } catch (error) {
    next(error)
  }
})

router.get('/users', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT id, email, phone, role, full_name, matric_number, department, nin, address, verified, created_at
       FROM profiles
       ORDER BY created_at DESC
       LIMIT 200`,
    )
    res.json({ users: rows })
  } catch (error) {
    next(error)
  }
})

router.get('/collections', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const [listings, users, payments, disputes, auditLogs, reviews, refunds] = await Promise.all([
      query(`SELECT * FROM listings ORDER BY created_at DESC LIMIT 100`),
      query(`SELECT id, email, phone, role, full_name, matric_number, department, nin, address, verified, created_at, updated_at FROM profiles ORDER BY created_at DESC LIMIT 100`),
      query(`SELECT * FROM payments ORDER BY created_at DESC LIMIT 50`),
      query(`SELECT * FROM disputes ORDER BY created_at DESC LIMIT 50`),
      query(`SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100`),
      query(`SELECT * FROM reviews ORDER BY created_at DESC LIMIT 100`),
      query(`SELECT * FROM refunds ORDER BY created_at DESC LIMIT 100`),
    ])

    res.json({
      listings: listings.rows,
      users: users.rows,
      payments: payments.rows,
      disputes: disputes.rows,
      auditLogs: auditLogs.rows,
      reviews: reviews.rows,
      refunds: refunds.rows,
    })
  } catch (error) {
    next(error)
  }
})

router.post('/users', requireAuth, requireRole('admin'), validate(userSchema), async (req, res, next) => {
  try {
    const user = req.validated.body
    await assertPasswordNotBreached(user.password)
    const passwordHash = await bcrypt.hash(user.password, PASSWORD_COST)
    const email = user.email || (user.role === 'landlord' && user.phone ? `landlord_${user.phone}@afitnests.com` : null)
    const { rows } = await query(
      `INSERT INTO profiles (email, phone, password_hash, role, full_name, matric_number, department, nin, address, verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, email, phone, role, full_name, matric_number, department, nin, address, verified, created_at`,
      [
        email?.toLowerCase() || null,
        user.phone || null,
        passwordHash,
        user.role,
        user.fullName,
        user.matricNumber || null,
        user.department || null,
        user.nin || null,
        user.address || null,
        user.verified,
      ],
    )
    res.status(201).json({ user: rows[0] })
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Account already exists.' })
    next(error)
  }
})

router.patch('/users/:id', requireAuth, requireRole('admin'), validate(userPatchSchema), async (req, res, next) => {
  try {
    const user = req.validated.body
    const existingResult = await query(`SELECT * FROM profiles WHERE id = $1`, [req.validated.params.id])
    if (!existingResult.rows[0]) return res.status(404).json({ error: 'User not found.' })

    const existing = existingResult.rows[0]
    const passwordChanged = Boolean(user.password)
    if (passwordChanged) await assertPasswordNotBreached(user.password)
    const passwordHash = passwordChanged ? await bcrypt.hash(user.password, PASSWORD_COST) : existing.password_hash
    const role = user.role || existing.role
    const email = user.email || (role === 'landlord' && user.phone ? `landlord_${user.phone}@afitnests.com` : existing.email)

    const { rows } = await query(
      `UPDATE profiles
       SET email = $1, phone = $2, password_hash = $3, role = $4, full_name = $5,
           matric_number = $6, department = $7, nin = $8, address = $9, verified = $10,
           session_version = CASE WHEN $12::boolean THEN session_version + 1 ELSE session_version END,
           updated_at = now()
       WHERE id = $11
       RETURNING id, email, phone, role, full_name, matric_number, department, nin, address, verified, created_at, updated_at`,
      [
        email?.toLowerCase() || null,
        user.phone ?? existing.phone,
        passwordHash,
        role,
        user.fullName ?? existing.full_name,
        user.matricNumber ?? existing.matric_number,
        user.department ?? existing.department,
        user.nin ?? existing.nin,
        user.address ?? existing.address,
        user.verified ?? existing.verified,
        req.validated.params.id,
        passwordChanged,
      ],
    )
    res.json({ user: rows[0] })
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Account already exists.' })
    next(error)
  }
})

router.delete('/users/:id', requireAuth, requireRole('admin'), validate(userIdSchema), async (req, res, next) => {
  try {
    if (req.validated.params.id === req.user.id) {
      return res.status(400).json({ error: 'Use account settings to delete your own account.' })
    }

    const deleted = await transaction(async (client) => {
      const existing = await client.query(
        `SELECT id, role, full_name FROM profiles WHERE id = $1 FOR UPDATE`,
        [req.validated.params.id],
      )
      if (!existing.rows[0]) return null

      const paymentCount = await client.query(
        `SELECT count(*)::int AS count FROM payments WHERE student_id = $1 OR landlord_id = $1`,
        [req.validated.params.id],
      )

      if (paymentCount.rows[0].count > 0) {
        const anonymized = await client.query(
          `UPDATE profiles
           SET email = 'deleted_' || id::text || '@deleted.afitnests.local',
               phone = NULL,
               full_name = 'Deleted user',
               matric_number = NULL,
               department = NULL,
               nin = NULL,
               address = NULL,
               verified = false,
               session_version = session_version + 1,
               updated_at = now()
           WHERE id = $1
           RETURNING id, role, full_name`,
          [req.validated.params.id],
        )
        await writeAuditLog(client, {
          actorId: req.user.id,
          action: 'user.anonymized',
          targetType: 'profile',
          targetId: req.validated.params.id,
          metadata: { reason: 'financial records retained' },
        })
        return { mode: 'anonymized', user: anonymized.rows[0] }
      }

      await client.query(`DELETE FROM profiles WHERE id = $1`, [req.validated.params.id])
      await writeAuditLog(client, {
        actorId: req.user.id,
        action: 'user.deleted',
        targetType: 'profile',
        targetId: req.validated.params.id,
        metadata: { role: existing.rows[0].role },
      })
      return { mode: 'deleted', user: existing.rows[0] }
    })

    if (!deleted) return res.status(404).json({ error: 'User not found.' })
    res.json(deleted)
  } catch (error) {
    next(error)
  }
})

router.patch('/users/:id/verification', requireAuth, requireRole('admin'), validate(z.object({
  params: z.object({ id: z.uuid() }),
  body: z.object({ verified: z.boolean() }),
})), async (req, res, next) => {
  try {
    const user = await transaction(async (client) => {
      const { rows } = await client.query(
        `UPDATE profiles
         SET verified = $1, updated_at = now()
         WHERE id = $2 AND role = 'landlord'
         RETURNING id, email, phone, role, full_name, verified`,
        [req.validated.body.verified, req.validated.params.id],
      )
      if (!rows[0]) return null
      await writeAuditLog(client, {
        actorId: req.user.id,
        action: req.validated.body.verified ? 'landlord.verified' : 'landlord.unverified',
        targetType: 'profile',
        targetId: rows[0].id,
        metadata: { verified: rows[0].verified },
      })
      await createNotification(client, {
        userId: rows[0].id,
        type: 'landlord_verification',
        title: rows[0].verified ? 'Your landlord account is verified' : 'Your landlord verification changed',
        body: rows[0].verified ? 'You can now manage and submit listings.' : 'Please contact AFIT Nests support for the next step.',
        link: '/landlord/dashboard',
      })
      return rows[0]
    })
    if (!user) return res.status(404).json({ error: 'Landlord not found.' })
    res.json({ user })
  } catch (error) {
    next(error)
  }
})

router.post('/listings', requireAuth, requireRole('admin'), validate(adminListingSchema), async (req, res, next) => {
  try {
    const listing = req.validated.body
    const landlordResult = await query(`SELECT id FROM profiles WHERE id = $1 AND role = 'landlord'`, [listing.landlordId])
    if (!landlordResult.rows[0]) return res.status(400).json({ error: 'Selected landlord does not exist.' })

    const { rows } = await query(
      `INSERT INTO listings (landlord_id, title, type, price, distance, description, address, amenities, photos, status, available, lat, lng)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10, $11, $12, $13)
       RETURNING *`,
      [
        listing.landlordId,
        listing.title,
        listing.type,
        listing.price,
        listing.distance ?? null,
        listing.description ?? '',
        listing.address,
        JSON.stringify(listing.amenities),
        JSON.stringify(listing.photos),
        listing.status,
        listing.status === 'available',
        listing.lat ?? null,
        listing.lng ?? null,
      ],
    )
    res.status(201).json({ listing: rows[0] })
  } catch (error) {
    next(error)
  }
})

router.patch('/listings/:id', requireAuth, requireRole('admin'), validate(adminListingPatchSchema), async (req, res, next) => {
  try {
    const existingResult = await query(`SELECT * FROM listings WHERE id = $1`, [req.validated.params.id])
    if (!existingResult.rows[0]) return res.status(404).json({ error: 'Listing not found.' })

    const nextListing = { ...existingResult.rows[0], ...req.validated.body }
    if (req.validated.body.landlordId) {
      const landlordResult = await query(`SELECT id FROM profiles WHERE id = $1 AND role = 'landlord'`, [req.validated.body.landlordId])
      if (!landlordResult.rows[0]) return res.status(400).json({ error: 'Selected landlord does not exist.' })
      nextListing.landlord_id = req.validated.body.landlordId
    }

    const listing = await transaction(async (client) => {
      const { rows } = await client.query(
        `UPDATE listings
         SET landlord_id = $2, title = $3, type = $4, price = $5, distance = $6, description = $7,
             address = $8, amenities = $9::jsonb, photos = $10::jsonb, status = $11, available = $12,
             lat = $13, lng = $14, updated_at = now()
         WHERE id = $1
         RETURNING *`,
        [
          req.validated.params.id,
          nextListing.landlord_id,
          nextListing.title,
          nextListing.type,
          nextListing.price,
          nextListing.distance,
          nextListing.description,
          nextListing.address,
          JSON.stringify(nextListing.amenities || []),
          JSON.stringify(nextListing.photos || []),
          nextListing.status,
          nextListing.status === 'available',
          nextListing.lat,
          nextListing.lng,
        ],
      )
      await writeAuditLog(client, {
        actorId: req.user.id,
        action: 'listing.updated',
        targetType: 'listing',
        targetId: rows[0].id,
        metadata: { status: rows[0].status, previousStatus: existingResult.rows[0].status },
      })
      if (rows[0].status !== existingResult.rows[0].status) {
        await createNotification(client, {
          userId: rows[0].landlord_id,
          type: 'listing_status',
          title: `Listing ${rows[0].status.replace('_', ' ')}`,
          body: rows[0].title,
          link: '/landlord/listings',
        })
      }
      return rows[0]
    })
    res.json({ listing })
  } catch (error) {
    next(error)
  }
})

router.get('/cms/pages', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const { rows } = await query(`SELECT * FROM cms_pages ORDER BY updated_at DESC`)
    res.json({ pages: rows })
  } catch (error) {
    next(error)
  }
})

router.post('/cms/pages', requireAuth, requireRole('admin'), validate(cmsPageSchema), async (req, res, next) => {
  try {
    const page = req.validated.body
    const { rows } = await query(
      `INSERT INTO cms_pages (title, slug, status, summary, body)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [page.title, page.slug, page.status, page.summary || '', page.body || ''],
    )
    res.status(201).json({ page: rows[0] })
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'CMS slug already exists.' })
    next(error)
  }
})

router.patch('/cms/pages/:id', requireAuth, requireRole('admin'), validate(cmsPagePatchSchema), async (req, res, next) => {
  try {
    const existingResult = await query(`SELECT * FROM cms_pages WHERE id = $1`, [req.validated.params.id])
    if (!existingResult.rows[0]) return res.status(404).json({ error: 'CMS page not found.' })

    const page = { ...existingResult.rows[0], ...req.validated.body }
    const { rows } = await query(
      `UPDATE cms_pages
       SET title = $2, slug = $3, status = $4, summary = $5, body = $6, updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [req.validated.params.id, page.title, page.slug, page.status, page.summary || '', page.body || ''],
    )
    res.json({ page: rows[0] })
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'CMS slug already exists.' })
    next(error)
  }
})

router.get('/settings', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const { rows } = await query(`SELECT * FROM platform_settings ORDER BY key ASC`)
    res.json({ settings: rows })
  } catch (error) {
    next(error)
  }
})

router.post('/settings', requireAuth, requireRole('admin'), validate(settingSchema), async (req, res, next) => {
  try {
    const setting = req.validated.body
    const { rows } = await query(
      `INSERT INTO platform_settings (key, label, value, type)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [setting.key, setting.label, setting.value, setting.type],
    )
    res.status(201).json({ setting: rows[0] })
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Setting key already exists.' })
    next(error)
  }
})

router.patch('/settings/:id', requireAuth, requireRole('admin'), validate(settingPatchSchema), async (req, res, next) => {
  try {
    const existingResult = await query(`SELECT * FROM platform_settings WHERE id = $1`, [req.validated.params.id])
    if (!existingResult.rows[0]) return res.status(404).json({ error: 'Setting not found.' })

    const setting = { ...existingResult.rows[0], ...req.validated.body }
    const { rows } = await query(
      `UPDATE platform_settings
       SET key = $2, label = $3, value = $4, type = $5, updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [req.validated.params.id, setting.key, setting.label, setting.value, setting.type],
    )
    res.json({ setting: rows[0] })
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Setting key already exists.' })
    next(error)
  }
})

export default router

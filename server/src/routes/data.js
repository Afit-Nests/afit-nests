import { Router } from 'express'
import { z } from 'zod'
import { optionalAuth, requireAuth } from '../auth.js'
import { query, transaction } from '../db.js'
import { validate } from '../middleware.js'
import { createNotification, writeAuditLog } from '../activity.js'

const router = Router()

const httpUrl = z.string().url().refine(
  value => /^https?:\/\//i.test(value),
  'Photo URLs must use http(s).',
)

const allowedTables = ['profiles', 'listings', 'viewings', 'chats', 'messages', 'payments', 'disputes', 'notifications', 'saved_listings', 'reviews', 'audit_logs', 'refunds']
const allowedOrderColumns = new Set(['created_at', 'updated_at', 'price', 'title', 'status'])

const requestSchema = z.object({
  body: z.object({
    operation: z.enum(['select', 'insert', 'update']),
    filters: z.array(z.object({
      column: z.string().min(1).max(80),
      operator: z.literal('eq'),
      value: z.any(),
    })).default([]),
    order: z.object({
      column: z.string().min(1).max(80),
      ascending: z.boolean().default(true),
    }).optional(),
    limit: z.number().int().positive().max(200).optional(),
    single: z.boolean().default(false),
    count: z.boolean().default(false),
    payload: z.any().optional(),
  }),
})

const dataListingInsertSchema = z.object({
  title: z.string().min(3).max(160),
  type: z.string().min(2).max(80),
  price: z.coerce.number().positive(),
  distance: z.coerce.number().nonnegative().optional().nullable(),
  description: z.string().max(5000).optional(),
  address: z.string().min(5).max(240),
  amenities: z.array(z.string().max(80)).default([]),
  photos: z.array(httpUrl).default([]),
  status: z.enum(['pending_review', 'rejected', 'available', 'pending_confirmation', 'occupied']).default('pending_review'),
  lat: z.coerce.number().optional().nullable(),
  lng: z.coerce.number().optional().nullable(),
  landlord_id: z.uuid().optional(),
})

const dataListingUpdateSchema = dataListingInsertSchema.partial().refine(
  value => Object.keys(value).length > 0,
  'At least one listing field is required.',
)

const dataViewingInsertSchema = z.object({
  listing_id: z.uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'A valid date is required.'),
  time: z.string().min(1).max(40),
  message: z.string().max(2000).optional().default(''),
})

const dataChatInsertSchema = z.object({
  listing_id: z.uuid(),
})

const dataMessageInsertSchema = z.object({
  chat_id: z.uuid(),
  text: z.string().trim().min(1, 'Message text is required.').max(4000),
})

const parsePayload = (schema, payload, res) => {
  const result = schema.safeParse(payload)
  if (result.success) return result.data
  res.status(400).json({ error: result.error.issues[0]?.message || 'Invalid request payload.' })
  return null
}

const snakeToCamel = (row) => ({
  ...row,
  profiles: row.profile_id || row.profile_full_name || row.profile_role ? {
    id: row.profile_id,
    full_name: row.profile_full_name,
    role: row.profile_role,
    verified: row.profile_verified,
    phone: row.profile_phone,
    matric_number: row.profile_matric_number,
    email: row.profile_email,
  } : undefined,
  listings: row.listing_id_join || row.listing_title ? {
    id: row.listing_id_join,
    title: row.listing_title,
    type: row.listing_type,
    address: row.listing_address,
    price: row.listing_price,
    photos: row.listing_photos,
  } : undefined,
})

const stripJoinColumns = (row) => {
  const shaped = snakeToCamel(row)
  for (const key of [
    'profile_id',
    'profile_full_name',
    'profile_role',
    'profile_verified',
    'profile_phone',
    'profile_matric_number',
    'profile_email',
    'listing_id_join',
    'listing_title',
    'listing_type',
    'listing_address',
    'listing_price',
    'listing_photos',
  ]) {
    delete shaped[key]
  }
  return shaped
}

const getFilter = (filters, column) => filters.find(filter => filter.column === column)?.value
const hasFilter = (filters, column) => filters.some(filter => filter.column === column)

const addFilters = (clauses, params, filters, allowedColumns) => {
  for (const filter of filters) {
    if (!allowedColumns.has(filter.column)) continue
    params.push(filter.value)
    clauses.push(`${filter.column} = $${params.length}`)
  }
}

const addPrefixedFilters = (clauses, params, filters, allowedColumns, prefix) => {
  for (const filter of filters) {
    if (!allowedColumns.has(filter.column)) continue
    params.push(filter.value)
    clauses.push(`${prefix}.${filter.column} = $${params.length}`)
  }
}

const sendRows = (res, rows, { single, count }) => {
  const data = rows.map(stripJoinColumns)
  res.json({
    data: single ? data[0] || null : data,
    count: count ? data.length : undefined,
  })
}

const requireSignedIn = (req, res) => {
  if (req.user) return true
  res.status(401).json({ error: 'Authentication required.' })
  return false
}

const assertRole = (req, res, roles) => {
  if (roles.includes(req.user?.role)) return true
  res.status(403).json({ error: 'Permission denied.' })
  return false
}

const orderSql = (order) => {
  if (!order || !allowedOrderColumns.has(order.column)) return 'created_at DESC'
  return `${order.column} ${order.ascending ? 'ASC' : 'DESC'}`
}

router.post('/:table', optionalAuth, validate(requestSchema), async (req, res, next) => {
  try {
    const { table } = req.params
    if (!allowedTables.includes(table)) return res.status(404).json({ error: 'Unknown collection.' })

    const body = req.validated.body
    if (body.operation === 'select') return handleSelect(table, body, req, res)
    if (!requireSignedIn(req, res)) return null
    if (body.operation === 'insert') return handleInsert(table, body, req, res)
    if (body.operation === 'update') return handleUpdate(table, body, req, res)
    return res.status(400).json({ error: 'Unsupported operation.' })
  } catch (error) {
    next(error)
  }
})

async function handleSelect(table, body, req, res) {
  const clauses = []
  const params = []
  const limit = body.limit || (body.single ? 1 : 100)

  if (table === 'listings') {
    const idFilter = getFilter(body.filters, 'id')
    addPrefixedFilters(clauses, params, body.filters, new Set(['id', 'landlord_id', 'available', 'status']), 'l')
    if (!idFilter) {
      clauses.push(`l.status = 'available'`)
    } else if (req.user?.role !== 'admin') {
      if (req.user?.role === 'landlord') {
        params.push(req.user.id)
        clauses.push(`(l.status = 'available' OR l.landlord_id = $${params.length})`)
      } else {
        clauses.push(`l.status = 'available'`)
      }
    }
    if (req.user?.role === 'landlord' && hasFilter(body.filters, 'landlord_id')) {
      const landlordId = getFilter(body.filters, 'landlord_id')
      if (landlordId !== req.user.id) return res.status(403).json({ error: 'Permission denied.' })
    }
    const { rows } = await query(
      `SELECT l.*, p.id AS profile_id, p.full_name AS profile_full_name, p.verified AS profile_verified
       FROM listings l
       JOIN profiles p ON p.id = l.landlord_id
       ${clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''}
       ORDER BY l.${orderSql(body.order)}
       LIMIT ${limit}`,
      params,
    )
    return sendRows(res, rows, body)
  }

  if (!requireSignedIn(req, res)) return null

  if (table === 'profiles') {
    if (req.user.role !== 'admin') {
      clauses.push('id = $1')
      params.push(req.user.id)
    } else {
      addFilters(clauses, params, body.filters, new Set(['id', 'role', 'verified']))
    }
    const { rows } = await query(
      `SELECT id, email, phone, role, full_name, matric_number, department, nin, address, verified, created_at, updated_at
       FROM profiles
       ${clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''}
       ORDER BY ${orderSql(body.order)}
       LIMIT ${limit}`,
      params,
    )
    return sendRows(res, rows, body)
  }

  if (table === 'viewings') {
    if (req.user.role === 'student') {
      clauses.push('v.student_id = $1')
      params.push(req.user.id)
    } else if (req.user.role === 'landlord') {
      clauses.push('v.landlord_id = $1')
      params.push(req.user.id)
    } else if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Permission denied.' })
    }
    addPrefixedFilters(clauses, params, body.filters, new Set(['id', 'student_id', 'landlord_id', 'status']), 'v')
    const profileJoin = req.user.role === 'landlord' ? 'v.student_id' : 'v.landlord_id'
    const { rows } = await query(
      `SELECT v.*, l.id AS listing_id_join, l.title AS listing_title, l.type AS listing_type, l.address AS listing_address,
              p.id AS profile_id, p.full_name AS profile_full_name, p.phone AS profile_phone, p.matric_number AS profile_matric_number
       FROM viewings v
       JOIN listings l ON l.id = v.listing_id
       JOIN profiles p ON p.id = ${profileJoin}
       ${clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''}
       ORDER BY v.${orderSql(body.order)}
       LIMIT ${limit}`,
      params,
    )
    return sendRows(res, rows, body)
  }

  if (table === 'chats') {
    const roleColumn = req.user.role === 'landlord' ? 'c.landlord_id' : 'c.student_id'
    if (!['student', 'landlord', 'admin'].includes(req.user.role)) return res.status(403).json({ error: 'Permission denied.' })
    if (req.user.role !== 'admin') {
      clauses.push(`${roleColumn} = $1`)
      params.push(req.user.id)
    }
    addPrefixedFilters(clauses, params, body.filters, new Set(['id', 'student_id', 'landlord_id', 'listing_id']), 'c')
    const profileJoin = req.user.role === 'landlord' ? 'c.student_id' : 'c.landlord_id'
    const { rows } = await query(
      `SELECT c.*, l.id AS listing_id_join, l.title AS listing_title, l.type AS listing_type,
              p.id AS profile_id, p.full_name AS profile_full_name, p.matric_number AS profile_matric_number
       FROM chats c
       JOIN listings l ON l.id = c.listing_id
       JOIN profiles p ON p.id = ${profileJoin}
       ${clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''}
       ORDER BY c.${orderSql(body.order)}
       LIMIT ${limit}`,
      params,
    )
    return sendRows(res, rows, body)
  }

  if (table === 'messages') {
    const chatId = getFilter(body.filters, 'chat_id')
    if (!chatId) return res.status(400).json({ error: 'chat_id is required.' })
    const chat = await query(`SELECT id FROM chats WHERE id = $1 AND ($2::uuid IN (student_id, landlord_id))`, [chatId, req.user.id])
    if (!chat.rows[0] && req.user.role !== 'admin') return res.status(403).json({ error: 'Permission denied.' })
    const { rows } = await query(
      `SELECT m.*, p.id AS profile_id, p.full_name AS profile_full_name, p.role AS profile_role
       FROM messages m
       JOIN profiles p ON p.id = m.sender_id
       WHERE m.chat_id = $1
       ORDER BY m.created_at ASC
       LIMIT ${limit}`,
      [chatId],
    )
    return sendRows(res, rows, body)
  }

  if (table === 'payments') {
    if (!assertRole(req, res, ['admin'])) return null
    addFilters(clauses, params, body.filters, new Set(['id', 'status', 'payment_reference']))
    const { rows } = await query(
      `SELECT * FROM payments ${clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''} ORDER BY ${orderSql(body.order)} LIMIT ${limit}`,
      params,
    )
    return sendRows(res, rows, body)
  }

  if (table === 'disputes') {
    if (!assertRole(req, res, ['admin'])) return null
    addFilters(clauses, params, body.filters, new Set(['id', 'status']))
    const { rows } = await query(
      `SELECT * FROM disputes ${clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''} ORDER BY ${orderSql(body.order)} LIMIT ${limit}`,
      params,
    )
    return sendRows(res, rows, body)
  }

  if (table === 'notifications') {
    clauses.push('user_id = $1')
    params.push(req.user.id)
    addFilters(clauses, params, body.filters, new Set(['id', 'read_at']))
    const { rows } = await query(
      `SELECT * FROM notifications WHERE ${clauses.join(' AND ')} ORDER BY ${orderSql(body.order)} LIMIT ${limit}`,
      params,
    )
    return sendRows(res, rows, body)
  }

  if (table === 'saved_listings') {
    if (!assertRole(req, res, ['student'])) return null
    const { rows } = await query(
      `SELECT s.*, l.title AS listing_title, l.price AS listing_price, l.photos AS listing_photos
       FROM saved_listings s
       JOIN listings l ON l.id = s.listing_id
       WHERE s.student_id = $1
       ORDER BY s.created_at DESC
       LIMIT ${limit}`,
      [req.user.id],
    )
    return sendRows(res, rows, body)
  }

  if (table === 'reviews') {
    addFilters(clauses, params, body.filters, new Set(['id', 'listing_id', 'student_id', 'landlord_id']))
    if (req.user.role !== 'admin') {
      params.push(req.user.id)
      clauses.push(`(student_id = $${params.length} OR landlord_id = $${params.length})`)
    }
    const { rows } = await query(
      `SELECT * FROM reviews ${clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''} ORDER BY ${orderSql(body.order)} LIMIT ${limit}`,
      params,
    )
    return sendRows(res, rows, body)
  }

  if (table === 'audit_logs' || table === 'refunds') {
    if (!assertRole(req, res, ['admin'])) return null
    const { rows } = await query(
      `SELECT * FROM ${table} ORDER BY ${orderSql(body.order)} LIMIT ${limit}`,
    )
    return sendRows(res, rows, body)
  }

  return res.status(400).json({ error: 'Unsupported collection.' })
}

async function handleInsert(table, body, req, res) {
  const payload = body.payload || {}

  if (table === 'listings') {
    if (!assertRole(req, res, ['landlord', 'admin'])) return null
    const listing = parsePayload(dataListingInsertSchema, payload, res)
    if (!listing) return null
    const landlordId = req.user.role === 'admin' ? listing.landlord_id : req.user.id
    if (!landlordId) return res.status(400).json({ error: 'Admin-created listings must be assigned to a landlord.' })
    const created = await transaction(async (client) => {
      const status = req.user.role === 'admin' ? listing.status : 'pending_review'
      const { rows } = await client.query(
        `INSERT INTO listings (landlord_id, title, type, price, distance, description, address, amenities, photos, status, available, lat, lng)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10, $11, $12, $13)
         RETURNING *`,
        [
          landlordId,
          listing.title,
          listing.type,
          listing.price,
          listing.distance ?? null,
          listing.description || '',
          listing.address,
          JSON.stringify(listing.amenities || []),
          JSON.stringify(listing.photos || []),
          status,
          status === 'available',
          listing.lat ?? null,
          listing.lng ?? null,
        ],
      )
      await writeAuditLog(client, { actorId: req.user.id, action: 'listing.created', targetType: 'listing', targetId: rows[0].id, metadata: { status } })
      return rows
    })
    return res.status(201).json({ data: body.single ? created[0] : created })
  }

  if (table === 'viewings') {
    if (!assertRole(req, res, ['student'])) return null
    const viewing = parsePayload(dataViewingInsertSchema, payload, res)
    if (!viewing) return null
    const listingResult = await query(`SELECT id, landlord_id, status FROM listings WHERE id = $1`, [viewing.listing_id])
    const listing = listingResult.rows[0]
    if (!listing || listing.status !== 'available') return res.status(409).json({ error: 'Listing is not available.' })
    const { rows } = await query(
      `INSERT INTO viewings (student_id, landlord_id, listing_id, date, time, message, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending')
       RETURNING *`,
      [req.user.id, listing.landlord_id, listing.id, viewing.date, viewing.time, viewing.message],
    )
    await query(
      `INSERT INTO notifications (user_id, type, title, body, link)
       VALUES ($1, 'viewing_request', 'New viewing request', $2, '/landlord/viewings')`,
      [listing.landlord_id, `A student requested to view your listing.`],
    )
    return res.status(201).json({ data: body.single ? rows[0] : rows })
  }

  if (table === 'chats') {
    if (!assertRole(req, res, ['student'])) return null
    const chat = parsePayload(dataChatInsertSchema, payload, res)
    if (!chat) return null
    const listingResult = await query(`SELECT id, landlord_id FROM listings WHERE id = $1`, [chat.listing_id])
    const listing = listingResult.rows[0]
    if (!listing) return res.status(404).json({ error: 'Listing not found.' })
    const { rows } = await query(
      `INSERT INTO chats (student_id, landlord_id, listing_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (student_id, listing_id) DO UPDATE SET listing_id = EXCLUDED.listing_id
       RETURNING *`,
      [req.user.id, listing.landlord_id, listing.id],
    )
    return res.status(201).json({ data: body.single ? rows[0] : rows })
  }

  if (table === 'messages') {
    const message = parsePayload(dataMessageInsertSchema, payload, res)
    if (!message) return null
    const chatResult = await query(`SELECT id FROM chats WHERE id = $1 AND $2::uuid IN (student_id, landlord_id)`, [message.chat_id, req.user.id])
    if (!chatResult.rows[0]) return res.status(403).json({ error: 'Permission denied.' })
    const { rows } = await query(
      `INSERT INTO messages (chat_id, sender_id, text) VALUES ($1, $2, $3) RETURNING *`,
      [message.chat_id, req.user.id, message.text],
    )
    const target = await query(
      `SELECT student_id, landlord_id FROM chats WHERE id = $1`,
      [message.chat_id],
    )
    const recipientId = target.rows[0]?.student_id === req.user.id ? target.rows[0]?.landlord_id : target.rows[0]?.student_id
    if (recipientId) await query(
      `INSERT INTO notifications (user_id, type, title, body, link)
       VALUES ($1, 'chat_message', 'New chat message', 'You have a new message.', $2)`,
      [recipientId, req.user.role === 'landlord' ? '/student/chats' : '/landlord/chats'],
    )
    return res.status(201).json({ data: body.single ? rows[0] : rows })
  }

  return res.status(403).json({ error: 'Insert is not allowed for this collection.' })
}

async function handleUpdate(table, body, req, res) {
  const payload = body.payload || {}
  const id = getFilter(body.filters, 'id')
  if (!id && table !== 'profiles') return res.status(400).json({ error: 'id filter is required for updates.' })

  if (table === 'profiles') {
    const targetId = id || req.user.id
    if (req.user.role !== 'admin' && targetId !== req.user.id) return res.status(403).json({ error: 'Permission denied.' })
    try {
      const { rows } = await query(
        `UPDATE profiles
         SET full_name = COALESCE($2, full_name),
             phone = COALESCE($3, phone),
             department = COALESCE($4, department),
             matric_number = COALESCE($5, matric_number),
             address = COALESCE($6, address),
             verified = CASE WHEN $7::boolean IS NULL OR $8::text <> 'admin' THEN verified ELSE $7::boolean END,
             updated_at = now()
         WHERE id = $1
         RETURNING id, email, phone, role, full_name, matric_number, department, nin, address, verified, created_at, updated_at`,
        [targetId, payload.full_name, payload.phone, payload.department, payload.matric_number, payload.address, payload.verified, req.user.role],
      )
      return res.json({ data: body.single ? rows[0] : rows })
    } catch (error) {
      if (error.code === '23505') return res.status(409).json({ error: 'That phone number is already in use.' })
      throw error
    }
  }

  if (table === 'listings') {
    const listing = parsePayload(dataListingUpdateSchema, payload, res)
    if (!listing) return null
    const ownerResult = await query(`SELECT landlord_id, status FROM listings WHERE id = $1`, [id])
    if (!ownerResult.rows[0]) return res.status(404).json({ error: 'Listing not found.' })
    if (req.user.role !== 'admin' && ownerResult.rows[0].landlord_id !== req.user.id) return res.status(403).json({ error: 'Permission denied.' })
    if (req.user.role !== 'admin' && listing.status && !['occupied'].includes(listing.status)) {
      return res.status(403).json({ error: 'Only admins can publish, approve, or reject listings.' })
    }
    const { rows } = await query(
      `UPDATE listings
       SET title = COALESCE($2, title),
           type = COALESCE($3, type),
           price = COALESCE($4, price),
           distance = COALESCE($5, distance),
           description = COALESCE($6, description),
           address = COALESCE($7, address),
           amenities = COALESCE($8::jsonb, amenities),
           photos = COALESCE($9::jsonb, photos),
           status = COALESCE($10, status),
           available = COALESCE($11, available),
           updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [
        id,
        listing.title,
        listing.type,
        listing.price,
        listing.distance,
        listing.description,
        listing.address,
        listing.amenities ? JSON.stringify(listing.amenities) : null,
        listing.photos ? JSON.stringify(listing.photos) : null,
        listing.status,
        listing.status ? listing.status === 'available' : undefined,
      ],
    )
    return res.json({ data: body.single ? rows[0] : rows })
  }

  if (table === 'viewings') {
    const ownerResult = await query(`SELECT landlord_id FROM viewings WHERE id = $1`, [id])
    if (!ownerResult.rows[0]) return res.status(404).json({ error: 'Viewing not found.' })
    if (req.user.role !== 'admin' && ownerResult.rows[0].landlord_id !== req.user.id) return res.status(403).json({ error: 'Permission denied.' })
    const nextStatus = ['confirmed', 'declined', 'completed'].includes(payload.status) ? payload.status : null
    if (!nextStatus) return res.status(400).json({ error: 'Invalid viewing status.' })
    const { rows } = await query(`UPDATE viewings SET status = $2, updated_at = now() WHERE id = $1 RETURNING *`, [id, nextStatus])
    return res.json({ data: body.single ? rows[0] : rows })
  }

  if (table === 'disputes') {
    if (!assertRole(req, res, ['admin'])) return null
    const { rows } = await query(`UPDATE disputes SET status = COALESCE($2, status), updated_at = now() WHERE id = $1 RETURNING *`, [id, payload.status])
    return res.json({ data: body.single ? rows[0] : rows })
  }

  return res.status(403).json({ error: 'Update is not allowed for this collection.' })
}

export default router

import express from 'express'
import fs from 'fs/promises'
import path from 'path'
import crypto from 'crypto'
import { Router } from 'express'
import { requireAuth } from '../auth.js'

const router = Router()
const uploadRoot = path.resolve(process.cwd(), 'server', 'uploads')
const allowedBuckets = new Set(['listings', 'avatars'])
const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])
const extensionByType = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
}

const safePath = (bucket, key) => {
  const normalizedKey = String(key || '').replace(/\\/g, '/').replace(/[^a-zA-Z0-9/_-]/g, '')
  const target = path.resolve(uploadRoot, bucket, normalizedKey)
  const bucketRoot = path.resolve(uploadRoot, bucket)
  if (!target.startsWith(bucketRoot)) return null
  return target
}

router.put('/:bucket/:key', requireAuth, express.raw({ type: '*/*', limit: '5mb' }), async (req, res, next) => {
  try {
    const { bucket, key } = req.params
    if (!allowedBuckets.has(bucket)) return res.status(400).json({ error: 'Invalid upload bucket.' })

    const contentType = req.get('content-type')
    if (!allowedTypes.has(contentType)) return res.status(415).json({ error: 'Only JPG, PNG, and WEBP images are allowed.' })
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) return res.status(400).json({ error: 'Upload file is required.' })

    const extension = extensionByType[contentType]
    const target = safePath(bucket, `${key}-${crypto.randomUUID()}${extension}`)
    if (!target) return res.status(400).json({ error: 'Invalid upload path.' })

    await fs.mkdir(path.dirname(target), { recursive: true })
    await fs.writeFile(target, req.body, { flag: 'wx' })

    const relative = path.relative(uploadRoot, target).replace(/\\/g, '/')
    res.status(201).json({
      path: relative,
      publicUrl: `/uploads/${relative}`,
    })
  } catch (error) {
    next(error)
  }
})

router.use('/', express.static(uploadRoot, {
  fallthrough: false,
  immutable: true,
  maxAge: '30d',
}))

export default router

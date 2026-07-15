import express from 'express'
import fs from 'fs/promises'
import path from 'path'
import crypto from 'crypto'
import { Router } from 'express'
import { requireAuth } from '../auth.js'
import { objectStorageConfigured, uploadImageToObjectStorage } from '../cloudinaryStorage.js'

const router = Router()
const uploadRoot = path.resolve(process.cwd(), 'server', 'uploads')
const allowedBuckets = new Set(['listings', 'avatars'])
const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])
const extensionByType = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
}

const hasValidImageSignature = (buffer, contentType) => {
  if (contentType === 'image/jpeg') {
    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
  }
  if (contentType === 'image/png') {
    return buffer.length >= 8
      && buffer[0] === 0x89
      && buffer[1] === 0x50
      && buffer[2] === 0x4e
      && buffer[3] === 0x47
      && buffer[4] === 0x0d
      && buffer[5] === 0x0a
      && buffer[6] === 0x1a
      && buffer[7] === 0x0a
  }
  if (contentType === 'image/webp') {
    return buffer.length >= 12
      && buffer.subarray(0, 4).toString('ascii') === 'RIFF'
      && buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  }
  return false
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
    const useLocalStorage = process.env.NODE_ENV !== 'production' || process.env.ALLOW_LOCAL_UPLOADS === 'true'
    if (!useLocalStorage && !objectStorageConfigured()) {
      return res.status(503).json({ error: 'Production uploads require external object storage.' })
    }
    if (bucket === 'listings' && !['landlord', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Only landlords and admins can upload listing photos.' })
    }

    const contentType = req.get('content-type')
    if (!allowedTypes.has(contentType)) return res.status(415).json({ error: 'Only JPG, PNG, and WEBP images are allowed.' })
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) return res.status(400).json({ error: 'Upload file is required.' })
    if (!hasValidImageSignature(req.body, contentType)) return res.status(415).json({ error: 'Uploaded file does not match its image type.' })

    const extension = extensionByType[contentType]
    if (!useLocalStorage) {
      const upload = await uploadImageToObjectStorage({
        bucket,
        key,
        buffer: req.body,
        contentType,
      })
      return res.status(201).json(upload)
    }

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

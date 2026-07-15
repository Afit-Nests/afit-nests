import crypto from 'crypto'

const cloudinaryConfigured = () => Boolean(
  process.env.CLOUDINARY_CLOUD_NAME
  && process.env.CLOUDINARY_API_KEY
  && process.env.CLOUDINARY_API_SECRET,
)

const sanitizePublicId = value => String(value || 'upload')
  .replace(/\\/g, '/')
  .replace(/[^a-zA-Z0-9/_-]/g, '')
  .replace(/^\/+|\/+$/g, '')
  .slice(0, 120) || 'upload'

export function objectStorageConfigured() {
  return cloudinaryConfigured()
}

export async function uploadImageToObjectStorage({ bucket, key, buffer, contentType }) {
  if (!cloudinaryConfigured()) return null

  const timestamp = Math.floor(Date.now() / 1000)
  const folder = `afit-nests/${bucket}`
  const publicId = `${sanitizePublicId(key)}-${crypto.randomUUID()}`
  const signatureBase = `folder=${folder}&public_id=${publicId}&timestamp=${timestamp}${process.env.CLOUDINARY_API_SECRET}`
  const signature = crypto.createHash('sha1').update(signatureBase).digest('hex')
  const form = new FormData()

  form.set('file', new Blob([buffer], { type: contentType }), `${publicId}`)
  form.set('api_key', process.env.CLOUDINARY_API_KEY)
  form.set('timestamp', String(timestamp))
  form.set('signature', signature)
  form.set('folder', folder)
  form.set('public_id', publicId)

  const response = await fetch(`https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`, {
    method: 'POST',
    body: form,
  })
  const payload = await response.json().catch(() => ({}))

  if (!response.ok || !payload.secure_url) {
    const error = new Error('Image storage upload failed.')
    error.status = 502
    throw error
  }

  return {
    path: payload.public_id,
    publicUrl: payload.secure_url,
    provider: 'cloudinary',
  }
}


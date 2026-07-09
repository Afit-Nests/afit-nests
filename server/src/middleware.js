import rateLimit from 'express-rate-limit'
import crypto from 'crypto'
import { z } from 'zod'

const csrfCookieName = 'afit_nests_csrf'
const csrfHeaderName = 'x-csrf-token'

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again later.' },
})

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
})

const isUnsafeMethod = method => ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)

const csrfCookieOptions = {
  httpOnly: false,
  sameSite: 'strict',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: 60 * 60 * 1000,
}

export function attachCsrfToken(req, res, next) {
  if (!req.cookies?.[csrfCookieName]) {
    res.cookie(csrfCookieName, crypto.randomBytes(32).toString('hex'), csrfCookieOptions)
  }
  next()
}

export function csrfProtection(req, res, next) {
  if (!isUnsafeMethod(req.method)) return next()

  const cookieToken = req.cookies?.[csrfCookieName]
  const headerToken = req.get(csrfHeaderName)
  const validToken = typeof cookieToken === 'string'
    && typeof headerToken === 'string'
    && cookieToken.length === headerToken.length
    && crypto.timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken))

  if (!validToken) {
    return res.status(403).json({ error: 'Invalid security token. Refresh and try again.' })
  }

  next()
}

export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query,
    })

    if (!result.success) {
      return res.status(400).json({ error: 'Invalid request.', details: z.treeifyError(result.error) })
    }

    req.validated = result.data
    next()
  }
}

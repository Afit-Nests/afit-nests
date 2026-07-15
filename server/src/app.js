import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import authRoutes from './routes/auth.js'
import listingRoutes from './routes/listings.js'
import paymentRoutes from './routes/payments.js'
import adminRoutes from './routes/admin.js'
import dataRoutes from './routes/data.js'
import uploadRoutes from './routes/uploads.js'
import engagementRoutes from './routes/engagement.js'
import { apiLimiter, attachCsrfToken, csrfProtection } from './middleware.js'
import { assertStrongSecret } from './secrets.js'

export function createApp() {
  const app = express()
  const clientOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean)

  assertStrongSecret('COOKIE_SECRET')

  // Returning password-reset links in the API response is a development-only aid.
  // Enabling it in production would expose any account to takeover by email alone.
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEV_RESET_URL === 'true') {
    throw new Error('ALLOW_DEV_RESET_URL must not be enabled in production.')
  }

  app.set('trust proxy', 1)
  app.disable('x-powered-by')

  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        objectSrc: ["'none'"],
        scriptSrc: ["'self'", 'https://js.paystack.co'],
        frameSrc: ["'self'", 'https://checkout.paystack.com', 'https://*.paystack.co'],
        connectSrc: ["'self'", 'https://api.paystack.co'],
        imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      },
    },
  }))
  app.use(cors({
    origin: (origin, callback) => {
      if (!origin || clientOrigins.includes(origin)) return callback(null, true)
      return callback(new Error('Origin is not allowed by CORS.'))
    },
    credentials: true,
  }))
  app.use(express.json({
    limit: '200kb',
    verify: (req, _res, buffer) => {
      if (req.originalUrl === '/api/payments/paystack/webhook') req.rawBody = buffer
    },
  }))
  app.use(cookieParser(process.env.COOKIE_SECRET))
  app.use(attachCsrfToken)
  app.use('/api', apiLimiter)
  app.use('/api', csrfProtection)

  app.get('/api/health', (req, res) => {
    res.json({ ok: true, service: 'afit-nests-backend' })
  })

  app.use('/api/auth', authRoutes)
  app.use('/api/listings', listingRoutes)
  app.use('/api/payments', paymentRoutes)
  app.use('/api/admin', adminRoutes)
  app.use('/api', engagementRoutes)
  app.use('/api/data', dataRoutes)
  app.use('/api/uploads', uploadRoutes)

  app.use((req, res) => {
    res.status(404).json({ error: 'Route not found.' })
  })

  app.use((error, req, res, _next) => {
    const status = error.status || 500
    if (status >= 500) console.error(error)
    res.status(status).json({ error: status >= 500 ? 'Server error.' : error.message })
  })

  return app
}


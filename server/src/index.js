import 'dotenv/config'
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
import { apiLimiter, attachCsrfToken, csrfProtection } from './middleware.js'

const app = express()
const port = Number(process.env.PORT || 4000)
const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173'

if (!process.env.COOKIE_SECRET || process.env.COOKIE_SECRET.length < 32) {
  throw new Error('COOKIE_SECRET must be at least 32 characters.')
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
  origin: clientOrigin,
  credentials: true,
}))
app.use(express.json({ limit: '200kb' }))
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
app.use('/api/data', dataRoutes)
app.use('/api/uploads', uploadRoutes)

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found.' })
})

app.use((error, req, res, next) => {
  const status = error.status || 500
  if (status >= 500) console.error(error)
  res.status(status).json({ error: status >= 500 ? 'Server error.' : error.message })
})

app.listen(port, () => {
  console.log(`AFIT Nests backend listening on http://localhost:${port}`)
})

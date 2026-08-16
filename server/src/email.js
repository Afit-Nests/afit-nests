// Resend transactional-email integration.
//
// Goals:
//   - One POST per logical email (idempotency on the wire).
//   - Bounded retry on transient failures (429, 5xx, timeout, network).
//   - Hard timeout (Vercel free tier times out at 10s; we use 8s so the
//     surrounding request has headroom).
//   - HTML escaping so caller-supplied strings cannot inject HTML into
//     the rendered email body.
//   - "Not configured" is *not* a failure: when RESEND_API_KEY or MAIL_FROM
//     is missing, sendEmail returns { sent: false, reason: 'not_configured' }
//     instead of throwing, so callers can degrade gracefully.
//
// The only currently-wired caller is the password-reset flow. New templates
// belong in this file (pure renderers) and call sendEmail here — do not POST
// to api.resend.com from elsewhere.

import { createHash } from 'node:crypto'

const RESEND_ENDPOINT = 'https://api.resend.com/emails'
const FETCH_TIMEOUT_MS = 8000
const RETRY_BACKOFF_MS = [250, 750] // two retries: 250ms, then 750ms

const RETRY_STATUS = new Set([408, 425, 429, 500, 502, 503, 504])

const escapeMap = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

export function htmlEscape(value) {
  if (value === null || value === undefined) return ''
  return String(value).replace(/[&<>"']/g, (ch) => escapeMap[ch])
}

export function emailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.MAIL_FROM)
}

// Pure HTML/text renderer for the password-reset email. No I/O. The route
// computes the resetUrl from a freshly-minted token; we just escape and
// lay it out. Adding more templates (booking confirmation, dispute notice,
// MFA re-enrollment, etc.) follows the same shape.
export function passwordResetTemplate({ resetUrl, recipient, expiresInHours = 1 }) {
  const safeUrl = htmlEscape(resetUrl)
  const safeRecipient = htmlEscape(recipient || '')
  const hours = Math.max(1, Math.min(24, Number(expiresInHours) || 1))

  const subject = 'Reset your AFIT Nests password'

  const text = [
    'You asked to reset your AFIT Nests password.',
    safeRecipient ? `Account: ${safeRecipient}` : null,
    `Use this link to set a new password. It expires in ${hours} hour${hours === 1 ? '' : 's'}:`,
    '',
    resetUrl,
    '',
    'If you did not request this, ignore this email — your password will not change.',
    'For security, this link can only be used once.',
  ].filter(Boolean).join('\n')

  // Inline styles only — most email clients strip <style>. Body is deliberately
  // short so it renders in mobile clients without a media-query dance.
  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#FAF7F2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1F2937;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#FAF7F2;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="540" style="max-width:540px;background:#FFFFFF;border:1px solid #E7DFD0;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="background:#0B2440;padding:20px 28px;color:#FFFFFF;font-size:18px;font-weight:700;">
                AFIT <span style="color:#F97316;">Nests</span>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <h1 style="margin:0 0 12px 0;font-size:20px;line-height:1.3;color:#0B2440;">Reset your password</h1>
                ${safeRecipient ? `<p style="margin:0 0 16px 0;color:#6B7280;font-size:14px;">Account: <strong style="color:#1F2937;">${safeRecipient}</strong></p>` : ''}
                <p style="margin:0 0 20px 0;color:#1F2937;font-size:15px;line-height:1.5;">
                  We received a request to reset the password for your AFIT Nests account.
                  Click the button below to choose a new one.
                </p>
                <p style="margin:0 0 24px 0;text-align:center;">
                  <a href="${safeUrl}" style="display:inline-block;background:#F97316;color:#FFFFFF;text-decoration:none;font-weight:700;font-size:15px;padding:12px 28px;border-radius:999px;">Reset password</a>
                </p>
                <p style="margin:0 0 12px 0;color:#6B7280;font-size:13px;line-height:1.5;">
                  Or paste this link into your browser:
                </p>
                <p style="margin:0 0 20px 0;padding:12px 14px;background:#FAF7F2;border:1px solid #E7DFD0;border-radius:8px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;color:#374151;word-break:break-all;">
                  ${safeUrl}
                </p>
                <p style="margin:0;color:#6B7280;font-size:13px;line-height:1.5;">
                  This link expires in ${hours} hour${hours === 1 ? '' : 's'} and can only be used once.
                  If you did not request a reset, you can safely ignore this email — your password will not change.
                </p>
              </td>
            </tr>
          </table>
          <p style="margin:16px 0 0 0;color:#9CA3AF;font-size:11px;">AFIT Nests · Student accommodation near AFIT</p>
        </td>
      </tr>
    </table>
  </body>
</html>`

  return { subject, text, html }
}

// Build a deterministic 32-byte idempotency key from caller-supplied strings.
// Resend stores idempotency keys for 24h, so the same key sent twice within
// that window returns the original message id without re-sending.
export function buildIdempotencyKey(...parts) {
  return createHash('sha256').update(parts.filter(Boolean).join('|')).digest('hex')
}

// POST to api.resend.com with retry on transient failures. Returns the
// Resend message id on success, or { sent: false, reason } when the
// integration is not configured. Throws after all retries are exhausted
// on transient failures, or immediately on a non-retryable 4xx (except
// 408/425/429 which are retried).
export async function sendEmail({
  to,
  subject,
  html,
  text,
  idempotencyKey,
  tags,
  replyTo,
} = {}) {
  if (!emailConfigured()) {
    return { sent: false, reason: 'not_configured' }
  }
  if (!to || !subject || (!html && !text)) {
    throw new Error('sendEmail: to, subject, and (html or text) are required.')
  }

  const headers = {
    'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
    'Content-Type': 'application/json',
    'User-Agent': 'afit-nests/1.0 (+https://afit-nests.com)',
  }
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey

  const body = {
    from: process.env.MAIL_FROM,
    to: Array.isArray(to) ? to : [to],
    subject,
  }
  if (text) body.text = text
  if (html) body.html = html
  if (replyTo) body.reply_to = replyTo
  if (tags && Object.keys(tags).length) {
    body.tags = Object.entries(tags).map(([name, value]) => ({ name, value: String(value) }))
  }

  let lastError
  for (let attempt = 0; attempt <= RETRY_BACKOFF_MS.length; attempt++) {
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(new Error('fetch_timeout')), FETCH_TIMEOUT_MS)
      let response
      try {
        response = await fetch(RESEND_ENDPOINT, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
          signal: controller.signal,
        })
      } finally {
        clearTimeout(timer)
      }

      if (response.ok) {
        const json = await response.json().catch(() => ({}))
        return { sent: true, id: json.id || null }
      }

      // Non-OK. Decide whether to retry.
      const status = response.status
      const errBody = await response.text().catch(() => '')
      if (!RETRY_STATUS.has(status)) {
        const err = new Error(`Resend API error ${status}: ${errBody.slice(0, 200)}`)
        err.status = status
        throw err
      }
      lastError = new Error(`Resend API ${status}: ${errBody.slice(0, 200)}`)
      lastError.status = status
    } catch (error) {
      // AbortError from our own timeout, or network-level failures from
      // node-fetch/undici — both are transient and worth retrying.
      const transient = !error.status || error.status === undefined
        || RETRY_STATUS.has(error.status)
        || error.name === 'AbortError'
        || /fetch|network|timeout/i.test(String(error.message))
      if (!transient) throw error
      lastError = error
    }

    if (attempt < RETRY_BACKOFF_MS.length) {
      const delay = RETRY_BACKOFF_MS[attempt]
      // Linear backoff: 250ms, 750ms. A jittered exponential would be
      // nicer under thundering-herd but isn't worth the dependency here.
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  const err = new Error(`Resend API unreachable after ${RETRY_BACKOFF_MS.length + 1} attempts: ${lastError?.message || 'unknown'}`)
  err.cause = lastError
  throw err
}

// Convenience: render the password-reset template and send it. Returns
// { sent, id } on success or { sent: false, reason } when not configured.
// Throws on persistent Resend failure — caller logs.
export async function sendPasswordResetEmail({ to, resetUrl, tokenHash, recipient }) {
  const rendered = passwordResetTemplate({ resetUrl, recipient })
  return sendEmail({
    to,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    idempotencyKey: buildIdempotencyKey('password-reset', tokenHash),
    tags: { template: 'password-reset' },
  })
}

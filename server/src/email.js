const hasResendConfig = () => Boolean(process.env.RESEND_API_KEY && process.env.MAIL_FROM)

export function emailConfigured() {
  return hasResendConfig()
}

export async function sendPasswordResetEmail({ to, resetUrl }) {
  if (!hasResendConfig()) return { sent: false, reason: 'not_configured' }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.MAIL_FROM,
      to,
      subject: 'Reset your AFIT Nests password',
      text: `Use this secure link to reset your AFIT Nests password. It expires in 1 hour:\n\n${resetUrl}`,
      html: `<p>Use this secure link to reset your AFIT Nests password. It expires in 1 hour.</p><p><a href="${resetUrl}">Reset password</a></p>`,
    }),
  })

  if (!response.ok) {
    const error = new Error('Password reset email could not be sent.')
    error.status = 502
    throw error
  }

  return { sent: true }
}


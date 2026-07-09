import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/apiClient'
import { ArrowLeft, Mail, CheckCircle, AlertCircle } from 'lucide-react'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async () => {
    if (!email) { setError('Please enter your email address'); return }
    setLoading(true)
    try {
      await api.auth.forgotPassword(email)
    } catch (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    setSent(true)
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--beige)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ background: 'var(--card)', borderRadius: '24px', padding: '2.5rem', width: '100%', maxWidth: '420px', boxShadow: '0 24px 80px rgba(15,31,61,0.1)', border: '1px solid var(--beige-dark)' }}>

        <Link to="/student/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 500, marginBottom: '2rem' }}>
          <ArrowLeft size={16} /> Back to Sign In
        </Link>

        {sent ? (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.2rem' }}>
              <CheckCircle size={56} color="#16A34A" />
            </div>
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.6rem', fontWeight: 900, color: 'var(--blue-dark)', marginBottom: '0.8rem' }}>
              Check Your Email
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.7, marginBottom: '1.5rem' }}>
              We sent a password reset link to <strong>{email}</strong>. Click the link in the email to reset your password.
            </p>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Didn't receive it?{' '}
              <button onClick={() => setSent(false)} style={{ background: 'none', border: 'none', color: 'var(--orange)', fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: '0.82rem', padding: 0 }}>
                Try again
              </button>
            </p>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: '2rem' }}>
              <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.8rem', fontWeight: 900, color: 'var(--blue-dark)', marginBottom: '0.5rem' }}>
                Forgot Password?
              </h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                Enter your email address and we'll send you a link to reset your password.
              </p>
            </div>

            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: '12px', padding: '0.8rem 1rem', marginBottom: '1.2rem', color: '#DC2626', fontSize: '0.85rem', fontWeight: 500 }}>
                <AlertCircle size={16} /> {error}
              </div>
            )}

            <div style={{ marginBottom: '1.2rem' }}>
              <label style={labelStyle}>Email Address</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(null) }}
                  placeholder="you@example.com"
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  style={{ ...inputStyle, paddingLeft: '2.8rem' }}
                />
                <Mail size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              </div>
            </div>

            <button onClick={handleSubmit} disabled={loading} style={{ width: '100%', background: loading ? 'var(--text-muted)' : 'var(--orange)', color: 'white', padding: '0.9rem', borderRadius: '50px', fontWeight: 700, fontSize: '1rem', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif', boxShadow: loading ? 'none' : '0 4px 20px rgba(249,115,22,0.35)' }}>
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

const labelStyle = { display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.5px' }
const inputStyle = { width: '100%', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid var(--beige-dark)', background: 'var(--beige)', fontSize: '0.9rem', color: 'var(--text)', fontFamily: 'DM Sans, sans-serif', outline: 'none', boxSizing: 'border-box' }

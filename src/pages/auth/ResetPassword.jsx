import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../../lib/apiClient'
import { PASSWORD_REQUIREMENTS, isComplexPassword } from '../../lib/passwordPolicy'
import { Eye, EyeOff, CheckCircle, AlertCircle, Lock } from 'lucide-react'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState(null)
  const [validSession, setValidSession] = useState(false)

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token')
    if (token) setValidSession(true)
    else setError('Invalid or expired reset link. Please request a new one.')
  }, [])

  const handleSubmit = async () => {
    if (!password || !confirmPassword) { setError('Please fill in both fields'); return }
    if (password !== confirmPassword) { setError('Passwords do not match'); return }
    if (!isComplexPassword(password)) { setError(PASSWORD_REQUIREMENTS); return }

    setLoading(true)
    const token = new URLSearchParams(window.location.search).get('token')
    try {
      await api.auth.resetPassword(token, password)
    } catch (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    setDone(true)
    setTimeout(() => navigate('/student/login'), 3000)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--beige)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ background: 'var(--card)', borderRadius: '24px', padding: '2.5rem', width: '100%', maxWidth: '420px', boxShadow: '0 24px 80px rgba(15,31,61,0.1)', border: '1px solid var(--beige-dark)' }}>

        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.4rem', fontWeight: 900, color: 'var(--blue)', marginBottom: '0.3rem' }}>
            AFIT <span style={{ color: 'var(--orange)' }}>Nests</span>
          </div>
        </div>

        {done ? (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <CheckCircle size={56} color="#16A34A" style={{ margin: '0 auto 1.2rem' }} />
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.6rem', fontWeight: 900, color: 'var(--blue-dark)', marginBottom: '0.8rem' }}>
              Password Updated!
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.7 }}>
              Your password has been reset successfully. Redirecting you to sign in...
            </p>
          </div>
        ) : !validSession ? (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <AlertCircle size={56} color="#DC2626" style={{ margin: '0 auto 1.2rem' }} />
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.6rem', fontWeight: 900, color: 'var(--blue-dark)', marginBottom: '0.8rem' }}>
              Link Expired
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.7, marginBottom: '1.5rem' }}>
              This reset link is invalid or has expired. Please request a new one.
            </p>
            <Link to="/forgot-password" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'var(--orange)', color: 'white', padding: '0.85rem 2rem', borderRadius: '50px', fontWeight: 600, fontSize: '0.9rem', textDecoration: 'none' }}>
              Request New Link
            </Link>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: '2rem' }}>
              <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.8rem', fontWeight: 900, color: 'var(--blue-dark)', marginBottom: '0.5rem' }}>
                Reset Password
              </h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                Enter your new password below.
              </p>
            </div>

            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: '12px', padding: '0.8rem 1rem', marginBottom: '1.2rem', color: '#DC2626', fontSize: '0.85rem', fontWeight: 500 }}>
                <AlertCircle size={16} /> {error}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>New Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError(null) }}
                    placeholder="8+ chars, Aa, 0-9, symbol"
                    style={{ ...inputStyle, paddingLeft: '2.8rem', paddingRight: '3rem' }}
                  />
                  <Lock size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <button onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label style={labelStyle}>Confirm New Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={e => { setConfirmPassword(e.target.value); setError(null) }}
                    placeholder="Repeat new password"
                    style={{ ...inputStyle, paddingLeft: '2.8rem' }}
                  />
                  <Lock size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                </div>
              </div>

              <button onClick={handleSubmit} disabled={loading} style={{ background: loading ? 'var(--text-muted)' : 'var(--orange)', color: 'white', padding: '0.9rem', borderRadius: '50px', fontWeight: 700, fontSize: '1rem', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif', boxShadow: loading ? 'none' : '0 4px 20px rgba(249,115,22,0.35)', marginTop: '0.5rem' }}>
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

const labelStyle = { display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.5px' }
const inputStyle = { width: '100%', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid var(--beige-dark)', background: 'var(--beige)', fontSize: '0.9rem', color: 'var(--text)', fontFamily: 'DM Sans, sans-serif', outline: 'none', boxSizing: 'border-box' }

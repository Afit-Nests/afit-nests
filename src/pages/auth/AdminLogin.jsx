import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertCircle, ArrowLeft, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

export default function AdminLogin() {
  const { signInAdmin } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleChange = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value })
    setError(null)
  }

  const handleSubmit = async () => {
    if (!form.email || !form.password) {
      setError('Please enter your admin email and password.')
      return
    }

    setLoading(true)
    const { error: loginError } = await signInAdmin(form)
    if (loginError) {
      setError(loginError.message || 'Invalid admin credentials.')
      setLoading(false)
      return
    }
    navigate('/admin/dashboard')
  }

  return (
    <div className="auth-grid" style={{ minHeight: '100vh', background: 'var(--beige)', display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
      <div className="auth-branding" style={{ background: 'var(--blue-dark)', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '4rem', position: 'relative', overflow: 'hidden' }}>
        <Link to="/" style={{ textDecoration: 'none', marginBottom: '3rem' }}>
          <span style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.8rem', fontWeight: 900, color: 'white' }}>AFIT <span style={{ color: 'var(--orange)' }}>Nests</span></span>
        </Link>
        <ShieldCheck size={44} color="var(--orange)" style={{ marginBottom: '1.2rem' }} />
        <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '2.2rem', fontWeight: 900, color: 'white', lineHeight: 1.2, marginBottom: '1rem' }}>
          Admin Control Center
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1rem', lineHeight: 1.7, maxWidth: '380px' }}>
          Sign in to manage listings, verifications, disputes, allocations, content, and platform settings.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '3rem 4rem' }}>
        <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 500, marginBottom: '1.5rem' }}>
          <ArrowLeft size={16} /> Back to Home
        </Link>
        <div style={{ maxWidth: '380px', width: '100%', margin: '0 auto' }}>
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.8rem', fontWeight: 900, color: 'var(--blue-dark)', marginBottom: '0.4rem' }}>Admin Login</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Use your administrator account to continue.</p>
          </div>

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: '12px', padding: '0.8rem 1rem', marginBottom: '1rem', color: '#DC2626', fontSize: '0.85rem', fontWeight: 500 }}>
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>Admin Email</label>
              <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="admin@example.com" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Password</label>
              <div style={{ position: 'relative' }}>
                <input name="password" type={showPassword ? 'text' : 'password'} value={form.password} onChange={handleChange} placeholder="Your password" style={{ ...inputStyle, paddingRight: '3rem' }} />
                <button onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <button onClick={handleSubmit} disabled={loading} style={{ background: loading ? 'var(--text-muted)' : 'var(--orange)', color: 'white', padding: '0.9rem', borderRadius: '50px', fontWeight: 700, fontSize: '1rem', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif', boxShadow: loading ? 'none' : '0 4px 20px rgba(249,115,22,0.35)' }}>
              {loading ? 'Signing In...' : 'Sign In as Admin'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const labelStyle = { display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.5px' }
const inputStyle = { width: '100%', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid var(--beige-dark)', background: 'var(--card)', fontSize: '0.9rem', color: 'var(--text)', fontFamily: 'DM Sans, sans-serif', outline: 'none' }

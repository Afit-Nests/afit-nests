import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Eye, EyeOff, AlertCircle, ArrowLeft } from 'lucide-react'

export default function LandlordLogin() {
  const { signInLandlord } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ phone: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleChange = (e) => { setForm({ ...form, [e.target.name]: e.target.value }); setError(null) }

  const handleSubmit = async () => {
    if (!form.phone || !form.password) { setError('Please fill in all fields'); return }
    setLoading(true)
    const { error } = await signInLandlord({ phone: form.phone, password: form.password })
    if (error) { setError('Invalid phone number or password'); setLoading(false); return }
    navigate('/landlord/dashboard')
  }

  return (
    <div className="auth-grid" style={{ minHeight: '100vh', background: 'var(--beige)', display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
      <div className="auth-branding" style={{ background: 'var(--blue-dark)', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '4rem', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-80px', right: '-80px', width: '300px', height: '300px', borderRadius: '50%', background: 'rgba(249,115,22,0.15)' }} />
        <Link to="/" style={{ textDecoration: 'none', marginBottom: '3rem' }}>
          <span style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.8rem', fontWeight: 900, color: 'white' }}>AFIT <span style={{ color: 'var(--orange)' }}>Nests</span></span>
        </Link>
        <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '2.2rem', fontWeight: 900, color: 'white', lineHeight: 1.2, marginBottom: '1rem', position: 'relative', zIndex: 1 }}>
          Welcome Back <br /><span style={{ color: 'var(--orange)' }}>Landlord!</span>
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1rem', lineHeight: 1.7, maxWidth: '360px', position: 'relative', zIndex: 1 }}>
          Manage your listings, respond to students and confirm viewing requests all in one place.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '3rem 4rem' }}>
        <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 500, marginBottom: '1.5rem' }}>
          <ArrowLeft size={16} /> Back to Home
        </Link>
        <div style={{ maxWidth: '380px', width: '100%', margin: '0 auto' }}>
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.8rem', fontWeight: 900, color: 'var(--blue-dark)', marginBottom: '0.4rem' }}>Landlord Sign In</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Not registered yet?{' '}
              <Link to="/landlord/signup" style={{ color: 'var(--orange)', fontWeight: 600, textDecoration: 'none' }}>Create account</Link>
            </p>
          </div>

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: '12px', padding: '0.8rem 1rem', marginBottom: '1rem', color: '#DC2626', fontSize: '0.85rem', fontWeight: 500 }}>
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>Phone Number</label>
              <input name="phone" type="tel" value={form.phone} onChange={handleChange} placeholder="e.g. 08012345678" style={inputStyle} />
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
            <button onClick={handleSubmit} disabled={loading} style={{ background: loading ? 'var(--text-muted)' : 'var(--blue)', color: 'white', padding: '0.9rem', borderRadius: '50px', fontWeight: 700, fontSize: '1rem', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </div>

          <div style={{ marginTop: '2rem', padding: '1rem', background: 'var(--beige)', borderRadius: '12px', border: '1px solid var(--beige-dark)', textAlign: 'center' }}>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Are you a student?{' '}
              <Link to="/student/login" style={{ color: 'var(--blue)', fontWeight: 600, textDecoration: 'none' }}>Student login →</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

const labelStyle = { display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.5px' }
const inputStyle = { width: '100%', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid var(--beige-dark)', background: 'var(--card)', fontSize: '0.9rem', color: 'var(--text)', fontFamily: 'DM Sans, sans-serif', outline: 'none' }
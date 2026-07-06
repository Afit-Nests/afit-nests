import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Eye, EyeOff, AlertCircle, ArrowLeft, BadgeCheck, MessageSquare, Calendar } from 'lucide-react'

export default function StudentSignup() {
  const { signUpStudent, signInWithGoogle } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ fullName: '', email: '', matricNumber: '', department: '', phone: '', password: '', confirmPassword: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleChange = (e) => { setForm({ ...form, [e.target.name]: e.target.value }); setError(null) }

  const handleSubmit = async () => {
    if (!form.fullName || !form.email || !form.matricNumber || !form.department || !form.phone || !form.password) { setError('Please fill in all fields'); return }
    if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return }
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return }
    setLoading(true)
    const { error } = await signUpStudent({ email: form.email, password: form.password, fullName: form.fullName, matricNumber: form.matricNumber, department: form.department, phone: form.phone })
    if (error) { setError(error.message); setLoading(false); return }
    navigate('/student/dashboard')
  }

  return (
    <div className="auth-grid" style={{ minHeight: '100vh', background: 'var(--beige)', display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
      <div className="auth-branding" style={{ background: 'var(--blue)', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '4rem', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-80px', right: '-80px', width: '300px', height: '300px', borderRadius: '50%', background: 'rgba(249,115,22,0.15)' }} />
        <div style={{ position: 'absolute', bottom: '-60px', left: '-60px', width: '200px', height: '200px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
        <Link to="/" style={{ textDecoration: 'none', marginBottom: '3rem' }}>
          <span style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.8rem', fontWeight: 900, color: 'white' }}>AFIT <span style={{ color: 'var(--orange)' }}>Nests</span></span>
        </Link>
        <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '2.2rem', fontWeight: 900, color: 'white', lineHeight: 1.2, marginBottom: '1rem', position: 'relative', zIndex: 1 }}>
          Find Your Home <br /><span style={{ color: 'var(--orange)' }}>Near AFIT</span>
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1rem', lineHeight: 1.7, maxWidth: '360px', position: 'relative', zIndex: 1 }}>
          Join hundreds of AFIT students who found their perfect accommodation in Barkallahu — stress free.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '3rem', position: 'relative', zIndex: 1 }}>
          {[
            { icon: <BadgeCheck size={16} color="var(--orange)" />, text: 'Verified landlords only' },
            { icon: <MessageSquare size={16} color="var(--orange)" />, text: 'Chat directly, no agent fees' },
            { icon: <Calendar size={16} color="var(--orange)" />, text: 'Book viewings in-app' },
          ].map(item => (
            <div key={item.text} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', color: 'rgba(255,255,255,0.85)', fontSize: '0.9rem' }}>
              {item.icon}<span>{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '3rem 4rem', overflowY: 'auto' }}>
        <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 500, marginBottom: '1.5rem' }}>
          <ArrowLeft size={16} /> Back to Home
        </Link>
        <div style={{ maxWidth: '420px', width: '100%', margin: '0 auto' }}>
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.8rem', fontWeight: 900, color: 'var(--blue-dark)', marginBottom: '0.4rem' }}>Create Account</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Already have an account?{' '}
              <Link to="/student/login" style={{ color: 'var(--orange)', fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
            </p>
          </div>

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: '12px', padding: '0.8rem 1rem', marginBottom: '1rem', color: '#DC2626', fontSize: '0.85rem', fontWeight: 500 }}>
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {/* Google */}
          <button onClick={async () => { const { error } = await signInWithGoogle(); if (error) setError(error.message) }} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.8rem', background: 'white', color: '#0F1F3D', padding: '0.85rem', borderRadius: '50px', fontWeight: 600, fontSize: '0.95rem', border: '1.5px solid var(--beige-dark)', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: '0.5rem' }}>
            <svg width="20" height="20" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.6 33.1 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.7-8 19.7-20 0-1.3-.1-2.7-.1-4z"/>
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 16 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
              <path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.5-5l-6.2-5.2C29.4 35.6 26.8 36 24 36c-5.2 0-9.6-2.9-11.3-7.1l-6.6 5.1C9.8 40 16.4 44 24 44z"/>
              <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.9 2.4-2.5 4.5-4.6 5.8l6.2 5.2C40.7 35.5 44 30.2 44 24c0-1.3-.1-2.7-.4-4z"/>
            </svg>
            Continue with Google
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '0.5rem 0' }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--beige-dark)' }} />
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500 }}>or sign up with email</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--beige-dark)' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>Full Name</label>
              <input name="fullName" value={form.fullName} onChange={handleChange} placeholder="e.g. Aminu Musa" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Email Address</label>
              <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="you@example.com" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>AFIT Matric Number</label>
              <input name="matricNumber" value={form.matricNumber} onChange={handleChange} placeholder="e.g. AFIT/21/0001" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Department</label>
              <select name="department" value={form.department} onChange={handleChange} style={inputStyle}>
                <option value="">Select Department</option>
                <option>Computer Science</option>
                <option>Electrical Engineering</option>
                <option>Mechanical Engineering</option>
                <option>Civil Engineering</option>
                <option>Cyber Security</option>
                <option>Information Technology</option>
                <option>Other</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Phone Number</label>
              <input name="phone" type="tel" value={form.phone} onChange={handleChange} placeholder="e.g. 08012345678" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Password</label>
              <div style={{ position: 'relative' }}>
                <input name="password" type={showPassword ? 'text' : 'password'} value={form.password} onChange={handleChange} placeholder="Min. 8 characters" style={{ ...inputStyle, paddingRight: '3rem' }} />
                <button onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div>
              <label style={labelStyle}>Confirm Password</label>
              <input name="confirmPassword" type="password" value={form.confirmPassword} onChange={handleChange} placeholder="Repeat your password" style={inputStyle} />
            </div>
            <button onClick={handleSubmit} disabled={loading} style={{ background: loading ? 'var(--text-muted)' : 'var(--orange)', color: 'white', padding: '0.9rem', borderRadius: '50px', fontWeight: 700, fontSize: '1rem', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', marginTop: '0.5rem', fontFamily: 'DM Sans, sans-serif', boxShadow: loading ? 'none' : '0 4px 20px rgba(249,115,22,0.35)' }}>
              {loading ? 'Creating Account...' : 'Create My Account'}
            </button>
            <p style={{ textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              By signing up you agree to our terms of service. Your matric number helps us verify you are an AFIT student.
            </p>
          </div>

          <div style={{ marginTop: '2rem', padding: '1rem', background: 'var(--beige)', borderRadius: '12px', border: '1px solid var(--beige-dark)', textAlign: 'center' }}>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Are you a landlord?{' '}
              <Link to="/landlord/signup" style={{ color: 'var(--blue)', fontWeight: 600, textDecoration: 'none' }}>Register your property →</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

const labelStyle = { display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.5px' }
const inputStyle = { width: '100%', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid var(--beige-dark)', background: 'var(--card)', fontSize: '0.9rem', color: 'var(--text)', fontFamily: 'DM Sans, sans-serif', outline: 'none' }
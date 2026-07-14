import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { PASSWORD_REQUIREMENTS, isComplexPassword } from '../../lib/passwordPolicy'
import { Eye, EyeOff, AlertCircle, ArrowLeft, Home, Users, BadgeCheck, Camera, User } from 'lucide-react'

export default function LandlordSignup() {
  const { signUpLandlord } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ fullName: '', phone: '', nin: '', address: '', password: '', confirmPassword: '' })
  const [, setProfilePic] = useState(null)
  const [preview, setPreview] = useState(null)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleChange = (e) => { setForm({ ...form, [e.target.name]: e.target.value }); setError(null) }

  const handlePhoto = (e) => {
    const file = e.target.files[0]
    if (file) { setProfilePic(file); setPreview(URL.createObjectURL(file)) }
  }

  const handleSubmit = async () => {
    if (!form.fullName || !form.phone || !form.nin || !form.address || !form.password) { setError('Please fill in all fields'); return }
    if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return }
    if (!isComplexPassword(form.password)) { setError(PASSWORD_REQUIREMENTS); return }
    if (form.nin.length !== 11) { setError('NIN must be 11 digits'); return }
    setLoading(true)
    const { error } = await signUpLandlord({ phone: form.phone, password: form.password, fullName: form.fullName, nin: form.nin, address: form.address })
    if (error) { setError(error.message); setLoading(false); return }
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
          List Your <br /><span style={{ color: 'var(--orange)' }}>Property</span>
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1rem', lineHeight: 1.7, maxWidth: '360px', position: 'relative', zIndex: 1 }}>
          Register as a landlord and connect directly with AFIT students looking for accommodation in Barkallahu.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '3rem', position: 'relative', zIndex: 1 }}>
          {[
            { icon: <Home size={16} color="var(--orange)" />, text: 'List your property for free' },
            { icon: <Users size={16} color="var(--orange)" />, text: 'Reach hundreds of AFIT students' },
            { icon: <BadgeCheck size={16} color="var(--orange)" />, text: 'Get verified by our team' },
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
            <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.8rem', fontWeight: 900, color: 'var(--blue-dark)', marginBottom: '0.4rem' }}>Landlord Registration</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Already registered?{' '}
              <Link to="/landlord/login" style={{ color: 'var(--orange)', fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
            </p>
          </div>

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: '12px', padding: '0.8rem 1rem', marginBottom: '1rem', color: '#DC2626', fontSize: '0.85rem', fontWeight: 500 }}>
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Profile Picture */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.8rem', marginBottom: '0.5rem' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: preview ? 'transparent' : 'var(--blue)', border: '3px solid var(--beige-dark)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {preview ? <img src={preview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <User size={32} color="white" />}
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', color: 'var(--orange)', fontWeight: 600, fontSize: '0.85rem' }}>
                <Camera size={15} /> Upload Profile Picture
                <input type="file" accept="image/*" onChange={handlePhoto} style={{ display: 'none' }} />
              </label>
            </div>

            <div>
              <label style={labelStyle}>Full Name</label>
              <input name="fullName" value={form.fullName} onChange={handleChange} placeholder="e.g. Malam Suleiman" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Phone Number</label>
              <input name="phone" type="tel" value={form.phone} onChange={handleChange} placeholder="e.g. 08012345678" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>NIN (National ID Number)</label>
              <input name="nin" value={form.nin} onChange={handleChange} placeholder="11-digit NIN" style={inputStyle} />
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>Used for identity verification only. Kept confidential.</p>
            </div>
            <div>
              <label style={labelStyle}>Property Address</label>
              <input name="address" value={form.address} onChange={handleChange} placeholder="House address in Barkallahu" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Password</label>
              <div style={{ position: 'relative' }}>
                <input name="password" type={showPassword ? 'text' : 'password'} value={form.password} onChange={handleChange} placeholder="8+ chars, Aa, 0-9, symbol" style={{ ...inputStyle, paddingRight: '3rem' }} />
                <button onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div>
              <label style={labelStyle}>Confirm Password</label>
              <input name="confirmPassword" type="password" value={form.confirmPassword} onChange={handleChange} placeholder="Repeat your password" style={inputStyle} />
            </div>

            <button onClick={handleSubmit} disabled={loading} style={{ background: loading ? 'var(--text-muted)' : 'var(--blue)', color: 'white', padding: '0.9rem', borderRadius: '50px', fontWeight: 700, fontSize: '1rem', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', marginTop: '0.5rem', fontFamily: 'DM Sans, sans-serif' }}>
              {loading ? 'Submitting...' : 'Submit Registration'}
            </button>
            <p style={{ textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Your registration will be reviewed and verified by the AFIT Nests team before your listing goes live.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

const labelStyle = { display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.5px' }
const inputStyle = { width: '100%', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid var(--beige-dark)', background: 'var(--card)', fontSize: '0.9rem', color: 'var(--text)', fontFamily: 'DM Sans, sans-serif', outline: 'none' }

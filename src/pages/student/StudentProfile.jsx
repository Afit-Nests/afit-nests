import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { backend } from '../../lib/personalBackendClient'
import { LayoutDashboard, MessageSquare, Calendar, User, Search, LogOut, Lock, CheckCircle, AlertCircle } from 'lucide-react'
import MobileNav from '../../components/common/MobileNav'

const SIDEBAR_LINKS = [
  { to: '/student/dashboard', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
  { to: '/student/chats', icon: <MessageSquare size={18} />, label: 'My Chats' },
  { to: '/student/viewings', icon: <Calendar size={18} />, label: 'My Viewings' },
  { to: '/student/profile', icon: <User size={18} />, label: 'Profile', active: true },
  { to: '/listings', icon: <Search size={18} />, label: 'Browse Listings' },
]

export default function StudentProfile() {
  const { profile, signOut, unlinkGoogle } = useAuth()

  const [form, setForm] = useState({
    fullName: profile?.full_name || '',
    email: '',
    phone: profile?.phone || '',
    department: profile?.department || '',
    matricNumber: profile?.matric_number || '',
  })
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [googleBusy, setGoogleBusy] = useState(false)
  const [googleMessage, setGoogleMessage] = useState(null)
  const [unlinkModal, setUnlinkModal] = useState(false)
  const [unlinkPassword, setUnlinkPassword] = useState('')

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setError(null)
  }

  const matricLocked = !!profile?.matric_number
  const googleLinked = Boolean(profile?.google_sub)

  const handleSave = async () => {
    setSaving(true)
    const updates = {
      full_name: form.fullName,
      phone: form.phone,
      department: form.department,
    }
    if (!matricLocked) {
      updates.matric_number = form.matricNumber
    }
    const { error } = await backend.from('profiles').update(updates).eq('id', profile.id)
    if (error) {
      setError('Failed to save. Please try again.')
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
    setSaving(false)
  }

  // Link the current account to a Google identity. We re-use the same
  // server-side OAuth redirect flow as login: the browser leaves the page,
  // comes back via /api/auth/google/callback, the server matches the
  // verified email onto the current profile, attaches google_sub, and
  // the SPA picks up the new session on the way back. If the Google
  // email is not the same as the profile email, the link silently fails
  // server-side (the start endpoint does not allow creating a second
  // account, and the email match only fires when the user already
  // exists) and the user lands on the login page with an error.
  const handleLinkGoogle = () => {
    setGoogleMessage(null)
    window.location.assign(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api'}/auth/google/start`)
  }

  const handleUnlinkGoogle = async () => {
    if (!unlinkPassword) return
    setGoogleBusy(true)
    setGoogleMessage(null)
    const { error } = await unlinkGoogle(unlinkPassword)
    setGoogleBusy(false)
    if (error) {
      setGoogleMessage({ kind: 'error', text: error.message })
      return
    }
    setUnlinkModal(false)
    setUnlinkPassword('')
    setGoogleMessage({ kind: 'success', text: 'Google account unlinked.' })
  }

  return (
    <div className="dashboard-layout" style={{ minHeight: '100vh', background: 'var(--beige)', display: 'grid', gridTemplateColumns: '240px 1fr' }}>
      <MobileNav links={SIDEBAR_LINKS} />

      {/* SIDEBAR */}
      <div className="desktop-sidebar" style={{ background: 'var(--blue-dark)', padding: '2rem 1.2rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', position: 'sticky', top: 0, height: '100vh' }}>
        <Link to="/" style={{ textDecoration: 'none', marginBottom: '2rem', display: 'block' }}>
          <span style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.4rem', fontWeight: 900, color: 'white' }}>
            AFIT <span style={{ color: 'var(--orange)' }}>Nests</span>
          </span>
          <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.2rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Student Panel
          </div>
        </Link>
        {SIDEBAR_LINKS.map(item => (
          <Link key={item.to} to={item.to} style={{
            display: 'flex', alignItems: 'center', gap: '0.7rem',
            padding: '0.75rem 1rem', borderRadius: '12px', textDecoration: 'none',
            background: item.active ? 'rgba(255,255,255,0.1)' : 'transparent',
            color: item.active ? 'white' : 'rgba(255,255,255,0.6)',
            fontSize: '0.88rem', fontWeight: item.active ? 600 : 400,
          }}>
            {item.icon} {item.label}
          </Link>
        ))}
        <div style={{ marginTop: 'auto', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--orange)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.9rem' }}>
              {profile?.full_name?.charAt(0)}
            </div>
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'white' }}>{profile?.full_name}</div>
              <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)' }}>{profile?.matric_number}</div>
            </div>
          </div>
          <button onClick={async () => { await signOut(); window.location.href = '/' }} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', marginTop: '0.8rem', fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', fontFamily: 'DM Sans, sans-serif', padding: 0 }}>
            <LogOut size={14} /> Logout
          </button>
        </div>
      </div>

      {/* MAIN */}
      <div className="main-content" style={{ padding: '2.5rem', overflowY: 'auto' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.8rem', fontWeight: 900, color: 'var(--blue-dark)' }}>My Profile</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.2rem' }}>Manage your account information.</p>
        </div>

        <div className="profile-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '1.5rem', alignItems: 'start' }}>
          {/* Form */}
          <div style={{ background: 'var(--card)', borderRadius: '20px', padding: '2rem', border: '1px solid var(--beige-dark)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div>
                <label style={labelStyle}>Full Name</label>
                <input name="fullName" type="text" value={form.fullName} onChange={handleChange} placeholder="Your full name" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Phone Number</label>
                <input name="phone" type="tel" value={form.phone} onChange={handleChange} placeholder="08012345678" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>AFIT Matric Number</label>
                <input
                  name="matricNumber"
                  value={form.matricNumber}
                  onChange={handleChange}
                  placeholder="e.g. AFIT/21/0001"
                  disabled={matricLocked}
                  style={{ ...inputStyle, opacity: matricLocked ? 0.6 : 1, cursor: matricLocked ? 'not-allowed' : 'text' }}
                />
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                  {matricLocked ? 'Matric number cannot be changed.' : 'Enter your AFIT matric number.'}
                </p>
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

              {error && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: '12px', padding: '0.8rem 1rem', color: '#DC2626', fontSize: '0.85rem', fontWeight: 600 }}>
                  <AlertCircle size={16} /> {error}
                </div>
              )}
              {saved && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.2)', borderRadius: '12px', padding: '0.8rem 1rem', color: '#16A34A', fontSize: '0.85rem', fontWeight: 600 }}>
                  <CheckCircle size={16} /> Profile saved successfully!
                </div>
              )}

              <button onClick={handleSave} disabled={saving} style={{
                background: saving ? 'var(--text-muted)' : 'var(--orange)',
                color: 'white', padding: '0.9rem', borderRadius: '50px',
                fontWeight: 700, fontSize: '0.95rem', border: 'none',
                cursor: saving ? 'not-allowed' : 'pointer',
                fontFamily: 'DM Sans, sans-serif',
                boxShadow: saving ? 'none' : '0 4px 20px rgba(249,115,22,0.35)',
              }}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>

          {/* Profile Card */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            <div style={{ background: 'var(--blue)', borderRadius: '20px', padding: '2rem', textAlign: 'center' }}>
              <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'var(--orange)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 900, fontSize: '1.8rem', fontFamily: 'Playfair Display, serif', margin: '0 auto 1rem' }}>
                {profile?.full_name?.charAt(0)}
              </div>
              <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.1rem', fontWeight: 900, color: 'white', marginBottom: '0.3rem' }}>{profile?.full_name}</div>
              <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.2rem' }}>{profile?.matric_number}</div>
              <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)' }}>{profile?.department}</div>
            </div>
            <div style={{ background: 'var(--card)', borderRadius: '20px', padding: '1.5rem', border: '1px solid var(--beige-dark)' }}>
              <h4 style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--blue)', marginBottom: '1rem' }}>Account Security</h4>
              <button style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: 'var(--beige)', color: 'var(--text)', padding: '0.75rem', borderRadius: '12px', border: '1px solid var(--beige-dark)', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                <Lock size={15} /> Change Password
              </button>
            </div>

            <div style={{ background: 'var(--card)', borderRadius: '20px', padding: '1.5rem', border: '1px solid var(--beige-dark)' }}>
              <h4 style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--blue)', marginBottom: '0.8rem' }}>Connected Accounts</h4>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.6rem', marginBottom: '0.4rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
                      <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.6 33.1 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.7-8 19.7-20 0-1.3-.1-2.7-.1-4z"/>
                      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 16 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
                      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.5-5l-6.2-5.2C29.4 35.6 26.8 36 24 36c-5.2 0-9.6-2.9-11.3-7.1l-6.6 5.1C9.8 40 16.4 44 24 44z"/>
                      <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.9 2.4-2.5 4.5-4.6 5.8l6.2 5.2C40.7 35.5 44 30.2 44 24c0-1.3-.1-2.7-.4-4z"/>
                    </svg>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text)' }}>Google</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {googleLinked ? 'Linked' : 'Not linked'}
                      </div>
                    </div>
                  </div>
                  {googleLinked ? (
                    <button onClick={() => setUnlinkModal(true)} disabled={googleBusy} style={{ padding: '0.45rem 0.9rem', borderRadius: '50px', border: '1px solid var(--beige-dark)', background: 'white', color: 'var(--text)', fontWeight: 600, fontSize: '0.78rem', cursor: googleBusy ? 'not-allowed' : 'pointer' }}>
                      Unlink
                    </button>
                  ) : (
                    <button onClick={handleLinkGoogle} disabled={googleBusy} style={{ padding: '0.45rem 0.9rem', borderRadius: '50px', border: 'none', background: 'var(--orange)', color: 'white', fontWeight: 600, fontSize: '0.78rem', cursor: googleBusy ? 'not-allowed' : 'pointer' }}>
                      {googleBusy ? 'Linking…' : 'Link'}
                    </button>
                  )}
                </div>
                {googleMessage && (
                  <div style={{ marginTop: '0.6rem', fontSize: '0.75rem', color: googleMessage.kind === 'error' ? '#DC2626' : '#16A34A', fontWeight: 600 }}>
                    {googleMessage.text}
                  </div>
                )}
            </div>
          </div>
        </div>
      </div>

      {unlinkModal && (
        <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, background: 'rgba(15,31,61,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: 'var(--card)', borderRadius: '16px', padding: '1.5rem', width: '360px', maxWidth: '90vw', border: '1px solid var(--beige-dark)' }}>
            <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.2rem', fontWeight: 900, color: 'var(--blue-dark)', marginBottom: '0.4rem' }}>Unlink Google</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Enter your password to confirm. You can re-link Google at any time.
            </p>
            <input
              type="password"
              value={unlinkPassword}
              onChange={(e) => setUnlinkPassword(e.target.value)}
              placeholder="Your password"
              autoFocus
              style={{ width: '100%', padding: '0.7rem 1rem', borderRadius: '12px', border: '1px solid var(--beige-dark)', background: 'var(--beige)', fontSize: '0.9rem', fontFamily: 'DM Sans, sans-serif', marginBottom: '1rem', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button onClick={() => { setUnlinkModal(false); setUnlinkPassword('') }} style={{ padding: '0.55rem 1rem', borderRadius: '50px', border: '1px solid var(--beige-dark)', background: 'white', color: 'var(--text)', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={handleUnlinkGoogle} disabled={googleBusy || !unlinkPassword} style={{ padding: '0.55rem 1rem', borderRadius: '50px', border: 'none', background: '#DC2626', color: 'white', fontWeight: 600, fontSize: '0.85rem', cursor: googleBusy || !unlinkPassword ? 'not-allowed' : 'pointer', opacity: googleBusy || !unlinkPassword ? 0.6 : 1 }}>
                {googleBusy ? 'Unlinking…' : 'Unlink Google'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const labelStyle = { display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.5px' }
const inputStyle = { width: '100%', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid var(--beige-dark)', background: 'var(--card)', fontSize: '0.9rem', color: 'var(--text)', fontFamily: 'DM Sans, sans-serif', outline: 'none', boxSizing: 'border-box' }
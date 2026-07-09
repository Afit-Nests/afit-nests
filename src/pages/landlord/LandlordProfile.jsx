import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { backend } from '../../lib/personalBackendClient'
import { LayoutDashboard, MessageSquare, Home, Plus, Calendar, User, LogOut, Camera, Lock, CheckCircle, AlertCircle, BadgeCheck, Clock } from 'lucide-react'
import MobileNav from '../../components/common/MobileNav'

const SIDEBAR_LINKS = [
  { to: '/landlord/dashboard', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
  { to: '/landlord/chats', icon: <MessageSquare size={18} />, label: 'Chats' },
  { to: '/landlord/listings', icon: <Home size={18} />, label: 'My Listings' },
  { to: '/landlord/listings/create', icon: <Plus size={18} />, label: 'Add Listing' },
  { to: '/landlord/viewings', icon: <Calendar size={18} />, label: 'Viewing Requests' },
  { to: '/landlord/profile', icon: <User size={18} />, label: 'Profile', active: true },
]

export default function LandlordProfile() {
  const { profile, signOut } = useAuth()

  const [form, setForm] = useState({
    fullName: profile?.full_name || '',
    phone: profile?.phone || '',
    address: profile?.address || '',
  })
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setError(null)
  }

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploadingAvatar(true)
    const ext = file.name.split('.').pop()
    const path = `${profile.id}/avatar.${ext}`
    const { error: uploadError } = await backend.storage.from('avatars').upload(path, file, { upsert: true })
    if (!uploadError) {
      const { data } = backend.storage.from('avatars').getPublicUrl(path)
      const url = data.publicUrl
      await backend.from('profiles').update({ avatar_url: url }).eq('id', profile.id)
      setAvatarUrl(url)
    }
    setUploadingAvatar(false)
  }

  const handleSave = async () => {
    setSaving(true)
    const { error } = await backend.from('profiles').update({ full_name: form.fullName, phone: form.phone, address: form.address }).eq('id', profile.id)
    if (error) {
      setError('Failed to save. Please try again.')
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
    setSaving(false)
  }

  return (
    <div className="dashboard-layout" style={{ minHeight: '100vh', background: 'var(--beige)', display: 'grid', gridTemplateColumns: '240px 1fr' }}>
      <MobileNav links={SIDEBAR_LINKS} />

      <div className="desktop-sidebar" style={{ background: 'var(--blue-dark)', padding: '2rem 1.2rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', position: 'sticky', top: 0, height: '100vh' }}>
        <Link to="/" style={{ textDecoration: 'none', marginBottom: '2rem', display: 'block' }}>
          <span style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.4rem', fontWeight: 900, color: 'white' }}>AFIT <span style={{ color: 'var(--orange)' }}>Nests</span></span>
          <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.2rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Landlord Panel</div>
        </Link>
        {SIDEBAR_LINKS.map(item => (
          <Link key={item.to} to={item.to} style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', padding: '0.75rem 1rem', borderRadius: '12px', textDecoration: 'none', background: item.active ? 'rgba(255,255,255,0.1)' : 'transparent', color: item.active ? 'white' : 'rgba(255,255,255,0.6)', fontSize: '0.88rem', fontWeight: item.active ? 600 : 400 }}>
            {item.icon} {item.label}
          </Link>
        ))}
        <div style={{ marginTop: 'auto', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'white', marginBottom: '0.5rem' }}>{profile?.full_name}</div>
          <button onClick={async () => { await signOut(); window.location.href = '/' }} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', fontFamily: 'DM Sans, sans-serif', padding: 0 }}>
            <LogOut size={14} /> Logout
          </button>
        </div>
      </div>

      <div className="main-content" style={{ padding: '2.5rem', overflowY: 'auto' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.8rem', fontWeight: 900, color: 'var(--blue-dark)' }}>My Profile</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.2rem' }}>Manage your account and profile photo.</p>
        </div>

        <div className="profile-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '1.5rem', alignItems: 'start' }}>
          <div style={{ background: 'var(--card)', borderRadius: '20px', padding: '2rem', border: '1px solid var(--beige-dark)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div>
                <label style={labelStyle}>Full Name</label>
                <input name="fullName" value={form.fullName} onChange={handleChange} placeholder="Your full name" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Phone Number</label>
                <input name="phone" value={form.phone} onChange={handleChange} placeholder="08012345678" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Property Address</label>
                <input name="address" value={form.address} onChange={handleChange} placeholder="Your address in Barkallahu" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>NIN</label>
                <input value={profile?.nin || ''} disabled style={{ ...inputStyle, opacity: 0.6, cursor: 'not-allowed' }} />
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>NIN cannot be changed. Contact admin if there's an issue.</p>
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

              <button onClick={handleSave} disabled={saving} style={{ background: saving ? 'var(--text-muted)' : 'var(--orange)', color: 'white', padding: '0.9rem', borderRadius: '50px', fontWeight: 700, fontSize: '0.95rem', border: 'none', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif', boxShadow: saving ? 'none' : '0 4px 20px rgba(249,115,22,0.35)' }}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            <div style={{ background: 'var(--blue)', borderRadius: '20px', padding: '2rem', textAlign: 'center' }}>
              <div style={{ position: 'relative', width: '80px', height: '80px', margin: '0 auto 1rem' }}>
                {avatarUrl ? (
                  <img src={avatarUrl} alt="avatar" style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '3px solid rgba(255,255,255,0.3)' }} />
                ) : (
                  <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--orange)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 900, fontSize: '2rem', fontFamily: 'Playfair Display, serif' }}>
                    {profile?.full_name?.charAt(0)}
                  </div>
                )}
                <label style={{ position: 'absolute', bottom: 0, right: 0, background: 'var(--orange)', borderRadius: '50%', width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '2px solid white' }}>
                  {uploadingAvatar ? <Clock size={14} color="white" /> : <Camera size={14} color="white" />}
                  <input type="file" accept="image/*" onChange={handleAvatarUpload} style={{ display: 'none' }} />
                </label>
              </div>
              <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.1rem', fontWeight: 900, color: 'white', marginBottom: '0.3rem' }}>{profile?.full_name}</div>
              <div style={{ fontSize: '0.78rem', color: profile?.verified ? '#4ade80' : 'rgba(255,255,255,0.5)', fontWeight: 600, marginBottom: '0.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}>
                {profile?.verified ? <><BadgeCheck size={13} /> Verified Landlord</> : <><Clock size={13} /> Verification Pending</>}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>{profile?.phone}</div>
              <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.8rem' }}>Tap camera icon to update your profile photo</p>
            </div>

            <div style={{ background: 'var(--card)', borderRadius: '20px', padding: '1.5rem', border: '1px solid var(--beige-dark)' }}>
              <h4 style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--blue)', marginBottom: '1rem' }}>Account Security</h4>
              <button style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: 'var(--beige)', color: 'var(--text)', padding: '0.75rem', borderRadius: '12px', border: '1px solid var(--beige-dark)', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                <Lock size={15} /> Change Password
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const labelStyle = { display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.5px' }
const inputStyle = { width: '100%', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid var(--beige-dark)', background: 'var(--card)', fontSize: '0.9rem', color: 'var(--text)', fontFamily: 'DM Sans, sans-serif', outline: 'none', boxSizing: 'border-box' }
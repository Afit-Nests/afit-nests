import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { backend } from '../../lib/personalBackendClient'
import { LayoutDashboard, MessageSquare, Home, Plus, Calendar, User, LogOut, CheckCircle, XCircle, Clock, Phone } from 'lucide-react'
import MobileNav from '../../components/common/MobileNav'

const SIDEBAR_LINKS = [
  { to: '/landlord/dashboard', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
  { to: '/landlord/chats', icon: <MessageSquare size={18} />, label: 'Chats' },
  { to: '/landlord/listings', icon: <Home size={18} />, label: 'My Listings' },
  { to: '/landlord/listings/create', icon: <Plus size={18} />, label: 'Add Listing' },
  { to: '/landlord/viewings', icon: <Calendar size={18} />, label: 'Viewing Requests', active: true },
  { to: '/landlord/profile', icon: <User size={18} />, label: 'Profile' },
]

const STATUS_STYLES = {
  pending: { bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.2)', color: 'var(--orange)', icon: <Clock size={13} />, label: 'Pending' },
  confirmed: { bg: 'rgba(22,163,74,0.08)', border: 'rgba(22,163,74,0.2)', color: '#16A34A', icon: <CheckCircle size={13} />, label: 'Confirmed' },
  declined: { bg: 'rgba(220,38,38,0.08)', border: 'rgba(220,38,38,0.2)', color: '#DC2626', icon: <XCircle size={13} />, label: 'Declined' },
}

export default function ViewingRequests() {
  const { profile, signOut } = useAuth()
  const [viewings, setViewings] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('pending')

  useEffect(() => {
    if (profile) fetchViewings()
  }, [profile])

  const fetchViewings = async () => {
    const { data, error } = await backend
      .from('viewings')
      .select(`*, listings (title, type), profiles!viewings_student_id_fkey (full_name, matric_number, phone)`)
      .eq('landlord_id', profile.id)
      .order('created_at', { ascending: false })
    if (!error) setViewings(data)
    setLoading(false)
  }

  const handleConfirm = async (id) => {
    const { error } = await backend.from('viewings').update({ status: 'confirmed' }).eq('id', id)
    if (!error) setViewings(viewings.map(v => v.id === id ? { ...v, status: 'confirmed' } : v))
  }

  const handleDecline = async (id) => {
    const { error } = await backend.from('viewings').update({ status: 'declined' }).eq('id', id)
    if (!error) setViewings(viewings.map(v => v.id === id ? { ...v, status: 'declined' } : v))
  }

  const filtered = viewings.filter(v => v.status === tab)

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--beige)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'var(--text-muted)' }}>Loading...</div>
    </div>
  )

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
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.8rem', fontWeight: 900, color: 'var(--blue-dark)' }}>Viewing Requests</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.2rem' }}>Review and respond to student viewing requests.</p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {[
            { key: 'pending', label: `Pending (${viewings.filter(v => v.status === 'pending').length})` },
            { key: 'confirmed', label: `Confirmed (${viewings.filter(v => v.status === 'confirmed').length})` },
            { key: 'declined', label: `Declined (${viewings.filter(v => v.status === 'declined').length})` },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{ padding: '0.55rem 1.4rem', borderRadius: '50px', cursor: 'pointer', background: tab === t.key ? 'var(--blue)' : 'var(--card)', color: tab === t.key ? 'white' : 'var(--text-muted)', fontWeight: 600, fontSize: '0.88rem', fontFamily: 'DM Sans, sans-serif', border: tab === t.key ? 'none' : '1px solid var(--beige-dark)' }}>
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
              <Calendar size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
              <p style={{ fontWeight: 600 }}>No {tab} viewing requests</p>
            </div>
          ) : filtered.map(viewing => {
            const style = STATUS_STYLES[viewing.status]
            return (
              <div key={viewing.id} style={{ background: 'var(--card)', borderRadius: '20px', padding: '1.8rem', border: '1px solid var(--beige-dark)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '0.6rem' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, flexShrink: 0 }}>
                        {viewing.profiles?.full_name?.charAt(0) || 'S'}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)' }}>{viewing.profiles?.full_name || 'Student'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{viewing.profiles?.matric_number}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', color: 'var(--orange)', fontWeight: 600, marginBottom: '0.5rem' }}>
                      <Home size={14} /> {viewing.listings?.title}
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.8rem', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text)', fontWeight: 500, background: 'var(--beige)', padding: '0.3rem 0.8rem', borderRadius: '50px', border: '1px solid var(--beige-dark)' }}>
                        <Calendar size={13} /> {viewing.date}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text)', fontWeight: 500, background: 'var(--beige)', padding: '0.3rem 0.8rem', borderRadius: '50px', border: '1px solid var(--beige-dark)' }}>
                        <Clock size={13} /> {viewing.time}
                      </div>
                    </div>
                    {viewing.message && (
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic', background: 'var(--beige)', padding: '0.7rem 1rem', borderRadius: '10px', border: '1px solid var(--beige-dark)' }}>&ldquo;{viewing.message}&rdquo;</div>
                    )}
                    {viewing.status === 'confirmed' && viewing.profiles?.phone && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.8rem', background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.2)', borderRadius: '12px', padding: '0.7rem 1rem', fontSize: '0.85rem', color: '#16A34A', fontWeight: 600 }}>
                        <Phone size={14} /> Student contact: {viewing.profiles.phone}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.8rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.9rem', borderRadius: '50px', fontSize: '0.75rem', fontWeight: 700, background: style.bg, border: `1px solid ${style.border}`, color: style.color }}>
                      {style.icon} {style.label}
                    </div>
                    {viewing.status === 'pending' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <button onClick={() => handleConfirm(viewing.id)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#16A34A', color: 'white', padding: '0.5rem 1.2rem', borderRadius: '50px', border: 'none', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                          <CheckCircle size={14} /> Confirm
                        </button>
                        <button onClick={() => handleDecline(viewing.id)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'transparent', color: '#DC2626', padding: '0.5rem 1.2rem', borderRadius: '50px', border: '2px solid #DC2626', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                          <XCircle size={14} /> Decline
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
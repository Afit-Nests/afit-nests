import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { LayoutDashboard, BadgeCheck, Clock, AlertTriangle, Home, LogOut, CheckCircle, XCircle, Phone, CreditCard, MapPin, MousePointerClick } from 'lucide-react'
import MobileNav from '../../components/common/MobileNav'

const SIDEBAR_LINKS = [
  { to: '/admin/dashboard', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
  { to: '/admin/verifications', icon: <BadgeCheck size={18} />, label: 'Verifications', active: true },
  { to: '/admin/pending-allocations', icon: <Clock size={18} />, label: 'Pending Allocations' },
  { to: '/admin/disputes', icon: <AlertTriangle size={18} />, label: 'Disputes' },
  { to: '/listings', icon: <Home size={18} />, label: 'All Listings' },
]

export default function Verifications() {
  const [landlords, setLandlords] = useState([])
  const [selected, setSelected] = useState(null)
  const [tab, setTab] = useState('pending')
  const [loading, setLoading] = useState(true)
  const { signOut } = useAuth()
  const navigate = useNavigate()

  useEffect(() => { fetchLandlords() }, [])

  const fetchLandlords = async () => {
    const { data, error } = await supabase.from('profiles').select('*').eq('role', 'landlord').order('created_at', { ascending: false })
    if (!error) setLandlords(data || [])
    setLoading(false)
  }

  const handleApprove = async (id) => {
    const { error } = await supabase.from('profiles').update({ verified: true }).eq('id', id)
    if (!error) { setLandlords(landlords.map(l => l.id === id ? { ...l, verified: true } : l)); setSelected(null) }
  }

  const handleReject = async (id) => {
    const { error } = await supabase.from('profiles').update({ verified: false }).eq('id', id)
    if (!error) { setLandlords(landlords.map(l => l.id === id ? { ...l, verified: false } : l)); setSelected(null) }
  }

  const pending = landlords.filter(l => !l.verified)
  const reviewed = landlords.filter(l => l.verified)
  const list = tab === 'pending' ? pending : reviewed

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
          <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.2rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Admin Panel</div>
        </Link>
        {SIDEBAR_LINKS.map(item => (
          <Link key={item.to} to={item.to} style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', padding: '0.75rem 1rem', borderRadius: '12px', textDecoration: 'none', background: item.active ? 'rgba(255,255,255,0.1)' : 'transparent', color: item.active ? 'white' : 'rgba(255,255,255,0.6)', fontSize: '0.88rem', fontWeight: item.active ? 600 : 400 }}>
            {item.icon} {item.label}
          </Link>
        ))}
        <div style={{ marginTop: 'auto', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>
          <button onClick={async () => { await signOut(); navigate('/') }} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', fontFamily: 'DM Sans, sans-serif', padding: 0 }}>
            <LogOut size={14} /> Logout
          </button>
        </div>
      </div>

      <div className="main-content" style={{ padding: '2.5rem', overflowY: 'auto' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.8rem', fontWeight: 900, color: 'var(--blue-dark)' }}>Landlord Verifications</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.2rem' }}>Review and verify landlord registrations before they go live.</p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {[
            { key: 'pending', label: `Pending (${pending.length})` },
            { key: 'reviewed', label: `Verified (${reviewed.length})` },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{ padding: '0.55rem 1.4rem', borderRadius: '50px', cursor: 'pointer', background: tab === t.key ? 'var(--blue)' : 'var(--card)', color: tab === t.key ? 'white' : 'var(--text-muted)', fontWeight: 600, fontSize: '0.88rem', fontFamily: 'DM Sans, sans-serif', border: tab === t.key ? 'none' : '1px solid var(--beige-dark)' }}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="admin-split-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '1.5rem', alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {list.length === 0 && (
              <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
                <CheckCircle size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                <p style={{ fontWeight: 600 }}>All caught up!</p>
                <p style={{ fontSize: '0.85rem' }}>No {tab} landlords</p>
              </div>
            )}
            {list.map(landlord => (
              <div key={landlord.id} onClick={() => setSelected(landlord)} style={{ background: 'var(--card)', borderRadius: '16px', padding: '1.2rem 1.4rem', border: `2px solid ${selected?.id === landlord.id ? 'var(--orange)' : 'var(--beige-dark)'}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', transition: 'all 0.2s' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontFamily: 'Playfair Display, serif', fontSize: '1.1rem', flexShrink: 0 }}>
                    {landlord.full_name?.charAt(0)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)' }}>{landlord.full_name}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{landlord.phone} · {new Date(landlord.created_at).toLocaleDateString()}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', fontWeight: 700, padding: '0.25rem 0.8rem', borderRadius: '50px', flexShrink: 0, background: landlord.verified ? 'rgba(22,163,74,0.1)' : 'rgba(249,115,22,0.1)', color: landlord.verified ? '#16A34A' : 'var(--orange)' }}>
                  {landlord.verified ? <BadgeCheck size={12} /> : <Clock size={12} />}
                  {landlord.verified ? 'Verified' : 'Pending'}
                </div>
              </div>
            ))}
          </div>

          {selected ? (
            <div style={{ background: 'var(--card)', borderRadius: '20px', padding: '1.8rem', border: '1px solid var(--beige-dark)', position: 'sticky', top: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontFamily: 'Playfair Display, serif', fontSize: '1.4rem' }}>
                  {selected.full_name?.charAt(0)}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text)' }}>{selected.full_name}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Joined {new Date(selected.created_at).toLocaleDateString()}</div>
                </div>
              </div>

              {[
                { label: 'Phone Number', value: selected.phone, icon: <Phone size={13} /> },
                { label: 'NIN', value: selected.nin || 'Not provided', icon: <CreditCard size={13} /> },
                { label: 'Property Address', value: selected.address || 'Not provided', icon: <MapPin size={13} /> },
              ].map(field => (
                <div key={field.label} style={{ marginBottom: '1rem', padding: '0.9rem', background: 'var(--beige)', borderRadius: '12px', border: '1px solid var(--beige-dark)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                    {field.icon} {field.label}
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text)' }}>{field.value}</div>
                </div>
              ))}

              {!selected.verified ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginTop: '1.5rem' }}>
                  <button onClick={() => handleApprove(selected.id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: '#16A34A', color: 'white', padding: '0.85rem', borderRadius: '50px', fontWeight: 700, fontSize: '0.95rem', border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                    <CheckCircle size={16} /> Approve Landlord
                  </button>
                  <button onClick={() => handleReject(selected.id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: 'transparent', color: '#DC2626', padding: '0.85rem', borderRadius: '50px', fontWeight: 700, fontSize: '0.95rem', border: '2px solid #DC2626', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                    <XCircle size={16} /> Reject Registration
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '1.5rem', padding: '1rem', borderRadius: '12px', textAlign: 'center', background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.2)', color: '#16A34A', fontWeight: 600, fontSize: '0.88rem' }}>
                  <BadgeCheck size={16} /> This landlord has been verified
                </div>
              )}
            </div>
          ) : (
            <div style={{ background: 'var(--card)', borderRadius: '20px', padding: '2rem', border: '1px solid var(--beige-dark)', textAlign: 'center', color: 'var(--text-muted)' }}>
              <MousePointerClick size={40} style={{ margin: '0 auto 0.8rem', opacity: 0.3 }} />
              <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>Select a landlord to review</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
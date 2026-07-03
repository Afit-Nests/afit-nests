import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import MobileNav from '../../components/common/MobileNav'
import { Home, MessageSquare, Calendar, User, Search, LogOut, MapPin, Clock, CheckCircle, XCircle, AlertCircle, CheckCheck } from 'lucide-react'

const SIDEBAR_LINKS = [
  { to: '/student/dashboard', icon: Home, label: 'Dashboard' },
  { to: '/student/chats', icon: MessageSquare, label: 'My Chats' },
  { to: '/student/viewings', icon: Calendar, label: 'My Viewings', active: true },
  { to: '/student/profile', icon: User, label: 'Profile' },
  { to: '/listings', icon: Search, label: 'Browse Listings' },
]

const STATUS_STYLES = {
  confirmed: { bg: 'rgba(22,163,74,0.08)', border: 'rgba(22,163,74,0.2)', color: '#16A34A', label: 'Confirmed', icon: CheckCircle },
  pending: { bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.2)', color: 'var(--orange)', label: 'Pending', icon: AlertCircle },
  completed: { bg: 'rgba(107,114,128,0.08)', border: 'rgba(107,114,128,0.2)', color: '#6B7280', label: 'Completed', icon: CheckCheck },
  declined: { bg: 'rgba(220,38,38,0.08)', border: 'rgba(220,38,38,0.2)', color: '#DC2626', label: 'Declined', icon: XCircle },
}

export default function MyViewings() {
  const { profile, signOut } = useAuth()
  const [viewings, setViewings] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (profile) fetchViewings()
  }, [profile])

  const fetchViewings = async () => {
    const { data, error } = await supabase
      .from('viewings')
      .select(`
        *,
        listings (title, type, address),
        profiles!viewings_landlord_id_fkey (full_name)
      `)
      .eq('student_id', profile.id)
      .order('created_at', { ascending: false })

    if (!error) setViewings(data)
    setLoading(false)
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--beige)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--text-muted)' }}>Loading viewings...</div>
      </div>
    )
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
        {SIDEBAR_LINKS.map(item => {
          const Icon = item.icon
          return (
            <Link key={item.to} to={item.to} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0.75rem 1rem', borderRadius: '12px', textDecoration: 'none',
              background: item.active ? 'rgba(255,255,255,0.1)' : 'transparent',
              color: item.active ? 'white' : 'rgba(255,255,255,0.6)',
              fontSize: '0.88rem', fontWeight: item.active ? 600 : 400,
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
                <Icon size={17} /> {item.label}
              </span>
            </Link>
          )
        })}
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
          <button onClick={async () => { await signOut(); window.location.href = '/' }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', marginTop: '0.8rem', fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', fontFamily: 'DM Sans, sans-serif', padding: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <LogOut size={13} /> Logout
          </button>
        </div>
      </div>

      {/* MAIN */}
      <div className="main-content" style={{ padding: '2.5rem', overflowY: 'auto' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.8rem', fontWeight: 900, color: 'var(--blue-dark)' }}>
            My Viewings
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            Track all your scheduled property viewings.
          </p>
        </div>

        {viewings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
            <Calendar size={48} color='var(--beige-dark)' style={{ margin: '0 auto 1rem' }} />
            <p style={{ fontWeight: 600, fontSize: '1rem' }}>No viewings yet</p>
            <p style={{ fontSize: '0.85rem', marginTop: '0.3rem' }}>Browse listings and book a viewing to get started</p>
            <Link to="/listings" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginTop: '1.2rem', background: 'var(--orange)', color: 'white', padding: '0.75rem 1.5rem', borderRadius: '50px', textDecoration: 'none', fontWeight: 600, fontSize: '0.88rem' }}>
              <Search size={15} /> Browse Listings
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            {viewings.map(viewing => {
              const style = STATUS_STYLES[viewing.status] || STATUS_STYLES.pending
              const StatusIcon = style.icon
              return (
                <div key={viewing.id} style={{
                  background: 'var(--card)', borderRadius: '20px', padding: '1.8rem',
                  border: '1px solid var(--beige-dark)',
                  display: 'grid', gridTemplateColumns: '1fr auto',
                  gap: '1.5rem', alignItems: 'center',
                }}>
                  <div style={{ display: 'flex', gap: '1.2rem', alignItems: 'flex-start' }}>
                    <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Home size={22} color='white' />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text)', marginBottom: '0.2rem' }}>
                        {viewing.listings?.title}
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <User size={13} /> {viewing.profiles?.full_name || 'Landlord'}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <MapPin size={13} /> {viewing.listings?.address || 'Barkallahu'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--beige)', padding: '0.4rem 0.9rem', borderRadius: '50px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text)', border: '1px solid var(--beige-dark)' }}>
                          <Calendar size={13} /> {viewing.date}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--beige)', padding: '0.4rem 0.9rem', borderRadius: '50px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text)', border: '1px solid var(--beige-dark)' }}>
                          <Clock size={13} /> {viewing.time}
                        </div>
                      </div>
                      {viewing.message && (
                        <div style={{ marginTop: '0.6rem', fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          "{viewing.message}"
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.8rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 1rem', borderRadius: '50px', background: style.bg, border: `1px solid ${style.border}`, color: style.color, fontSize: '0.78rem', fontWeight: 700 }}>
                      <StatusIcon size={13} /> {style.label}
                    </div>
                    {viewing.status === 'confirmed' && (
                      <div style={{ fontSize: '0.78rem', color: '#16A34A', fontWeight: 600 }}>
                        Contact revealed after visit
                      </div>
                    )}
                    {viewing.status === 'pending' && (
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        Waiting for confirmation
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
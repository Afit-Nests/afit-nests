import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { backend } from '../../lib/personalBackendClient'
import MobileNav from '../../components/common/MobileNav'
import { MessageSquare, Calendar, Home, Search, User, LogOut, Lightbulb, ArrowRight } from 'lucide-react'

const SIDEBAR_LINKS = [
  { to: '/student/dashboard', icon: Home, label: 'Dashboard', active: true },
  { to: '/student/chats', icon: MessageSquare, label: 'My Chats' },
  { to: '/student/viewings', icon: Calendar, label: 'My Viewings' },
  { to: '/student/profile', icon: User, label: 'Profile' },
  { to: '/listings', icon: Search, label: 'Browse Listings' },
]

// Listing photos come back as a jsonb array; tolerate null, a bare string, or
// an array so a malformed row renders the fallback instead of crashing.
const firstPhoto = (photos) => {
  if (Array.isArray(photos)) return typeof photos[0] === 'string' ? photos[0] : null
  if (typeof photos === 'string' && photos.startsWith('http')) return photos
  return null
}

const formatPrice = (price) => Number(price ?? 0).toLocaleString()

export default function StudentDashboard() {
  const { profile, signOut } = useAuth()
  const [stats, setStats] = useState({ chats: 0, viewings: 0, listings: 0 })
  const [recentListings, setRecentListings] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (profile) fetchData()
  }, [profile])

  const fetchData = async () => {
    const [chatsRes, viewingsRes, listingsRes] = await Promise.all([
      backend.from('chats').select('id', { count: 'exact' }).eq('student_id', profile.id),
      backend.from('viewings').select('id', { count: 'exact' }).eq('student_id', profile.id),
      backend.from('listings').select('*').eq('available', true).order('created_at', { ascending: false }).limit(3),
    ])

    setStats({
      chats: chatsRes.count || 0,
      viewings: viewingsRes.count || 0,
      listings: listingsRes.data?.length || 0,
    })
    setRecentListings(listingsRes.data || [])
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="page-loader">
        <div className="page-loader-mark">AFIT <span style={{ color: 'var(--orange)' }}>Nests</span></div>
        <div className="page-loader-line" />
      </div>
    )
  }

  return (
    <div className="dashboard-layout" style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '240px 1fr' }}>

      <MobileNav links={SIDEBAR_LINKS} />

      {/* SIDEBAR */}
      <div className="desktop-sidebar" style={{ padding: '2rem 1.2rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', position: 'sticky', top: 0, height: '100vh' }}>
        <Link to="/" style={{ textDecoration: 'none', marginBottom: 'var(--space-5)', display: 'block' }}>
          <span style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.4rem', fontWeight: 900, color: 'white' }}>
            AFIT <span style={{ color: 'var(--orange)' }}>Nests</span>
          </span>
          <div style={{ fontSize: 'var(--text-xs)', color: 'rgba(255,255,255,0.5)', marginTop: '0.2rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Student Panel
          </div>
        </Link>
        {SIDEBAR_LINKS.map(item => {
          const Icon = item.icon
          return (
            <Link key={item.to} to={item.to} aria-current={item.active ? 'page' : undefined} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0.75rem 1rem', borderRadius: '12px', textDecoration: 'none',
              background: item.active ? 'rgba(255,255,255,0.1)' : 'transparent',
              color: item.active ? 'white' : 'rgba(255,255,255,0.6)',
              fontSize: 'var(--text-base)', fontWeight: item.active ? 600 : 400,
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
                <Icon size={17} aria-hidden="true" /> {item.label}
              </span>
            </Link>
          )
        })}
        <div style={{ marginTop: 'auto', padding: 'var(--space-3)', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--orange)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 'var(--text-base)', flexShrink: 0 }}>
              {profile?.full_name?.charAt(0)}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile?.full_name}</div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'rgba(255,255,255,0.5)' }}>{profile?.matric_number}</div>
            </div>
          </div>
          <button onClick={async () => { await signOut(); window.location.href = '/' }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', marginTop: '0.8rem', fontSize: 'var(--text-xs)', color: 'rgba(255,255,255,0.4)', fontFamily: 'DM Sans, sans-serif', padding: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <LogOut size={13} aria-hidden="true" /> Logout
          </button>
        </div>
      </div>

      {/* MAIN */}
      <div className="main-content" style={{ padding: 'var(--space-5)', overflowY: 'auto' }}>
        <header style={{ marginBottom: 'var(--space-5)' }}>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'var(--text-xl)', fontWeight: 900, color: 'var(--blue-dark)', lineHeight: 1.2 }}>
            Welcome, {profile?.full_name?.split(' ')[0]}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-base)', marginTop: '0.35rem' }}>
            {profile?.department} · {profile?.matric_number}
          </p>
        </header>

        {/* Stats */}
        <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
          {[
            { icon: MessageSquare, label: 'Active Chats', value: stats.chats, link: '/student/chats' },
            { icon: Calendar, label: 'Viewing Bookings', value: stats.viewings, link: '/student/viewings' },
            { icon: Home, label: 'New Listings', value: stats.listings, link: '/listings' },
          ].map(stat => {
            const Icon = stat.icon
            return (
              <Link key={stat.label} to={stat.link} className="dash-tile">
                <Icon size={22} color="var(--orange)" aria-hidden="true" />
                <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 'var(--text-2xl)', fontWeight: 900, color: 'var(--blue)', lineHeight: 1, marginTop: 'var(--space-2)' }}>
                  {stat.value}
                </div>
                <div style={{ fontWeight: 500, fontSize: 'var(--text-base)', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                  {stat.label}
                </div>
              </Link>
            )
          })}
        </div>

        <div className="dashboard-bottom" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 'var(--space-4)' }}>

          {/* Recent Listings */}
          <section className="dash-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
              <h2 className="dash-section-title">Recent Listings</h2>
              <Link to="/listings" style={{ fontSize: 'var(--text-sm)', color: 'var(--orange)', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                View all <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </div>

            {recentListings.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 'var(--space-5) var(--space-3)', color: 'var(--text-muted)' }}>
                <Home size={28} color="var(--beige-dark)" aria-hidden="true" />
                <p style={{ fontSize: 'var(--text-base)', margin: 'var(--space-2) 0' }}>No listings available yet</p>
                <Link to="/listings" style={{ color: 'var(--orange)', fontWeight: 600, fontSize: 'var(--text-sm)', textDecoration: 'none' }}>
                  Browse listings →
                </Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {recentListings.map(listing => {
                  const photo = firstPhoto(listing.photos)
                  return (
                    <Link
                      key={listing.id}
                      to={`/listings/${listing.id}`}
                      className="dash-tile"
                      style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-2)' }}
                    >
                      {photo ? (
                        <img src={photo} alt="" loading="lazy" className="listing-thumb" />
                      ) : (
                        <div className="listing-thumb-fallback" aria-hidden="true">
                          <Home size={20} color="white" />
                        </div>
                      )}
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 'var(--text-base)', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {listing.title}
                        </div>
                        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                          {listing.distance != null && `${listing.distance} mins · `}₦{formatPrice(listing.price)}/yr
                        </div>
                      </div>
                      <ArrowRight size={16} color="var(--text-muted)" aria-hidden="true" style={{ flexShrink: 0 }} />
                    </Link>
                  )
                })}
              </div>
            )}
          </section>

          {/* Quick Actions + Tip */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <section className="dash-card">
              <h2 className="dash-section-title" style={{ marginBottom: 'var(--space-3)' }}>Quick Actions</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                <Link to="/listings" style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', background: 'var(--orange)', color: 'white', padding: '0.9rem 1.2rem', borderRadius: '999px', textDecoration: 'none', fontWeight: 600, fontSize: 'var(--text-base)' }}>
                  <Search size={16} aria-hidden="true" /> Browse Listings
                </Link>
                <Link to="/student/chats" style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', background: 'var(--card)', color: 'var(--text)', padding: '0.9rem 1.2rem', borderRadius: '999px', textDecoration: 'none', fontWeight: 600, fontSize: 'var(--text-base)', border: '1px solid var(--line)' }}>
                  <MessageSquare size={16} aria-hidden="true" /> My Chats
                </Link>
                <Link to="/student/viewings" style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', background: 'var(--card)', color: 'var(--text)', padding: '0.9rem 1.2rem', borderRadius: '999px', textDecoration: 'none', fontWeight: 600, fontSize: 'var(--text-base)', border: '1px solid var(--line)' }}>
                  <Calendar size={16} aria-hidden="true" /> My Viewings
                </Link>
              </div>
            </section>

            <section style={{ background: 'var(--blue)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)' }}>
              <Lightbulb size={22} color="var(--orange)" aria-hidden="true" />
              <h2 style={{ fontWeight: 700, fontSize: 'var(--text-base)', color: 'white', margin: 'var(--space-2) 0 0.4rem' }}>Safety Tip</h2>
              <p style={{ fontSize: 'var(--text-sm)', color: 'rgba(255,255,255,0.75)', lineHeight: 1.65 }}>
                Always book a viewing before making any payment. Never pay outside the agreed process.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}

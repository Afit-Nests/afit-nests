import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { backend } from '../../lib/personalBackendClient'
import MobileNav from '../../components/common/MobileNav'
import { MessageSquare, Calendar, Home, Search, User, LogOut, Lightbulb } from 'lucide-react'

const SIDEBAR_LINKS = [
  { to: '/student/dashboard', icon: Home, label: 'Dashboard', active: true },
  { to: '/student/chats', icon: MessageSquare, label: 'My Chats' },
  { to: '/student/viewings', icon: Calendar, label: 'My Viewings' },
  { to: '/student/profile', icon: User, label: 'Profile' },
  { to: '/listings', icon: Search, label: 'Browse Listings' },
]

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
      <div style={{ minHeight: '100vh', background: 'var(--beige)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--text-muted)' }}>Loading...</div>
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
            Welcome, {profile?.full_name?.split(' ')[0]} 👋
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            {profile?.department} · {profile?.matric_number}
          </p>
        </div>

        {/* Stats */}
        <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.2rem', marginBottom: '2rem' }}>
          {[
            { icon: MessageSquare, label: 'Active Chats', value: stats.chats, link: '/student/chats' },
            { icon: Calendar, label: 'Viewing Bookings', value: stats.viewings, link: '/student/viewings' },
            { icon: Home, label: 'New Listings', value: stats.listings, link: '/listings' },
          ].map(stat => {
            const Icon = stat.icon
            return (
              <Link key={stat.label} to={stat.link} style={{ textDecoration: 'none' }}>
                <div style={{ background: 'var(--card)', borderRadius: '20px', padding: '1.5rem', border: '1px solid var(--beige-dark)' }}>
                  <div style={{ marginBottom: '0.8rem' }}>
                    <Icon size={24} color='var(--orange)' />
                  </div>
                  <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '2rem', fontWeight: 900, color: 'var(--blue)', lineHeight: 1 }}>
                    {stat.value}
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text)', marginTop: '0.3rem' }}>
                    {stat.label}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>

        <div className="dashboard-bottom" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1.5rem' }}>

          {/* Recent Listings */}
          <div style={{ background: 'var(--card)', borderRadius: '20px', padding: '1.8rem', border: '1px solid var(--beige-dark)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.2rem' }}>
              <h3 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--blue)' }}>Recent Listings</h3>
              <Link to="/listings" style={{ fontSize: '0.82rem', color: 'var(--orange)', fontWeight: 600, textDecoration: 'none' }}>
                View all →
              </Link>
            </div>
            {recentListings.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                <p style={{ fontSize: '0.88rem' }}>No listings available yet</p>
                <Link to="/listings" style={{ color: 'var(--orange)', fontWeight: 600, fontSize: '0.82rem', textDecoration: 'none' }}>
                  Browse listings →
                </Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                {recentListings.map(listing => (
                  <div key={listing.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: 'var(--beige)', borderRadius: '12px', border: '1px solid var(--beige-dark)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Home size={18} color='white' />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text)' }}>{listing.title}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {listing.distance} mins · ₦{listing.price.toLocaleString()}/yr
                        </div>
                      </div>
                    </div>
                    <Link to={`/listings/${listing.id}`} style={{ background: 'var(--blue)', color: 'white', padding: '0.4rem 0.9rem', borderRadius: '50px', fontSize: '0.75rem', fontWeight: 600, textDecoration: 'none' }}>
                      View
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions + Tip */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            <div style={{ background: 'var(--card)', borderRadius: '20px', padding: '1.8rem', border: '1px solid var(--beige-dark)' }}>
              <h3 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--blue)', marginBottom: '1.2rem' }}>Quick Actions</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                <Link to="/listings" style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', background: 'var(--orange)', color: 'white', padding: '0.9rem 1.2rem', borderRadius: '12px', textDecoration: 'none', fontWeight: 600, fontSize: '0.88rem' }}>
                  <Search size={16} /> Browse Listings
                </Link>
                <Link to="/student/chats" style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', background: 'var(--beige)', color: 'var(--text)', padding: '0.9rem 1.2rem', borderRadius: '12px', textDecoration: 'none', fontWeight: 600, fontSize: '0.88rem', border: '1px solid var(--beige-dark)' }}>
                  <MessageSquare size={16} /> My Chats
                </Link>
                <Link to="/student/viewings" style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', background: 'var(--beige)', color: 'var(--text)', padding: '0.9rem 1.2rem', borderRadius: '12px', textDecoration: 'none', fontWeight: 600, fontSize: '0.88rem', border: '1px solid var(--beige-dark)' }}>
                  <Calendar size={16} /> My Viewings
                </Link>
              </div>
            </div>

            <div style={{ background: 'var(--blue)', borderRadius: '20px', padding: '1.8rem' }}>
              <Lightbulb size={24} color='var(--orange)' style={{ marginBottom: '0.8rem' }} />
              <h4 style={{ fontWeight: 700, fontSize: '0.95rem', color: 'white', marginBottom: '0.5rem' }}>Safety Tip</h4>
              <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>
                Always book a viewing before making any payment. Never pay outside the agreed process.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
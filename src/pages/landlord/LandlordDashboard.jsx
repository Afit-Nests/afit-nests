import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { LayoutDashboard, MessageSquare, Home, Plus, Calendar, User, LogOut, CheckCircle, Clock, BadgeCheck } from 'lucide-react'
import MobileNav from '../../components/common/MobileNav'

const SIDEBAR_LINKS = [
  { to: '/landlord/dashboard', icon: <LayoutDashboard size={18} />, label: 'Dashboard', active: true },
  { to: '/landlord/chats', icon: <MessageSquare size={18} />, label: 'Chats' },
  { to: '/landlord/listings', icon: <Home size={18} />, label: 'My Listings' },
  { to: '/landlord/listings/create', icon: <Plus size={18} />, label: 'Add Listing' },
  { to: '/landlord/viewings', icon: <Calendar size={18} />, label: 'Viewing Requests' },
  { to: '/landlord/profile', icon: <User size={18} />, label: 'Profile' },
]

export default function LandlordDashboard() {
  const { profile, signOut } = useAuth()
  const [stats, setStats] = useState({ listings: 0, pendingViewings: 0, chats: 0 })
  const [recentChats, setRecentChats] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (profile) fetchData()
  }, [profile])

  const fetchData = async () => {
    const [listingsRes, viewingsRes, chatsRes] = await Promise.all([
      supabase.from('listings').select('id', { count: 'exact' }).eq('landlord_id', profile.id),
      supabase.from('viewings').select('id', { count: 'exact' }).eq('landlord_id', profile.id).eq('status', 'pending'),
      supabase.from('chats').select(`*, listings (title), profiles!chats_student_id_fkey (full_name)`).eq('landlord_id', profile.id).order('created_at', { ascending: false }).limit(3),
    ])
    setStats({
      listings: listingsRes.count || 0,
      pendingViewings: viewingsRes.count || 0,
      chats: chatsRes.data?.length || 0,
    })
    setRecentChats(chatsRes.data || [])
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
    <div style={{ minHeight: '100vh', background: 'var(--beige)', display: 'grid', gridTemplateColumns: '240px 1fr' }} className="dashboard-layout">

      <MobileNav links={SIDEBAR_LINKS} />

      {/* SIDEBAR */}
      <div className="desktop-sidebar" style={{ background: 'var(--blue-dark)', padding: '2rem 1.2rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', position: 'sticky', top: 0, height: '100vh', overflowY: 'auto' }}>
        <Link to="/" style={{ textDecoration: 'none', marginBottom: '2rem', display: 'block' }}>
          <span style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.4rem', fontWeight: 900, color: 'white' }}>
            AFIT <span style={{ color: 'var(--orange)' }}>Nests</span>
          </span>
          <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.2rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Landlord Panel
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
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--orange)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.9rem', flexShrink: 0 }}>
              {profile?.full_name?.charAt(0)}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{profile?.full_name}</div>
              <div style={{ fontSize: '0.72rem', color: profile?.verified ? '#4ade80' : 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                {profile?.verified ? <><BadgeCheck size={12} /> Verified</> : <><Clock size={12} /> Pending verification</>}
              </div>
            </div>
          </div>
          <button onClick={async () => { await signOut(); window.location.href = '/' }} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', marginTop: '0.8rem', fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', fontFamily: 'DM Sans, sans-serif', padding: 0 }}>
            <LogOut size={14} /> Logout
          </button>
        </div>
      </div>

      {/* MAIN */}
      <div className="main-content" style={{ padding: '2.5rem', overflowY: 'auto', minWidth: 0 }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(1.4rem, 3vw, 1.8rem)', fontWeight: 900, color: 'var(--blue-dark)' }}>
            Welcome, {profile?.full_name?.split(' ')[0]} 👋
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            Here's an overview of your listings and activity.
          </p>
        </div>

        {/* Stats */}
        <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
          {[
            { icon: <Home size={28} color="var(--blue)" />, label: 'My Listings', value: stats.listings, link: '/landlord/listings' },
            { icon: <Calendar size={28} color={stats.pendingViewings > 0 ? 'var(--orange)' : 'var(--blue)'} />, label: 'Pending Viewings', value: stats.pendingViewings, link: '/landlord/viewings', urgent: stats.pendingViewings > 0 },
            { icon: <MessageSquare size={28} color="var(--blue)" />, label: 'Active Chats', value: stats.chats, link: '/landlord/chats' },
          ].map(stat => (
            <Link key={stat.label} to={stat.link} style={{ textDecoration: 'none' }}>
              <div style={{ background: 'var(--card)', borderRadius: '20px', padding: '1.5rem', border: `1px solid ${stat.urgent ? 'rgba(249,115,22,0.3)' : 'var(--beige-dark)'}`, height: '100%' }}>
                <div style={{ marginBottom: '0.8rem' }}>{stat.icon}</div>
                <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '2rem', fontWeight: 900, color: stat.urgent ? 'var(--orange)' : 'var(--blue)', lineHeight: 1 }}>
                  {stat.value}
                </div>
                <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text)', marginTop: '0.3rem' }}>
                  {stat.label}
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Bottom Section */}
        <div className="dashboard-bottom" style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '1.5rem', alignItems: 'start' }}>

          {/* Recent Chats */}
          <div style={{ background: 'var(--card)', borderRadius: '20px', padding: '1.8rem', border: '1px solid var(--beige-dark)', minWidth: 0 }}>
            <h3 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--blue)', marginBottom: '1.2rem' }}>Recent Student Inquiries</h3>
            {recentChats.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                <MessageSquare size={32} style={{ margin: '0 auto 0.8rem', opacity: 0.4 }} />
                <p style={{ fontSize: '0.88rem' }}>No inquiries yet</p>
                <p style={{ fontSize: '0.78rem', marginTop: '0.3rem' }}>Students will contact you once your listings are live</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                {recentChats.map(chat => (
                  <div key={chat.id} style={{ display: 'flex', gap: '1rem', alignItems: 'center', padding: '1rem', background: 'var(--beige)', borderRadius: '12px', border: '1px solid var(--beige-dark)' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.9rem', flexShrink: 0 }}>
                      {chat.profiles?.full_name?.charAt(0) || 'S'}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{chat.profiles?.full_name || 'Student'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--orange)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{chat.listings?.title}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            <div style={{ background: 'var(--card)', borderRadius: '20px', padding: '1.8rem', border: '1px solid var(--beige-dark)' }}>
              <h3 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--blue)', marginBottom: '1.2rem' }}>Quick Actions</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                <Link to="/landlord/listings/create" style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', background: 'var(--orange)', color: 'white', padding: '0.9rem 1.2rem', borderRadius: '12px', textDecoration: 'none', fontWeight: 600, fontSize: '0.88rem' }}>
                  <Plus size={16} /> Add New Listing
                </Link>
                <Link to="/landlord/viewings" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--beige)', color: 'var(--text)', padding: '0.9rem 1.2rem', borderRadius: '12px', textDecoration: 'none', fontWeight: 600, fontSize: '0.88rem', border: '1px solid var(--beige-dark)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}><Calendar size={16} /> Viewing Requests</span>
                  {stats.pendingViewings > 0 && (
                    <span style={{ background: 'var(--orange)', color: 'white', padding: '0.1rem 0.5rem', borderRadius: '50px', fontSize: '0.75rem', fontWeight: 700 }}>
                      {stats.pendingViewings}
                    </span>
                  )}
                </Link>
                <Link to="/landlord/listings" style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', background: 'var(--beige)', color: 'var(--text)', padding: '0.9rem 1.2rem', borderRadius: '12px', textDecoration: 'none', fontWeight: 600, fontSize: '0.88rem', border: '1px solid var(--beige-dark)' }}>
                  <Home size={16} /> My Listings
                </Link>
              </div>
            </div>

            {!profile?.verified && (
              <div style={{ background: 'rgba(249,115,22,0.08)', borderRadius: '20px', padding: '1.5rem', border: '1px solid rgba(249,115,22,0.2)' }}>
                <Clock size={24} color="var(--orange)" style={{ marginBottom: '0.5rem' }} />
                <h4 style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--orange)', marginBottom: '0.4rem' }}>Verification Pending</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>Your account is being reviewed by the AFIT Nests team.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { backend } from '../../lib/personalBackendClient'
import { useState, useEffect } from 'react'
import { LayoutDashboard, BadgeCheck, Clock, AlertTriangle, Home, Users, LogOut, Database } from 'lucide-react'
import MobileNav from '../../components/common/MobileNav'
import MfaCard from '../../components/common/MfaCard'

const SIDEBAR_LINKS = [
  { to: '/admin/dashboard', icon: <LayoutDashboard size={18} />, label: 'Dashboard', active: true },
  { to: '/admin/cms', icon: <Database size={18} />, label: 'All-in-one CMS' },
  { to: '/admin/verifications', icon: <BadgeCheck size={18} />, label: 'Verifications' },
  { to: '/admin/pending-allocations', icon: <Clock size={18} />, label: 'Pending Allocations' },
  { to: '/admin/disputes', icon: <AlertTriangle size={18} />, label: 'Disputes' },
  { to: '/listings', icon: <Home size={18} />, label: 'All Listings' },
]

export default function AdminDashboard() {
  const { profile, signOut } = useAuth()
  const [stats, setStats] = useState({ listings: 0, verifications: 0, disputes: 0, users: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchStats() }, [])

  const fetchStats = async () => {
    const [listingsRes, verificationsRes, disputesRes, usersRes] = await Promise.all([
      backend.from('listings').select('id', { count: 'exact' }).eq('available', true),
      backend.from('profiles').select('id', { count: 'exact' }).eq('role', 'landlord').eq('verified', false),
      backend.from('disputes').select('id', { count: 'exact' }).eq('status', 'open'),
      backend.from('profiles').select('id', { count: 'exact' }),
    ])
    setStats({
      listings: listingsRes.count || 0,
      verifications: verificationsRes.count || 0,
      disputes: disputesRes.count || 0,
      users: usersRes.count || 0,
    })
    setLoading(false)
  }

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
          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'white', marginBottom: '0.5rem' }}>{profile?.full_name || 'Admin'}</div>
          <button onClick={async () => { await signOut(); window.location.href = '/' }} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', fontFamily: 'DM Sans, sans-serif', padding: 0 }}>
            <LogOut size={14} /> Logout
          </button>
        </div>
      </div>

      <div className="main-content" style={{ padding: '2.5rem', overflowY: 'auto' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.8rem', fontWeight: 900, color: 'var(--blue-dark)' }}>Admin Dashboard</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.2rem' }}>Platform overview and management.</p>
        </div>

        <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.2rem', marginBottom: '2rem' }}>
          {[
            { icon: <Home size={28} color="var(--blue)" />, label: 'Active Listings', value: loading ? '...' : stats.listings, link: '/listings' },
            { icon: <BadgeCheck size={28} color={stats.verifications > 0 ? 'var(--orange)' : 'var(--blue)'} />, label: 'Pending Verifications', value: loading ? '...' : stats.verifications, link: '/admin/verifications', urgent: stats.verifications > 0 },
            { icon: <AlertTriangle size={28} color={stats.disputes > 0 ? 'var(--orange)' : 'var(--blue)'} />, label: 'Open Disputes', value: loading ? '...' : stats.disputes, link: '/admin/disputes', urgent: stats.disputes > 0 },
            { icon: <Users size={28} color="var(--blue)" />, label: 'Total Users', value: loading ? '...' : stats.users, link: '#' },
          ].map(stat => (
            <Link key={stat.label} to={stat.link} style={{ textDecoration: 'none' }}>
              <div style={{ background: 'var(--card)', borderRadius: '20px', padding: '1.5rem', border: `1px solid ${stat.urgent ? 'rgba(249,115,22,0.3)' : 'var(--beige-dark)'}` }}>
                <div style={{ marginBottom: '0.8rem' }}>{stat.icon}</div>
                <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '2rem', fontWeight: 900, color: stat.urgent ? 'var(--orange)' : 'var(--blue)', lineHeight: 1 }}>{stat.value}</div>
                <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text)', marginTop: '0.3rem' }}>{stat.label}</div>
              </div>
            </Link>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div style={{ background: 'var(--card)', borderRadius: '20px', padding: '1.8rem', border: '1px solid var(--beige-dark)' }}>
            <h3 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--blue)', marginBottom: '1.2rem' }}>Quick Actions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              <Link to="/admin/verifications" style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', background: 'var(--orange)', color: 'white', padding: '0.9rem 1.2rem', borderRadius: '12px', textDecoration: 'none', fontWeight: 600, fontSize: '0.88rem' }}>
                <BadgeCheck size={16} /> Review Verifications
              </Link>
              <Link to="/admin/cms" style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', background: 'var(--blue)', color: 'white', padding: '0.9rem 1.2rem', borderRadius: '12px', textDecoration: 'none', fontWeight: 600, fontSize: '0.88rem' }}>
                <Database size={16} /> Open All-in-one CMS
              </Link>
              <Link to="/admin/pending-allocations" style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', background: 'var(--beige)', color: 'var(--text)', padding: '0.9rem 1.2rem', borderRadius: '12px', textDecoration: 'none', fontWeight: 600, fontSize: '0.88rem', border: '1px solid var(--beige-dark)' }}>
                <Clock size={16} /> Pending Allocations
              </Link>
              <Link to="/admin/disputes" style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', background: 'var(--beige)', color: 'var(--text)', padding: '0.9rem 1.2rem', borderRadius: '12px', textDecoration: 'none', fontWeight: 600, fontSize: '0.88rem', border: '1px solid var(--beige-dark)' }}>
                <AlertTriangle size={16} /> Manage Disputes
              </Link>
              <Link to="/listings" style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', background: 'var(--beige)', color: 'var(--text)', padding: '0.9rem 1.2rem', borderRadius: '12px', textDecoration: 'none', fontWeight: 600, fontSize: '0.88rem', border: '1px solid var(--beige-dark)' }}>
                <Home size={16} /> View All Listings
              </Link>
            </div>
          </div>

          <div style={{ background: 'var(--blue)', borderRadius: '20px', padding: '1.8rem' }}>
            <h3 style={{ fontWeight: 700, fontSize: '1rem', color: 'white', marginBottom: '1.2rem' }}>Platform Info</h3>
            {[
              { label: 'Active Listings', value: stats.listings, icon: <Home size={14} /> },
              { label: 'Pending Verifications', value: stats.verifications, icon: <BadgeCheck size={14} /> },
              { label: 'Open Disputes', value: stats.disputes, icon: <AlertTriangle size={14} /> },
              { label: 'Total Users', value: stats.users, icon: <Users size={14} /> },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: 'rgba(255,255,255,0.7)' }}>{item.icon} {item.label}</span>
                <span style={{ fontSize: '1rem', color: 'white', fontWeight: 700, fontFamily: 'Playfair Display, serif' }}>{loading ? '...' : item.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: '1.5rem', maxWidth: '520px' }}>
          <MfaCard />
        </div>
      </div>
    </div>
  )
}

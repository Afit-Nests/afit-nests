import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import MobileNav from '../../components/common/MobileNav'

const SIDEBAR_LINKS = [
  { to: '/admin/dashboard', icon: '📊', label: 'Dashboard', active: true },
  { to: '/admin/verifications', icon: '✅', label: 'Verifications' },
  { to: '/admin/pending-allocations', icon: '⏳', label: 'Pending Allocations' },
  { to: '/admin/disputes', icon: '⚠️', label: 'Disputes' },
  { to: '/listings', icon: '🏠', label: 'All Listings' },
]

export default function AdminDashboard() {
  const { signOut } = useAuth()

  return (
    <div className="dashboard-layout" style={{ minHeight: '100vh', background: 'var(--beige)', display: 'grid', gridTemplateColumns: '240px 1fr' }}>

      <MobileNav links={SIDEBAR_LINKS} />

      <div className="desktop-sidebar" style={{ background: 'var(--blue-dark)', padding: '2rem 1.2rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', position: 'sticky', top: 0, height: '100vh' }}>
        <Link to="/" style={{ textDecoration: 'none', marginBottom: '2rem', display: 'block' }}>
          <span style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.4rem', fontWeight: 900, color: 'white' }}>AFIT <span style={{ color: 'var(--orange)' }}>Nests</span></span>
          <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.2rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Admin Panel</div>
        </Link>
        {SIDEBAR_LINKS.map(item => (
          <Link key={item.to} to={item.to} style={{ display: 'flex', alignItems: 'center', padding: '0.75rem 1rem', borderRadius: '12px', textDecoration: 'none', background: item.active ? 'rgba(255,255,255,0.1)' : 'transparent', color: item.active ? 'white' : 'rgba(255,255,255,0.6)', fontSize: '0.88rem', fontWeight: item.active ? 600 : 400, gap: '0.7rem' }}>
            {item.icon} {item.label}
          </Link>
        ))}
        <div style={{ marginTop: 'auto' }}>
          <button onClick={async () => { await signOut(); window.location.href = '/' }} style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', padding: '0.75rem 1rem', borderRadius: '12px', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', fontSize: '0.88rem', fontFamily: 'DM Sans, sans-serif' }}>
            🚪 Logout
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
            { icon: '🏠', label: 'Total Listings', value: '—', link: '/listings' },
            { icon: '✅', label: 'Pending Verifications', value: '—', link: '/admin/verifications', urgent: true },
            { icon: '⚠️', label: 'Open Disputes', value: '—', link: '/admin/disputes', urgent: true },
            { icon: '👥', label: 'Registered Users', value: '—', link: '#' },
          ].map(stat => (
            <Link key={stat.label} to={stat.link} style={{ textDecoration: 'none' }}>
              <div style={{ background: 'var(--card)', borderRadius: '20px', padding: '1.5rem', border: `1px solid ${stat.urgent ? 'rgba(249,115,22,0.3)' : 'var(--beige-dark)'}` }}>
                <div style={{ fontSize: '1.8rem', marginBottom: '0.8rem' }}>{stat.icon}</div>
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
                ✅ Review Verifications
              </Link>
              <Link to="/admin/disputes" style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', background: 'var(--beige)', color: 'var(--text)', padding: '0.9rem 1.2rem', borderRadius: '12px', textDecoration: 'none', fontWeight: 600, fontSize: '0.88rem', border: '1px solid var(--beige-dark)' }}>
                ⚠️ Manage Disputes
              </Link>
              <Link to="/listings" style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', background: 'var(--beige)', color: 'var(--text)', padding: '0.9rem 1.2rem', borderRadius: '12px', textDecoration: 'none', fontWeight: 600, fontSize: '0.88rem', border: '1px solid var(--beige-dark)' }}>
                🏠 View All Listings
              </Link>
            </div>
          </div>
          <div style={{ background: 'var(--blue)', borderRadius: '20px', padding: '1.8rem' }}>
            <h3 style={{ fontWeight: 700, fontSize: '1rem', color: 'white', marginBottom: '1rem' }}>Platform Status</h3>
            {[
              { label: 'Verified Landlords', value: 72 },
              { label: 'Available Listings', value: 83 },
              { label: 'Active Students', value: 91 },
            ].map(item => (
              <div key={item.label} style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                  <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.7)' }}>{item.label}</span>
                  <span style={{ fontSize: '0.82rem', color: 'white', fontWeight: 600 }}>{item.value}%</span>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '50px', height: '6px' }}>
                  <div style={{ width: `${item.value}%`, background: 'var(--orange)', borderRadius: '50px', height: '6px' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
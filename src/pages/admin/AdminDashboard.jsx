import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { backend } from '../../lib/personalBackendClient'
import { useState, useEffect } from 'react'
import { LayoutDashboard, BadgeCheck, Clock, AlertTriangle, Home, Users, LogOut, Database, CheckCircle2, ArrowRight } from 'lucide-react'
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

  // Only genuinely actionable queues belong here. The panel previously
  // repeated the same four numbers already shown in the cards above it.
  const attention = [
    { count: stats.verifications, label: 'landlord verifications waiting', to: '/admin/verifications', icon: <BadgeCheck size={16} aria-hidden="true" /> },
    { count: stats.disputes, label: 'open disputes to resolve', to: '/admin/disputes', icon: <AlertTriangle size={16} aria-hidden="true" /> },
  ].filter(item => item.count > 0)

  return (
    <div className="dashboard-layout" style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '240px 1fr' }}>
      <MobileNav links={SIDEBAR_LINKS} />

      <div className="desktop-sidebar" style={{ padding: '2rem 1.2rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', position: 'sticky', top: 0, height: '100vh' }}>
        <Link to="/" style={{ textDecoration: 'none', marginBottom: 'var(--space-5)', display: 'block' }}>
          <span style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.4rem', fontWeight: 900, color: 'white' }}>AFIT <span style={{ color: 'var(--orange)' }}>Nests</span></span>
          <div style={{ fontSize: 'var(--text-xs)', color: 'rgba(255,255,255,0.5)', marginTop: '0.2rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Admin Panel</div>
        </Link>
        {SIDEBAR_LINKS.map(item => (
          <Link key={item.to} to={item.to} aria-current={item.active ? 'page' : undefined} style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', padding: '0.75rem 1rem', borderRadius: '12px', textDecoration: 'none', background: item.active ? 'rgba(255,255,255,0.1)' : 'transparent', color: item.active ? 'white' : 'rgba(255,255,255,0.6)', fontSize: 'var(--text-base)', fontWeight: item.active ? 600 : 400 }}>
            {item.icon} {item.label}
          </Link>
        ))}
        <div style={{ marginTop: 'auto', padding: 'var(--space-3)', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>
          <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'white', marginBottom: '0.5rem' }}>{profile?.full_name || 'Admin'}</div>
          <button onClick={async () => { await signOut(); window.location.href = '/' }} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: 'var(--text-xs)', color: 'rgba(255,255,255,0.4)', fontFamily: 'DM Sans, sans-serif', padding: 0 }}>
            <LogOut size={14} aria-hidden="true" /> Logout
          </button>
        </div>
      </div>

      <div className="main-content" style={{ padding: 'var(--space-5)', overflowY: 'auto' }}>
        <header style={{ marginBottom: 'var(--space-5)' }}>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'var(--text-xl)', fontWeight: 900, color: 'var(--blue-dark)', lineHeight: 1.2 }}>Admin Dashboard</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-base)', marginTop: '0.35rem' }}>Platform overview and management.</p>
        </header>

        <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
          {[
            { icon: <Home size={22} color="var(--blue)" aria-hidden="true" />, label: 'Active Listings', value: stats.listings, link: '/listings' },
            { icon: <BadgeCheck size={22} color={stats.verifications > 0 ? 'var(--orange)' : 'var(--blue)'} aria-hidden="true" />, label: 'Pending Verifications', value: stats.verifications, link: '/admin/verifications', urgent: stats.verifications > 0 },
            { icon: <AlertTriangle size={22} color={stats.disputes > 0 ? 'var(--orange)' : 'var(--blue)'} aria-hidden="true" />, label: 'Open Disputes', value: stats.disputes, link: '/admin/disputes', urgent: stats.disputes > 0 },
            { icon: <Users size={22} color="var(--blue)" aria-hidden="true" />, label: 'Total Users', value: stats.users, link: '/admin/cms' },
          ].map(stat => (
            <Link key={stat.label} to={stat.link} className="dash-tile" style={stat.urgent ? { borderColor: 'rgba(242,105,42,0.35)' } : undefined}>
              {stat.icon}
              <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 'var(--text-2xl)', fontWeight: 900, color: stat.urgent ? 'var(--orange)' : 'var(--blue)', lineHeight: 1, marginTop: 'var(--space-2)' }}>
                {loading ? '—' : stat.value}
              </div>
              <div style={{ fontWeight: 500, fontSize: 'var(--text-base)', color: 'var(--text-muted)', marginTop: '0.35rem' }}>{stat.label}</div>
            </Link>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
          <section className="dash-card">
            <h2 className="dash-section-title" style={{ marginBottom: 'var(--space-3)' }}>Quick Actions</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <Link to="/admin/verifications" style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', background: 'var(--orange)', color: 'white', padding: '0.9rem 1.2rem', borderRadius: '999px', textDecoration: 'none', fontWeight: 600, fontSize: 'var(--text-base)' }}>
                <BadgeCheck size={16} aria-hidden="true" /> Review Verifications
              </Link>
              <Link to="/admin/cms" style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', background: 'var(--blue)', color: 'white', padding: '0.9rem 1.2rem', borderRadius: '999px', textDecoration: 'none', fontWeight: 600, fontSize: 'var(--text-base)' }}>
                <Database size={16} aria-hidden="true" /> Open All-in-one CMS
              </Link>
              <Link to="/admin/pending-allocations" style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', background: 'var(--card)', color: 'var(--text)', padding: '0.9rem 1.2rem', borderRadius: '999px', textDecoration: 'none', fontWeight: 600, fontSize: 'var(--text-base)', border: '1px solid var(--line)' }}>
                <Clock size={16} aria-hidden="true" /> Pending Allocations
              </Link>
              <Link to="/admin/disputes" style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', background: 'var(--card)', color: 'var(--text)', padding: '0.9rem 1.2rem', borderRadius: '999px', textDecoration: 'none', fontWeight: 600, fontSize: 'var(--text-base)', border: '1px solid var(--line)' }}>
                <AlertTriangle size={16} aria-hidden="true" /> Manage Disputes
              </Link>
              <Link to="/listings" style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', background: 'var(--card)', color: 'var(--text)', padding: '0.9rem 1.2rem', borderRadius: '999px', textDecoration: 'none', fontWeight: 600, fontSize: 'var(--text-base)', border: '1px solid var(--line)' }}>
                <Home size={16} aria-hidden="true" /> View All Listings
              </Link>
            </div>
          </section>

          <section className="dash-card">
            <h2 className="dash-section-title" style={{ marginBottom: 'var(--space-3)' }}>Needs Attention</h2>

            {loading ? (
              <p style={{ fontSize: 'var(--text-base)', color: 'var(--text-muted)' }}>Checking queues…</p>
            ) : attention.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', padding: 'var(--space-3) 0', color: 'var(--text-muted)' }}>
                <CheckCircle2 size={20} color="var(--green)" aria-hidden="true" />
                <span style={{ fontSize: 'var(--text-base)' }}>Nothing waiting. All queues are clear.</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {attention.map(item => (
                  <Link key={item.to} to={item.to} className="dash-tile" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', padding: 'var(--space-2) var(--space-3)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '34px', height: '34px', borderRadius: '50%', background: 'rgba(242,105,42,0.12)', color: 'var(--orange)', flexShrink: 0 }}>
                      {item.icon}
                    </span>
                    <span style={{ flex: 1, fontSize: 'var(--text-base)', color: 'var(--text)' }}>
                      <strong style={{ color: 'var(--orange)' }}>{item.count}</strong> {item.label}
                    </span>
                    <ArrowRight size={16} color="var(--text-muted)" aria-hidden="true" />
                  </Link>
                ))}
              </div>
            )}

            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: 'var(--space-3)', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--line)' }}>
              {loading ? '—' : `${stats.users} total users · ${stats.listings} active listings`}
            </p>
          </section>
        </div>

        <div style={{ marginTop: 'var(--space-4)', maxWidth: '520px' }}>
          <MfaCard />
        </div>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Menu, X, LogOut } from 'lucide-react'

export default function MobileNav({ links }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const { profile, signOut } = useAuth()
  const location = useLocation()

  return (
    <>
      <div className="mobile-nav-wrapper" style={{ display: 'none' }}>

        {/* Top Bar */}
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
          background: 'var(--blue-dark)', padding: '1rem 1.2rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          boxShadow: '0 2px 20px rgba(0,0,0,0.2)',
        }}>
          <Link to="/" style={{ textDecoration: 'none' }}>
            <span style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.2rem', fontWeight: 900, color: 'white' }}>
              AFIT <span style={{ color: 'var(--orange)' }}>Nests</span>
            </span>
          </Link>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Spacer */}
        <div style={{ height: '60px' }} />

        {/* Dropdown Menu */}
        {menuOpen && (
          <div style={{
            position: 'fixed', top: '60px', left: 0, right: 0, zIndex: 99,
            background: 'var(--blue-dark)', padding: '1rem 1.2rem',
            display: 'flex', flexDirection: 'column', gap: '0.3rem',
            boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
          }}>
            {links.map(item => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMenuOpen(false)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.7rem',
                  padding: '0.75rem 1rem', borderRadius: '12px', textDecoration: 'none',
                  background: location.pathname === item.to ? 'rgba(255,255,255,0.1)' : 'transparent',
                  color: location.pathname === item.to ? 'white' : 'rgba(255,255,255,0.7)',
                  fontSize: '0.95rem', fontWeight: location.pathname === item.to ? 600 : 400,
                }}
              >
                {item.icon} {item.label}
              </Link>
            ))}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: '0.5rem', paddingTop: '0.8rem' }}>
              <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.5rem', paddingLeft: '1rem' }}>
                {profile?.full_name}
              </div>
              <button
                onClick={async () => { await signOut(); window.location.href = '/' }}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontFamily: 'DM Sans, sans-serif', fontSize: '0.88rem', paddingLeft: '1rem' }}
              >
                <LogOut size={14} /> Logout
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
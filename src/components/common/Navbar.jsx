import { useState } from 'react'
import { Link } from 'react-router-dom'

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <nav style={{
      position: 'fixed',
      top: 0, left: 0, right: 0,
      zIndex: 100,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '1.2rem 5%',
      background: 'rgba(245, 240, 232, 0.85)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--beige-dark)',
    }}>

      {/* Logo */}
      <Link to="/" style={{ textDecoration: 'none' }}>
        <span style={{
          fontFamily: 'Playfair Display, serif',
          fontSize: '1.6rem',
          fontWeight: 900,
          color: 'var(--blue)',
        }}>
          AFIT <span style={{ color: 'var(--orange)' }}>Nests</span>
        </span>
      </Link>

      {/* Desktop Nav Links */}
      <div className="nav-links" style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
        <Link to="/listings" style={{ textDecoration: 'none', color: 'var(--text)', fontWeight: 500, fontSize: '0.9rem' }}>
          Browse Listings
        </Link>
        <Link to="/#how-it-works" style={{ textDecoration: 'none', color: 'var(--text)', fontWeight: 500, fontSize: '0.9rem' }}>
          How it Works
        </Link>
        <Link to="/landlord/login" style={{ textDecoration: 'none', color: 'var(--text)', fontWeight: 500, fontSize: '0.9rem' }}>
          For Landlords
        </Link>
        <Link to="/student/login" style={{ textDecoration: 'none', color: 'var(--text)', fontWeight: 500, fontSize: '0.9rem' }}>
          Login
        </Link>
        <Link to="/student/signup" style={{ textDecoration: 'none', background: 'var(--blue)', color: 'white', padding: '0.55rem 1.4rem', borderRadius: '50px', fontWeight: 600, fontSize: '0.9rem' }}>
          Find a Home
        </Link>
      </div>

      {/* Mobile Hamburger */}
      <button
  className="nav-hamburger"
  onClick={() => setMenuOpen(!menuOpen)}
  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.5rem', color: 'var(--blue)' }}
>
  {menuOpen ? '✕' : '☰'}
</button>

      {/* Mobile Dropdown */}
      {menuOpen && (
        <div className="nav-mobile-menu" style={{
          position: 'fixed', top: '65px', left: 0, right: 0,
          background: 'rgba(245, 240, 232, 0.98)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--beige-dark)',
          padding: '1rem 5% 1.5rem',
          display: 'flex', flexDirection: 'column', gap: '0.3rem',
          zIndex: 99,
        }}>
          {[
            { to: '/listings', label: 'Browse Listings' },
            { to: '/#how-it-works', label: 'How it Works' },
            { to: '/landlord/login', label: 'For Landlords' },
            { to: '/student/login', label: 'Login' },
          ].map(link => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMenuOpen(false)}
              style={{ textDecoration: 'none', color: 'var(--text)', fontWeight: 500, fontSize: '0.95rem', padding: '0.75rem 1rem', borderRadius: '12px', display: 'block' }}
            >
              {link.label}
            </Link>
          ))}
          <Link
            to="/student/signup"
            onClick={() => setMenuOpen(false)}
            style={{ textDecoration: 'none', background: 'var(--blue)', color: 'white', padding: '0.75rem 1rem', borderRadius: '12px', fontWeight: 600, fontSize: '0.95rem', textAlign: 'center', marginTop: '0.5rem' }}
          >
            Find a Home
          </Link>
        </div>
      )}
    </nav>
  )
}
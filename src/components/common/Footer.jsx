import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer style={{
      background: 'var(--blue-dark)',
      color: 'rgba(255,255,255,0.6)',
      textAlign: 'center',
      padding: '2rem 5%',
      fontSize: '0.85rem',
    }}>
      <p>
        <span style={{
          fontFamily: 'Playfair Display, serif',
          fontWeight: 700,
          color: 'white',
        }}>
          AFIT <span style={{ color: 'var(--orange)' }}>Nests</span>
        </span>
        {' '}— Built for AFIT Students · Barkallahu, Kaduna · © 2025
      </p>
    </footer>
  )
}
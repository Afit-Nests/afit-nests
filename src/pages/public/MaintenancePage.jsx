export default function MaintenancePage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--beige)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      textAlign: 'center',
    }}>
      <div>
        <div style={{
          fontFamily: 'Playfair Display, serif',
          fontSize: '1.8rem',
          fontWeight: 900,
          color: 'var(--blue)',
          marginBottom: '2rem',
        }}>
          AFIT <span style={{ color: 'var(--orange)' }}>Nests</span>
        </div>

        <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>🔧</div>

        <h1 style={{
          fontFamily: 'Playfair Display, serif',
          fontSize: 'clamp(1.8rem, 3vw, 2.4rem)',
          fontWeight: 900,
          color: 'var(--blue-dark)',
          marginBottom: '1rem',
        }}>
          We'll Be Right Back
        </h1>

        <p style={{
          color: 'var(--text-muted)',
          fontSize: '1rem',
          lineHeight: 1.7,
          maxWidth: '420px',
          margin: '0 auto 2rem',
        }}>
          AFIT Nests is currently undergoing scheduled maintenance. We are working hard to improve your experience. Please check back shortly.
        </p>

        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          background: 'var(--blue)',
          color: 'white',
          padding: '0.6rem 1.4rem',
          borderRadius: '50px',
          fontSize: '0.85rem',
          fontWeight: 600,
          marginBottom: '2rem',
        }}>
          <span style={{
            width: '8px', height: '8px',
            borderRadius: '50%',
            background: 'var(--orange)',
            display: 'inline-block',
            animation: 'pulse 1.5s ease-in-out infinite',
          }} />
          Maintenance in progress
        </div>

        <p style={{
          fontSize: '0.82rem',
          color: 'var(--text-muted)',
        }}>
          Questions? Contact us on WhatsApp
        </p>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  )
}
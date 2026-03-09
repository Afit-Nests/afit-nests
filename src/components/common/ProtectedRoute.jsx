import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, profile, loading } = useAuth()

  // Still loading - show nothing yet
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--beige)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontFamily: 'Playfair Display, serif',
            fontSize: '1.6rem',
            fontWeight: 900,
            color: 'var(--blue)',
            marginBottom: '1rem',
          }}>
            AFIT <span style={{ color: 'var(--orange)' }}>Nests</span>
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading...</div>
        </div>
      </div>
    )
  }

  // Not logged in at all
  if (!user) {
    return <Navigate to="/student/login" replace />
  }

  // Logged in but wrong role
  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    if (profile.role === 'student') return <Navigate to="/student/dashboard" replace />
    if (profile.role === 'landlord') return <Navigate to="/landlord/dashboard" replace />
    if (profile.role === 'admin') return <Navigate to="/admin/dashboard" replace />
  }

  return children
}
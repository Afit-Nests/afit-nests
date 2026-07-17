import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { confirmAccommodationAllocation, getPendingAllocations, rejectTransaction } from '../../lib/paystack'
import { LayoutDashboard, BadgeCheck, Clock, AlertTriangle, Home, LogOut, CheckCircle, XCircle } from 'lucide-react'
import { toast } from 'react-hot-toast'
import MobileNav from '../../components/common/MobileNav'

const SIDEBAR_LINKS = [
  { to: '/admin/dashboard', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
  { to: '/admin/verifications', icon: <BadgeCheck size={18} />, label: 'Verifications' },
  { to: '/admin/pending-allocations', icon: <Clock size={18} />, label: 'Pending Allocations', active: true },
  { to: '/admin/disputes', icon: <AlertTriangle size={18} />, label: 'Disputes' },
  { to: '/listings', icon: <Home size={18} />, label: 'All Listings' },
]

const Sidebar = ({ signOut }) => (
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
      <button onClick={async () => { await signOut(); window.location.href = '/' }} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', fontFamily: 'DM Sans, sans-serif', padding: 0 }}>
        <LogOut size={14} /> Logout
      </button>
    </div>
  </div>
)

export default function PendingAllocations() {
  const { signOut } = useAuth()
  const [allocations, setAllocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)

  useEffect(() => { fetchAllocations() }, [])

  const fetchAllocations = async () => {
    try {
      const data = await getPendingAllocations()
      setAllocations(data)
    } catch (error) {
      toast.error('Failed to load allocations')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async (allocation) => {
    const toastId = toast.loading(`Confirming allocation for ${allocation.profiles.full_name}...`)
    setActionLoading(allocation.id)
    try {
      await confirmAccommodationAllocation(allocation.listing_id, allocation.id)
      toast.success('Accommodation allocation confirmed!', { id: toastId })
      await fetchAllocations()
    } catch (error) {
      toast.error('Failed to confirm allocation. Please try again.', { id: toastId })
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async (allocation) => {
    const toastId = toast.loading(`Rejecting transaction for ${allocation.profiles.full_name}...`)
    setActionLoading(allocation.id)
    try {
      await rejectTransaction(allocation.listing_id, allocation.id)
      toast.success('Transaction rejected and refunded!', { id: toastId })
      await fetchAllocations()
    } catch (error) {
      toast.error('Failed to reject transaction. Please try again.', { id: toastId })
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) return (
    <div className="dashboard-layout" style={{ minHeight: '100vh', background: 'var(--beige)', display: 'grid', gridTemplateColumns: '240px 1fr' }}>
      <MobileNav links={SIDEBAR_LINKS} />
      <Sidebar signOut={signOut} />
      <div className="main-content" style={{ padding: '2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--text-muted)' }}>Loading pending allocations...</div>
      </div>
    </div>
  )

  return (
    <div className="dashboard-layout" style={{ minHeight: '100vh', background: 'var(--beige)', display: 'grid', gridTemplateColumns: '240px 1fr' }}>
      <MobileNav links={SIDEBAR_LINKS} />
      <Sidebar signOut={signOut} />
      <div className="main-content" style={{ padding: '2.5rem', overflowY: 'auto' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.8rem', fontWeight: 900, color: 'var(--blue-dark)' }}>Pending Allocations</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.2rem' }}>Review and confirm accommodation allocations.</p>
        </div>
        {allocations.length === 0 ? (
          <div style={{ background: 'var(--card)', borderRadius: '20px', padding: '3rem', textAlign: 'center', border: '1px solid var(--beige-dark)' }}>
            <CheckCircle size={48} color="#16A34A" style={{ margin: '0 auto 1rem' }} />
            <h3 style={{ fontWeight: 700, color: 'var(--blue)', marginBottom: '0.5rem' }}>No Pending Allocations</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>All caught up! No payments waiting for review.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            {allocations.map(allocation => (
              <div key={allocation.id} style={{ background: 'var(--card)', borderRadius: '20px', padding: '1.8rem', border: '1px solid var(--beige-dark)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr auto', gap: '1.5rem', alignItems: 'start' }}>
                  <div style={{ width: '80px', height: '80px', borderRadius: '12px', overflow: 'hidden', background: 'linear-gradient(135deg, var(--blue) 0%, #2A5298 100%)' }}>
                    {allocation.listings.photos && allocation.listings.photos.length > 0 ? (
                      <img src={allocation.listings.photos[0]} alt={allocation.listings.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Home size={28} color="white" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--blue)', marginBottom: '0.5rem' }}>{allocation.listings.title}</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                      <div><strong>Student:</strong> {allocation.profiles.full_name} ({allocation.profiles.email})</div>
                      <div><strong>Landlord:</strong> {allocation.listings.profiles.full_name} ({allocation.listings.profiles.email})</div>
                      <div><strong>Amount:</strong> ₦{allocation.amount.toLocaleString()}</div>
                      <div><strong>Reference:</strong> {allocation.payment_reference}</div>
                      <div><strong>Date:</strong> {new Date(allocation.created_at).toLocaleDateString()}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    <button onClick={() => handleConfirm(allocation)} disabled={actionLoading === allocation.id} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: actionLoading === allocation.id ? 'var(--text-muted)' : '#16A34A', color: 'white', padding: '0.7rem 1.2rem', borderRadius: '10px', fontWeight: 600, fontSize: '0.85rem', border: 'none', cursor: actionLoading === allocation.id ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                      <CheckCircle size={15} /> {actionLoading === allocation.id ? 'Processing...' : 'Confirm Allocation'}
                    </button>
                    <button onClick={() => handleReject(allocation)} disabled={actionLoading === allocation.id} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: actionLoading === allocation.id ? 'var(--text-muted)' : '#DC2626', color: 'white', padding: '0.7rem 1.2rem', borderRadius: '10px', fontWeight: 600, fontSize: '0.85rem', border: 'none', cursor: actionLoading === allocation.id ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                      <XCircle size={15} /> {actionLoading === allocation.id ? 'Processing...' : 'Reject & Refund'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

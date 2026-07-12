import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { backend } from '../../lib/personalBackendClient'
import { LayoutDashboard, MessageSquare, Home, Plus, Calendar, User, LogOut, BadgeCheck, Circle, Clock } from 'lucide-react'
import MobileNav from '../../components/common/MobileNav'

const SIDEBAR_LINKS = [
  { to: '/landlord/dashboard', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
  { to: '/landlord/chats', icon: <MessageSquare size={18} />, label: 'Chats' },
  { to: '/landlord/listings', icon: <Home size={18} />, label: 'My Listings', active: true },
  { to: '/landlord/listings/create', icon: <Plus size={18} />, label: 'Add Listing' },
  { to: '/landlord/viewings', icon: <Calendar size={18} />, label: 'Viewing Requests' },
  { to: '/landlord/profile', icon: <User size={18} />, label: 'Profile' },
]

export default function MyListings() {
  const { profile, signOut } = useAuth()
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (profile) fetchListings()
  }, [profile])

  const fetchListings = async () => {
    const { data, error } = await backend.from('listings').select('*').eq('landlord_id', profile.id).order('created_at', { ascending: false })
    if (!error) setListings(data)
    setLoading(false)
  }

  const toggleAvailability = async (id, currentStatus) => {
    const newStatus = currentStatus === 'available' ? 'occupied' : 'available'
    const { error } = await backend.from('listings').update({ status: newStatus }).eq('id', id)
    if (!error) setListings(listings.map(l => l.id === id ? { ...l, status: newStatus } : l))
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'available': return { icon: <Circle size={10} fill="#16A34A" color="#16A34A" />, text: 'Available', color: '#16A34A', bgColor: 'rgba(22,163,74,0.1)' }
      case 'pending_review': return { icon: <Clock size={10} color="#F59E0B" />, text: 'Pending Review', color: '#F59E0B', bgColor: 'rgba(245,158,11,0.1)' }
      case 'rejected': return { icon: <Circle size={10} fill="#DC2626" color="#DC2626" />, text: 'Rejected', color: '#DC2626', bgColor: 'rgba(220,38,38,0.1)' }
      case 'pending_confirmation': return { icon: <Clock size={10} color="#F59E0B" />, text: 'Pending Confirmation', color: '#F59E0B', bgColor: 'rgba(245,158,11,0.1)' }
      case 'occupied': return { icon: <Circle size={10} fill="#DC2626" color="#DC2626" />, text: 'Occupied', color: '#DC2626', bgColor: 'rgba(220,38,38,0.1)' }
      default: return { icon: <Circle size={10} fill="#16A34A" color="#16A34A" />, text: 'Available', color: '#16A34A', bgColor: 'rgba(22,163,74,0.1)' }
    }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--beige)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'var(--text-muted)' }}>Loading...</div>
    </div>
  )

  return (
    <div className="dashboard-layout" style={{ minHeight: '100vh', background: 'var(--beige)', display: 'grid', gridTemplateColumns: '240px 1fr' }}>
      <MobileNav links={SIDEBAR_LINKS} />

      <div className="desktop-sidebar" style={{ background: 'var(--blue-dark)', padding: '2rem 1.2rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', position: 'sticky', top: 0, height: '100vh' }}>
        <Link to="/" style={{ textDecoration: 'none', marginBottom: '2rem', display: 'block' }}>
          <span style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.4rem', fontWeight: 900, color: 'white' }}>AFIT <span style={{ color: 'var(--orange)' }}>Nests</span></span>
          <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.2rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Landlord Panel</div>
        </Link>
        {SIDEBAR_LINKS.map(item => (
          <Link key={item.to} to={item.to} style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', padding: '0.75rem 1rem', borderRadius: '12px', textDecoration: 'none', background: item.active ? 'rgba(255,255,255,0.1)' : 'transparent', color: item.active ? 'white' : 'rgba(255,255,255,0.6)', fontSize: '0.88rem', fontWeight: item.active ? 600 : 400 }}>
            {item.icon} {item.label}
          </Link>
        ))}
        <div style={{ marginTop: 'auto', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--orange)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.9rem' }}>
              {profile?.full_name?.charAt(0)}
            </div>
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'white' }}>{profile?.full_name}</div>
              <div style={{ fontSize: '0.72rem', color: '#4ade80', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <BadgeCheck size={12} /> Verified
              </div>
            </div>
          </div>
          <button onClick={async () => { await signOut(); window.location.href = '/' }} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', marginTop: '0.8rem', fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', fontFamily: 'DM Sans, sans-serif', padding: 0 }}>
            <LogOut size={14} /> Logout
          </button>
        </div>
      </div>

      <div className="main-content" style={{ padding: '2.5rem', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.8rem', fontWeight: 900, color: 'var(--blue-dark)' }}>My Listings</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.2rem' }}>{listings.length} listing{listings.length !== 1 ? 's' : ''} total</p>
          </div>
          <Link to="/landlord/listings/create" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--orange)', color: 'white', padding: '0.75rem 1.5rem', borderRadius: '50px', textDecoration: 'none', fontWeight: 700, fontSize: '0.88rem', boxShadow: '0 4px 20px rgba(249,115,22,0.35)' }}>
            <Plus size={16} /> Add New Listing
          </Link>
        </div>

        {listings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
            <Home size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
            <p style={{ fontWeight: 600 }}>No listings yet</p>
            <Link to="/landlord/listings/create" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem', background: 'var(--orange)', color: 'white', padding: '0.75rem 1.5rem', borderRadius: '50px', textDecoration: 'none', fontWeight: 600, fontSize: '0.88rem' }}>
              <Plus size={16} /> Add Your First Listing
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            {listings.map(listing => {
              const badge = getStatusBadge(listing.status)
              return (
                <div className="listing-card" key={listing.id} style={{ background: 'var(--card)', borderRadius: '20px', padding: '1.8rem', border: '1px solid var(--beige-dark)', display: 'grid', gridTemplateColumns: '60px 1fr auto', gap: '1.5rem', alignItems: 'center' }}>
                  <div style={{ width: '60px', height: '60px', borderRadius: '14px', background: 'linear-gradient(135deg, var(--blue), #2A5298)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {listing.photos && listing.photos.length > 0
                      ? <img src={listing.photos[0]} alt={listing.title} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '14px' }} />
                      : <Home size={24} color="white" />
                    }
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text)', marginBottom: '0.2rem' }}>{listing.title}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.6rem' }}>{listing.type} · {listing.distance} mins from AFIT · ₦{listing.price.toLocaleString()}/yr</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.8rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.9rem', borderRadius: '50px', fontSize: '0.75rem', fontWeight: 700, background: badge.bgColor, color: badge.color }}>
                      {badge.icon} {badge.text}
                    </div>
                    <div style={{ display: 'flex', gap: '0.6rem' }}>
                      {listing.status === 'available' && (
                        <button onClick={() => toggleAvailability(listing.id, listing.status)} style={{ background: 'var(--beige)', color: 'var(--text)', padding: '0.45rem 0.9rem', borderRadius: '50px', border: '1px solid var(--beige-dark)', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                          Mark Occupied
                        </button>
                      )}
                      <Link to={`/listings/${listing.id}`} style={{ background: 'var(--blue)', color: 'white', padding: '0.45rem 0.9rem', borderRadius: '50px', fontSize: '0.78rem', fontWeight: 600, textDecoration: 'none' }}>View</Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

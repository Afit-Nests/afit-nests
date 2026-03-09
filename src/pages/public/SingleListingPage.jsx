import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import Navbar from '../../components/common/Navbar'
import Footer from '../../components/common/Footer'

const AMENITY_ICONS = {
  'Power': '⚡',
  'Water': '💧',
  'Bathroom': '🚿',
  'Kitchen': '🍳',
  'Parking': '🚗',
  'Security': '🔒',
  'Shared Bathroom': '🚿',
  'Fence': '🧱',
}

export default function SingleListingPage() {
  const { id } = useParams()
  const { user, profile } = useAuth()
  const navigate = useNavigate()

  const [listing, setListing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showViewingModal, setShowViewingModal] = useState(false)
  const [viewingForm, setViewingForm] = useState({ date: '', time: '', message: '' })
  const [viewingLoading, setViewingLoading] = useState(false)
  const [viewingSuccess, setViewingSuccess] = useState(false)
  const [currentPhoto, setCurrentPhoto] = useState(0)

  useEffect(() => {
    fetchListing()
  }, [id])

  const fetchListing = async () => {
    const { data, error } = await supabase
      .from('listings')
      .select(`
        *,
        profiles (
          id,
          full_name,
          verified,
          phone
        )
      `)
      .eq('id', id)
      .single()

    if (!error) setListing(data)
    setLoading(false)
  }

  const handleStartChat = async () => {
    if (!user) {
      navigate('/student/login')
      return
    }
    if (profile?.role !== 'student') {
      alert('Only students can start a chat')
      return
    }

    const { data: existingChat } = await supabase
      .from('chats')
      .select('id')
      .eq('student_id', profile.id)
      .eq('listing_id', listing.id)
      .single()

    if (existingChat) {
      navigate(`/student/chats?chat=${existingChat.id}`)
      return
    }

    const { data: newChat, error } = await supabase
      .from('chats')
      .insert({
        student_id: profile.id,
        landlord_id: listing.landlord_id,
        listing_id: listing.id,
      })
      .select()
      .single()

    if (!error) {
      navigate(`/student/chats?chat=${newChat.id}`)
    }
  }

  const handleBookViewing = () => {
    if (!user) {
      navigate('/student/login')
      return
    }
    if (profile?.role !== 'student') {
      alert('Only students can book viewings')
      return
    }
    setShowViewingModal(true)
  }

  const handleSubmitViewing = async () => {
    if (!viewingForm.date || !viewingForm.time) {
      alert('Please select a date and time')
      return
    }

    setViewingLoading(true)
    const { error } = await supabase.from('viewings').insert({
      student_id: profile.id,
      landlord_id: listing.landlord_id,
      listing_id: listing.id,
      date: viewingForm.date,
      time: viewingForm.time,
      message: viewingForm.message,
      status: 'pending',
    })

    if (!error) {
      setViewingSuccess(true)
      setTimeout(() => {
        setShowViewingModal(false)
        setViewingSuccess(false)
        setViewingForm({ date: '', time: '', message: '' })
      }, 2000)
    }
    setViewingLoading(false)
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--beige)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.6rem', fontWeight: 900, color: 'var(--blue)', marginBottom: '1rem' }}>
            AFIT <span style={{ color: 'var(--orange)' }}>Nests</span>
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading listing...</div>
        </div>
      </div>
    )
  }

  if (!listing) {
    return (
      <div>
        <Navbar />
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
          <div style={{ fontSize: '4rem' }}>🏚️</div>
          <h2 style={{ fontFamily: 'Playfair Display, serif', color: 'var(--blue)' }}>Listing not found</h2>
          <Link to="/listings" style={{ color: 'var(--orange)', fontWeight: 600, textDecoration: 'none' }}>← Back to Listings</Link>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div>
      <Navbar />
      <div style={{ paddingTop: '80px', minHeight: '100vh', background: 'var(--beige)' }}>

        <div style={{ padding: '1.5rem 5% 0' }}>
          <Link to="/listings" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.88rem', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            ← Back to Listings
          </Link>
        </div>

        <div className="listing-detail-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '2rem', padding: '1.5rem 5% 4rem', alignItems: 'start' }}>

          {/* LEFT */}
          <div>
            <div style={{ height: '320px', borderRadius: '24px', marginBottom: '1.5rem', position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg, var(--blue) 0%, #2A5298 100%)' }}>
  {listing.photos && listing.photos.length > 0 ? (
    <>
      <img src={listing.photos[currentPhoto]} alt={`Photo ${currentPhoto + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      {listing.photos.length > 1 && (
        <>
          <button onClick={() => setCurrentPhoto(p => p === 0 ? listing.photos.length - 1 : p - 1)} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.4)', color: 'white', border: 'none', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
          <button onClick={() => setCurrentPhoto(p => p === listing.photos.length - 1 ? 0 : p + 1)} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.4)', color: 'white', border: 'none', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
          <div style={{ position: 'absolute', bottom: '1rem', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '0.4rem' }}>
            {listing.photos.map((_, i) => (
              <button key={i} onClick={() => setCurrentPhoto(i)} style={{ width: i === currentPhoto ? '20px' : '8px', height: '8px', borderRadius: '50px', background: i === currentPhoto ? 'white' : 'rgba(255,255,255,0.5)', border: 'none', cursor: 'pointer', transition: 'all 0.2s', padding: 0 }} />
            ))}
          </div>
        </>
      )}
    </>
  ) : (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '6rem' }}>🏠</div>
  )}
  {!listing.available && (
    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '1.2rem' }}>
      Not Currently Available
    </div>
  )}
  {listing.available && (
    <div style={{ position: 'absolute', top: '1rem', left: '1rem', background: 'var(--orange)', color: 'white', fontSize: '0.78rem', fontWeight: 700, padding: '0.35rem 0.9rem', borderRadius: '50px' }}>
      Available Now
    </div>
  )}
</div>

            <div style={{ background: 'var(--card)', borderRadius: '20px', padding: '1.8rem', border: '1px solid var(--beige-dark)', marginBottom: '1.2rem' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--orange)', marginBottom: '0.5rem' }}>
                {listing.type}
              </div>
              <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.8rem', fontWeight: 900, color: 'var(--blue-dark)', marginBottom: '0.8rem' }}>
                {listing.title}
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.8rem', fontWeight: 900, color: 'var(--blue)' }}>
                  ₦{listing.price.toLocaleString()}
                  <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.85rem', fontWeight: 400, color: 'var(--text-muted)' }}> / year</span>
                </div>
                <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                  📍 Barkallahu · {listing.distance} mins from AFIT
                </div>
              </div>
            </div>

            {listing.description && (
              <div style={{ background: 'var(--card)', borderRadius: '20px', padding: '1.8rem', border: '1px solid var(--beige-dark)', marginBottom: '1.2rem' }}>
                <h3 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--blue)', marginBottom: '0.8rem' }}>About this Property</h3>
                <p style={{ color: 'var(--text-muted)', lineHeight: 1.7, fontSize: '0.95rem' }}>{listing.description}</p>
              </div>
            )}

            {listing.amenities && listing.amenities.length > 0 && (
              <div style={{ background: 'var(--card)', borderRadius: '20px', padding: '1.8rem', border: '1px solid var(--beige-dark)' }}>
                <h3 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--blue)', marginBottom: '1rem' }}>Amenities</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.8rem' }}>
                  {listing.amenities.map(amenity => (
                    <div key={amenity} style={{
                      display: 'flex', alignItems: 'center', gap: '0.5rem',
                      background: 'var(--beige)', border: '1px solid var(--beige-dark)',
                      padding: '0.5rem 1rem', borderRadius: '50px',
                      fontSize: '0.85rem', fontWeight: 500,
                    }}>
                      {AMENITY_ICONS[amenity] || '✓'} {amenity}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT */}
          <div className="listing-sticky-panel" style={{ position: 'sticky', top: '100px', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>

            <div style={{ background: 'var(--card)', borderRadius: '20px', padding: '1.8rem', border: '1px solid var(--beige-dark)' }}>
              <h3 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--blue)', marginBottom: '1.2rem' }}>Landlord</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.2rem' }}>
                <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '1.4rem', fontWeight: 700, fontFamily: 'Playfair Display, serif' }}>
                  {listing.profiles?.full_name?.charAt(0) || 'L'}
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)' }}>
                  {listing.profiles?.full_name || 'Landlord'}
                </div>
              </div>

              {listing.profiles?.verified ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.2)', borderRadius: '12px', padding: '0.7rem 1rem', fontSize: '0.82rem', color: '#16A34A', fontWeight: 600, marginBottom: '1.2rem' }}>
                  ✅ Verified by AFIT Nests team
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)', borderRadius: '12px', padding: '0.7rem 1rem', fontSize: '0.82rem', color: 'var(--orange)', fontWeight: 600, marginBottom: '1.2rem' }}>
                  ⏳ Verification Pending
                </div>
              )}

              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Contact details are shared only after a viewing is confirmed.
              </p>
            </div>

            {listing.available ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                <button onClick={handleStartChat} style={{ background: 'var(--orange)', color: 'white', padding: '0.9rem', borderRadius: '50px', fontWeight: 700, fontSize: '0.95rem', border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', width: '100%', boxShadow: '0 4px 20px rgba(249,115,22,0.35)' }}>
                  💬 Chat with Landlord
                </button>
                <button onClick={handleBookViewing} style={{ background: 'var(--blue)', color: 'white', padding: '0.9rem', borderRadius: '50px', fontWeight: 700, fontSize: '0.95rem', border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', width: '100%' }}>
                  📅 Book a Viewing
                </button>
              </div>
            ) : (
              <div style={{ background: 'var(--beige)', border: '1px solid var(--beige-dark)', borderRadius: '16px', padding: '1.2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.88rem', fontWeight: 500 }}>
                This property is not currently available
              </div>
            )}

            <Link to="/listings" style={{ textAlign: 'center', color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 500 }}>
              ← Back to all listings
            </Link>
          </div>
        </div>
      </div>
      <Footer />

      {/* Viewing Modal */}
      {showViewingModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ background: 'var(--card)', borderRadius: '24px', padding: '2rem', width: '100%', maxWidth: '420px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.4rem', fontWeight: 900, color: 'var(--blue-dark)', marginBottom: '0.3rem' }}>
              Book a Viewing
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>{listing.title}</p>

            {viewingSuccess ? (
              <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
                <p style={{ fontWeight: 700, color: '#16A34A', fontSize: '1rem' }}>Viewing request sent!</p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.3rem' }}>The landlord will confirm shortly.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={labelStyle}>Preferred Date</label>
                  <input type="date" value={viewingForm.date} onChange={e => setViewingForm({ ...viewingForm, date: e.target.value })} style={inputStyle} min={new Date().toISOString().split('T')[0]} />
                </div>
                <div>
                  <label style={labelStyle}>Preferred Time</label>
                  <select value={viewingForm.time} onChange={e => setViewingForm({ ...viewingForm, time: e.target.value })} style={inputStyle}>
                    <option value="">Select a time</option>
                    <option>8:00 AM</option>
                    <option>9:00 AM</option>
                    <option>10:00 AM</option>
                    <option>11:00 AM</option>
                    <option>12:00 PM</option>
                    <option>1:00 PM</option>
                    <option>2:00 PM</option>
                    <option>3:00 PM</option>
                    <option>4:00 PM</option>
                    <option>5:00 PM</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Message (Optional)</label>
                  <textarea value={viewingForm.message} onChange={e => setViewingForm({ ...viewingForm, message: e.target.value })} placeholder="Any special requests or questions..." rows={3} style={{ ...inputStyle, resize: 'none' }} />
                </div>
                <div style={{ display: 'flex', gap: '0.8rem', marginTop: '0.5rem' }}>
                  <button onClick={() => setShowViewingModal(false)} style={{ flex: 1, background: 'var(--beige)', color: 'var(--text)', padding: '0.9rem', borderRadius: '50px', fontWeight: 600, fontSize: '0.9rem', border: '1px solid var(--beige-dark)', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                    Cancel
                  </button>
                  <button onClick={handleSubmitViewing} disabled={viewingLoading} style={{ flex: 1, background: 'var(--blue)', color: 'white', padding: '0.9rem', borderRadius: '50px', fontWeight: 700, fontSize: '0.9rem', border: 'none', cursor: viewingLoading ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                    {viewingLoading ? 'Sending...' : 'Send Request'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const labelStyle = {
  display: 'block', fontSize: '0.82rem', fontWeight: 700,
  color: 'var(--text)', marginBottom: '0.4rem',
  textTransform: 'uppercase', letterSpacing: '0.5px',
}

const inputStyle = {
  width: '100%', padding: '0.75rem 1rem', borderRadius: '12px',
  border: '1px solid var(--beige-dark)', background: 'var(--beige)',
  fontSize: '0.9rem', color: 'var(--text)',
  fontFamily: 'DM Sans, sans-serif', outline: 'none',
  boxSizing: 'border-box',
}
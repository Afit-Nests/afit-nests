import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { backend } from '../../lib/personalBackendClient'
import { api } from '../../lib/apiClient'
import { useAuth } from '../../context/AuthContext'
import { startAccommodationPayment } from '../../lib/paystack'
import { MapPin, MessageSquare, Calendar, CreditCard, BadgeCheck, Clock, Circle, ChevronLeft, ChevronRight, Home, CheckCircle, Zap, Droplets, ShowerHead, ChefHat, Car, Lock, Fence, Heart, Star } from 'lucide-react'
import Navbar from '../../components/common/Navbar'
import Footer from '../../components/common/Footer'
import { toast } from 'react-hot-toast'

const AMENITY_ICONS = {
  'Power': <Zap size={15} />,
  'Water': <Droplets size={15} />,
  'Bathroom': <ShowerHead size={15} />,
  'Kitchen': <ChefHat size={15} />,
  'Parking': <Car size={15} />,
  'Security': <Lock size={15} />,
  'Shared Bathroom': <ShowerHead size={15} />,
  'Fence': <Fence size={15} />,
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
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [reviews, setReviews] = useState([])
  const [availability, setAvailability] = useState([])

  useEffect(() => { fetchListing() }, [id])

  const fetchListing = async () => {
    const { data, error } = await backend
      .from('listings')
      .select(`*, profiles (id, full_name, verified, phone)`)
      .eq('id', id)
      .single()
    if (!error) setListing(data)
    api.engagement.reviews(id).then(result => setReviews(result.reviews || [])).catch(() => null)
    api.engagement.availability(id).then(result => setAvailability(result.availability || [])).catch(() => null)
    if (profile?.role === 'student') {
      api.engagement.savedListings()
        .then(result => setSaved((result.listings || []).some(item => item.id === id)))
        .catch(() => null)
    }
    setLoading(false)
  }

  const toggleSaved = async () => {
    if (!user) { navigate('/student/login'); return }
    if (profile?.role !== 'student') { alert('Only students can save listings'); return }
    if (saved) {
      await api.engagement.unsaveListing(listing.id)
      setSaved(false)
    } else {
      await api.engagement.saveListing(listing.id)
      setSaved(true)
    }
  }

  const handleStartChat = async () => {
    if (!user) { navigate('/student/login'); return }
    if (profile?.role !== 'student') { toast.error('Only students can start a chat'); return }
    const { data: existingChat } = await backend.from('chats').select('id').eq('student_id', profile.id).eq('listing_id', listing.id).single()
    if (existingChat) { navigate(`/student/chats?chat=${existingChat.id}`); return }
    const { data: newChat, error } = await backend.from('chats').insert({ student_id: profile.id, landlord_id: listing.landlord_id, listing_id: listing.id }).select().single()
    if (!error) navigate(`/student/chats?chat=${newChat.id}`)
  }

  const handleBookViewing = () => {
    if (!user) { navigate('/student/login'); return }
    if (profile?.role !== 'student') { toast.error('Only students can book viewings'); return }
    setShowViewingModal(true)
  }

  const handleSubmitViewing = async () => {
    if (!viewingForm.date || !viewingForm.time) { toast.error('Please select a date and time'); return }
    setViewingLoading(true)
    const { error } = await backend.from('viewings').insert({ student_id: profile.id, landlord_id: listing.landlord_id, listing_id: listing.id, date: viewingForm.date, time: viewingForm.time, message: viewingForm.message, status: 'pending' })
    if (!error) {
      toast.success('Viewing request sent!')
      setViewingSuccess(true)
      setTimeout(() => { setShowViewingModal(false); setViewingSuccess(false); setViewingForm({ date: '', time: '', message: '' }) }, 2000)
    }
    setViewingLoading(false)
  }

  const handlePayment = async () => {
    if (!user) { navigate('/student/login'); return }
    if (profile?.role !== 'student') { toast.error('Only students can pay for accommodation'); return }
    setPaymentLoading(true)
    try {
      await startAccommodationPayment({
        listing,
        student: profile,
        email: profile.email || user.email,
      })
      await fetchListing()
    } catch (error) {
      toast.error(error.message || 'Payment failed. Please try again.')
    } finally {
      setPaymentLoading(false)
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'available': return { icon: <Circle size={10} fill="#16A34A" color="#16A34A" />, text: 'Available', color: '#16A34A', bg: 'var(--orange)' }
      case 'pending_confirmation': return { icon: <Clock size={10} color="#F59E0B" />, text: 'Pending Confirmation', color: '#F59E0B', bg: '#F59E0B' }
      case 'occupied': return { icon: <Circle size={10} fill="#DC2626" color="#DC2626" />, text: 'Occupied', color: '#DC2626', bg: '#DC2626' }
      default: return { icon: <Circle size={10} fill="#16A34A" color="#16A34A" />, text: 'Available', color: '#16A34A', bg: 'var(--orange)' }
    }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--beige)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.6rem', fontWeight: 900, color: 'var(--blue)', marginBottom: '1rem' }}>
          AFIT <span style={{ color: 'var(--orange)' }}>Nests</span>
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading listing...</div>
      </div>
    </div>
  )

  if (!listing) return (
    <div>
      <Navbar />
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
        <Home size={64} color="var(--beige-dark)" />
        <h2 style={{ fontFamily: 'Playfair Display, serif', color: 'var(--blue)' }}>Listing not found</h2>
        <Link to="/listings" style={{ color: 'var(--orange)', fontWeight: 600, textDecoration: 'none' }}>← Back to Listings</Link>
      </div>
      <Footer />
    </div>
  )

  const badge = getStatusBadge(listing.status)

  return (
    <div>
      <Navbar />
      <div style={{ paddingTop: '80px', minHeight: '100vh', background: 'var(--beige)' }}>
        <div style={{ padding: '1.5rem 5% 0' }}>
          <Link to="/listings" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.88rem', fontWeight: 500 }}>
            <ChevronLeft size={16} /> Back to Listings
          </Link>
        </div>

        <div className="listing-detail-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '2rem', padding: '1.5rem 5% 4rem', alignItems: 'start' }}>
          <div>
            {/* Carousel */}
            <div style={{ height: '320px', borderRadius: '24px', marginBottom: '1.5rem', position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg, var(--blue) 0%, #2A5298 100%)' }}>
              {listing.photos && listing.photos.length > 0 ? (
                <>
                  <img src={listing.photos[currentPhoto]} alt={`Photo ${currentPhoto + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  {listing.photos.length > 1 && (
                    <>
                      <button onClick={() => setCurrentPhoto(p => p === 0 ? listing.photos.length - 1 : p - 1)} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.4)', color: 'white', border: 'none', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ChevronLeft size={20} />
                      </button>
                      <button onClick={() => setCurrentPhoto(p => p === listing.photos.length - 1 ? 0 : p + 1)} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.4)', color: 'white', border: 'none', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ChevronRight size={20} />
                      </button>
                      <div style={{ position: 'absolute', bottom: '1rem', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '0.4rem' }}>
                        {listing.photos.map((_, i) => (
                          <button key={i} onClick={() => setCurrentPhoto(i)} style={{ width: i === currentPhoto ? '20px' : '8px', height: '8px', borderRadius: '50px', background: i === currentPhoto ? 'white' : 'rgba(255,255,255,0.5)', border: 'none', cursor: 'pointer', transition: 'width var(--duration-panel) var(--ease-out), background-color var(--duration-panel) ease', padding: 0 }} />
                        ))}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Home size={80} color="rgba(255,255,255,0.2)" />
                </div>
              )}
              {listing.status && (
                <div style={{ position: 'absolute', top: '1rem', left: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', background: badge.bg, color: 'white', fontSize: '0.78rem', fontWeight: 700, padding: '0.35rem 0.9rem', borderRadius: '50px' }}>
                  {badge.icon} {badge.text}
                </div>
              )}
            </div>

            <div style={{ background: 'var(--card)', borderRadius: '20px', padding: '1.8rem', border: '1px solid var(--beige-dark)', marginBottom: '1.2rem' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--orange)', marginBottom: '0.5rem' }}>{listing.type}</div>
              <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.8rem', fontWeight: 900, color: 'var(--blue-dark)', marginBottom: '0.8rem' }}>{listing.title}</h1>
              <button onClick={toggleSaved} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', background: saved ? 'rgba(249,115,22,0.1)' : 'var(--beige)', color: saved ? 'var(--orange)' : 'var(--text)', border: '1px solid var(--beige-dark)', borderRadius: '50px', padding: '0.45rem 0.9rem', fontWeight: 700, cursor: 'pointer', marginBottom: '0.8rem' }}>
                <Heart size={16} fill={saved ? 'currentColor' : 'none'} /> {saved ? 'Saved' : 'Save Listing'}
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.8rem', fontWeight: 900, color: 'var(--blue)' }}>
                  ₦{listing.price.toLocaleString()}
                  <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.85rem', fontWeight: 400, color: 'var(--text-muted)' }}> / year</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                  <MapPin size={14} /> Barkallahu · {listing.distance} mins from AFIT
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
                    <div key={amenity} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--beige)', border: '1px solid var(--beige-dark)', padding: '0.5rem 1rem', borderRadius: '50px', fontSize: '0.85rem', fontWeight: 500 }}>
                      {AMENITY_ICONS[amenity] || <CheckCircle size={15} />} {amenity}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ background: 'var(--card)', borderRadius: '20px', padding: '1.8rem', border: '1px solid var(--beige-dark)', marginTop: '1.2rem' }}>
              <h3 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--blue)', marginBottom: '1rem' }}>Viewing Availability</h3>
              {availability.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No fixed viewing schedule has been published yet.</p>
              ) : availability.map(slot => (
                <div key={slot.id} style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.45rem' }}>
                  Day {slot.weekday}: {String(slot.start_time).slice(0, 5)} - {String(slot.end_time).slice(0, 5)}
                </div>
              ))}
            </div>

            <div style={{ background: 'var(--card)', borderRadius: '20px', padding: '1.8rem', border: '1px solid var(--beige-dark)', marginTop: '1.2rem' }}>
              <h3 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--blue)', marginBottom: '1rem' }}>Reviews</h3>
              {reviews.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No student reviews yet.</p>
              ) : reviews.map(review => (
                <div key={review.id} style={{ borderTop: '1px solid var(--beige-dark)', paddingTop: '0.8rem', marginTop: '0.8rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--orange)', fontWeight: 800 }}>
                    <Star size={15} fill="currentColor" /> {review.rating}/5
                  </div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.35rem' }}>{review.comment || 'No comment added.'}</p>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT */}
          <div className="listing-sticky-panel" style={{ position: 'sticky', top: '100px', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            <div style={{ background: 'var(--card)', borderRadius: '20px', padding: '1.8rem', border: '1px solid var(--beige-dark)' }}>
              <h3 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--blue)', marginBottom: '1.2rem' }}>Landlord</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.2rem' }}>
                <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '1.4rem', fontWeight: 700, fontFamily: 'Playfair Display, serif' }}>
                  {listing.profiles?.full_name?.charAt(0) || 'L'}
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)' }}>{listing.profiles?.full_name || 'Landlord'}</div>
              </div>
              {listing.profiles?.verified ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.2)', borderRadius: '12px', padding: '0.7rem 1rem', fontSize: '0.82rem', color: '#16A34A', fontWeight: 600, marginBottom: '1.2rem' }}>
                  <BadgeCheck size={15} /> Verified by AFIT Nests team
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)', borderRadius: '12px', padding: '0.7rem 1rem', fontSize: '0.82rem', color: 'var(--orange)', fontWeight: 600, marginBottom: '1.2rem' }}>
                  <Clock size={15} /> Verification Pending
                </div>
              )}
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>Contact details are shared only after a viewing is confirmed.</p>
            </div>

            {listing.status === 'available' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                <button onClick={handlePayment} disabled={paymentLoading} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: paymentLoading ? 'var(--text-muted)' : 'var(--orange)', color: 'white', padding: '0.9rem', borderRadius: '50px', fontWeight: 700, fontSize: '0.95rem', border: 'none', cursor: paymentLoading ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif', width: '100%', boxShadow: paymentLoading ? 'none' : '0 4px 20px rgba(249,115,22,0.35)' }}>
                  <CreditCard size={18} /> {paymentLoading ? 'Processing...' : 'Pay for Accommodation'}
                </button>
                <button onClick={handleStartChat} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: 'var(--blue)', color: 'white', padding: '0.9rem', borderRadius: '50px', fontWeight: 700, fontSize: '0.95rem', border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', width: '100%' }}>
                  <MessageSquare size={18} /> Chat with Landlord
                </button>
                <button onClick={handleBookViewing} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: 'var(--beige)', color: 'var(--text)', padding: '0.9rem', borderRadius: '50px', fontWeight: 700, fontSize: '0.95rem', border: '1px solid var(--beige-dark)', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', width: '100%' }}>
                  <Calendar size={18} /> Book a Viewing
                </button>
              </div>
            ) : listing.status === 'pending_confirmation' ? (
              <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '16px', padding: '1.2rem', textAlign: 'center' }}>
                <Clock size={28} color="#F59E0B" style={{ margin: '0 auto 0.5rem' }} />
                <div style={{ fontWeight: 700, marginBottom: '0.3rem', color: '#F59E0B' }}>Pending Confirmation</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>A payment has been received and is currently being reviewed.</div>
              </div>
            ) : listing.status === 'occupied' ? (
              <div style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: '16px', padding: '1.2rem', textAlign: 'center' }}>
                <Home size={28} color="#DC2626" style={{ margin: '0 auto 0.5rem' }} />
                <div style={{ fontWeight: 700, marginBottom: '0.3rem', color: '#DC2626' }}>Occupied</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>This accommodation is no longer available.</div>
              </div>
            ) : null}

            <Link to="/listings" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', textAlign: 'center', color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 500 }}>
              <ChevronLeft size={14} /> Back to all listings
            </Link>
          </div>
        </div>
      </div>
      <Footer />

      {/* Viewing Modal */}
      {showViewingModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ background: 'var(--card)', borderRadius: '24px', padding: '2rem', width: '100%', maxWidth: '420px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.4rem', fontWeight: 900, color: 'var(--blue-dark)', marginBottom: '0.3rem' }}>Book a Viewing</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>{listing.title}</p>
            {viewingSuccess ? (
              <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                <CheckCircle size={48} color="#16A34A" style={{ margin: '0 auto 1rem' }} />
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
                    {['8:00 AM','9:00 AM','10:00 AM','11:00 AM','12:00 PM','1:00 PM','2:00 PM','3:00 PM','4:00 PM','5:00 PM'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Message (Optional)</label>
                  <textarea value={viewingForm.message} onChange={e => setViewingForm({ ...viewingForm, message: e.target.value })} placeholder="Any special requests or questions..." rows={3} style={{ ...inputStyle, resize: 'none' }} />
                </div>
                <div style={{ display: 'flex', gap: '0.8rem', marginTop: '0.5rem' }}>
                  <button onClick={() => setShowViewingModal(false)} style={{ flex: 1, background: 'var(--beige)', color: 'var(--text)', padding: '0.9rem', borderRadius: '50px', fontWeight: 600, fontSize: '0.9rem', border: '1px solid var(--beige-dark)', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>Cancel</button>
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

const labelStyle = { display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.5px' }
const inputStyle = { width: '100%', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid var(--beige-dark)', background: 'var(--beige)', fontSize: '0.9rem', color: 'var(--text)', fontFamily: 'DM Sans, sans-serif', outline: 'none', boxSizing: 'border-box' }

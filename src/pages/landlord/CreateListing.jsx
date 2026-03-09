import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import MobileNav from '../../components/common/MobileNav'

const SIDEBAR_LINKS = [
  { to: '/landlord/dashboard', icon: '📊', label: 'Dashboard' },
  { to: '/landlord/chats', icon: '💬', label: 'Chats' },
  { to: '/landlord/listings', icon: '🏠', label: 'My Listings' },
  { to: '/landlord/listings/create', icon: '➕', label: 'Add Listing', active: true },
  { to: '/landlord/viewings', icon: '📅', label: 'Viewing Requests' },
  { to: '/landlord/profile', icon: '👤', label: 'Profile' },
]

const AMENITY_OPTIONS = ['Power', 'Water', 'Bathroom', 'Kitchen', 'Parking', 'Security', 'Shared Bathroom', 'Fence']

export default function CreateListing() {
  const navigate = useNavigate()
  const { profile, signOut } = useAuth()
  const [form, setForm] = useState({ title: '', type: '', price: '', distance: '', description: '', address: '' })
  const [amenities, setAmenities] = useState([])
  const [photos, setPhotos] = useState([]) // File objects
  const [photoPreviews, setPhotoPreviews] = useState([]) // Preview URLs
  const [submitted, setSubmitted] = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })
  const toggleAmenity = (amenity) => setAmenities(prev => prev.includes(amenity) ? prev.filter(a => a !== amenity) : [...prev, amenity])

  const handlePhotoSelect = (e) => {
    const files = Array.from(e.target.files)
    const remaining = 5 - photos.length
    const selected = files.slice(0, remaining)

    setPhotos(prev => [...prev, ...selected])
    const previews = selected.map(f => URL.createObjectURL(f))
    setPhotoPreviews(prev => [...prev, ...previews])
  }

  const removePhoto = (index) => {
    setPhotos(prev => prev.filter((_, i) => i !== index))
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index))
  }

  const uploadPhotos = async (listingId) => {
    const urls = []
    for (let i = 0; i < photos.length; i++) {
      setUploadProgress(`Uploading photo ${i + 1} of ${photos.length}...`)
      const file = photos[i]
      const ext = file.name.split('.').pop()
      const path = `${listingId}/${Date.now()}_${i}.${ext}`
      const { error } = await supabase.storage.from('listings').upload(path, file)
      if (!error) {
        const { data } = supabase.storage.from('listings').getPublicUrl(path)
        urls.push(data.publicUrl)
      }
    }
    return urls
  }

  const handleSubmit = async () => {
    if (!form.title || !form.type || !form.price || !form.distance || !form.address) {
      alert('Please fill in all required fields')
      return
    }
    setSubmitted(true)

    // Insert listing first to get the ID
    const { data: listing, error } = await supabase.from('listings').insert({
      landlord_id: profile.id,
      title: form.title, type: form.type,
      price: Number(form.price), distance: Number(form.distance),
      description: form.description, address: form.address,
      amenities, available: true,
      photos: [],
    }).select().single()

    if (error) { alert('Error: ' + error.message); setSubmitted(false); return }

    // Upload photos and update listing
    if (photos.length > 0) {
      const photoUrls = await uploadPhotos(listing.id)
      await supabase.from('listings').update({ photos: photoUrls }).eq('id', listing.id)
    }

    setUploadProgress('')
    setTimeout(() => navigate('/landlord/listings'), 1500)
  }

  return (
    <div className="dashboard-layout" style={{ minHeight: '100vh', background: 'var(--beige)', display: 'grid', gridTemplateColumns: '240px 1fr' }}>

      <MobileNav links={SIDEBAR_LINKS} />

      <div className="desktop-sidebar" style={{ background: 'var(--blue-dark)', padding: '2rem 1.2rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', position: 'sticky', top: 0, height: '100vh' }}>
        <Link to="/" style={{ textDecoration: 'none', marginBottom: '2rem', display: 'block' }}>
          <span style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.4rem', fontWeight: 900, color: 'white' }}>AFIT <span style={{ color: 'var(--orange)' }}>Nests</span></span>
          <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.2rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Landlord Panel</div>
        </Link>
        {SIDEBAR_LINKS.map(item => (
          <Link key={item.to} to={item.to} style={{ display: 'flex', alignItems: 'center', padding: '0.75rem 1rem', borderRadius: '12px', textDecoration: 'none', background: item.active ? 'rgba(255,255,255,0.1)' : 'transparent', color: item.active ? 'white' : 'rgba(255,255,255,0.6)', fontSize: '0.88rem', fontWeight: item.active ? 600 : 400, gap: '0.7rem' }}>
            {item.icon} {item.label}
          </Link>
        ))}
        <div style={{ marginTop: 'auto', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'white', marginBottom: '0.5rem' }}>{profile?.full_name}</div>
          <button onClick={async () => { await signOut(); window.location.href = '/' }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', fontFamily: 'DM Sans, sans-serif', padding: 0 }}>🚪 Logout</button>
        </div>
      </div>

      <div className="main-content" style={{ padding: '2.5rem', overflowY: 'auto' }}>
        <div style={{ marginBottom: '2rem' }}>
          <Link to="/landlord/listings" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.88rem' }}>← Back to My Listings</Link>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.8rem', fontWeight: 900, color: 'var(--blue-dark)', marginTop: '0.5rem' }}>Add New Listing</h1>
        </div>

        {submitted && (
          <div style={{ background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.2)', borderRadius: '16px', padding: '1.2rem 1.5rem', marginBottom: '1.5rem', color: '#16A34A', fontWeight: 600 }}>
            ✅ {uploadProgress || 'Listing submitted! Redirecting...'}
          </div>
        )}

        <div className="create-listing-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '1.5rem', alignItems: 'start' }}>
          <div style={{ background: 'var(--card)', borderRadius: '20px', padding: '2rem', border: '1px solid var(--beige-dark)', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>

            <div>
              <label style={labelStyle}>Listing Title</label>
              <input name="title" value={form.title} onChange={handleChange} placeholder="e.g. 2-Bedroom Self Contain" style={inputStyle} />
            </div>

            <div className="listing-form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>Room Type</label>
                <select name="type" value={form.type} onChange={handleChange} style={inputStyle}>
                  <option value="">Select type</option>
                  <option>Single Room</option>
                  <option>Self Contain</option>
                  <option>Mini Flat</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Annual Rent (₦)</label>
                <input name="price" type="number" value={form.price} onChange={handleChange} placeholder="e.g. 60000" style={inputStyle} />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Distance from AFIT (minutes walk)</label>
              <input name="distance" type="number" value={form.distance} onChange={handleChange} placeholder="e.g. 5" style={inputStyle} />
            </div>

            <div>
              <label style={labelStyle}>Property Address</label>
              <input name="address" value={form.address} onChange={handleChange} placeholder="Full address in Barkallahu" style={inputStyle} />
            </div>

            <div>
              <label style={labelStyle}>Description</label>
              <textarea name="description" value={form.description} onChange={handleChange} placeholder="Describe the property..." rows={4} style={{ ...inputStyle, resize: 'vertical' }} />
            </div>

            {/* Photo Upload */}
            <div>
              <label style={labelStyle}>Property Photos (up to 5)</label>
              <div style={{ marginTop: '0.4rem' }}>

                {/* Preview Grid */}
                {photoPreviews.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.6rem', marginBottom: '0.8rem' }}>
                    {photoPreviews.map((preview, index) => (
                      <div key={index} style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', aspectRatio: '1' }}>
                        <img src={preview} alt={`Photo ${index + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button
                          onClick={() => removePhoto(index)}
                          style={{
                            position: 'absolute', top: '0.3rem', right: '0.3rem',
                            background: 'rgba(0,0,0,0.6)', color: 'white',
                            border: 'none', borderRadius: '50%', width: '22px', height: '22px',
                            cursor: 'pointer', fontSize: '0.7rem', display: 'flex',
                            alignItems: 'center', justifyContent: 'center',
                          }}
                        >✕</button>
                        {index === 0 && (
                          <div style={{ position: 'absolute', bottom: '0.3rem', left: '0.3rem', background: 'var(--orange)', color: 'white', fontSize: '0.6rem', fontWeight: 700, padding: '0.15rem 0.4rem', borderRadius: '4px' }}>
                            MAIN
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload Button */}
                {photos.length < 5 && (
                  <label style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: '0.6rem', padding: '1rem', borderRadius: '12px',
                    border: '2px dashed var(--beige-dark)', cursor: 'pointer',
                    color: 'var(--text-muted)', fontSize: '0.88rem', fontWeight: 500,
                    background: 'var(--beige)', transition: 'all 0.2s',
                  }}>
                    📷 {photoPreviews.length === 0 ? 'Upload Photos' : `Add More (${5 - photos.length} left)`}
                    <input type="file" accept="image/*" multiple onChange={handlePhotoSelect} style={{ display: 'none' }} />
                  </label>
                )}
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                  First photo will be the main display image. Max 5 photos.
                </p>
              </div>
            </div>

            <div>
              <label style={labelStyle}>Amenities</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', marginTop: '0.4rem' }}>
                {AMENITY_OPTIONS.map(amenity => (
                  <button key={amenity} onClick={() => toggleAmenity(amenity)} style={{ padding: '0.45rem 1rem', borderRadius: '50px', border: `1px solid ${amenities.includes(amenity) ? 'var(--blue)' : 'var(--beige-dark)'}`, background: amenities.includes(amenity) ? 'var(--blue)' : 'var(--beige)', color: amenities.includes(amenity) ? 'white' : 'var(--text)', fontSize: '0.82rem', fontWeight: 500, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                    {amenity}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={handleSubmit} disabled={submitted} style={{ background: submitted ? 'var(--text-muted)' : 'var(--orange)', color: 'white', padding: '0.9rem', borderRadius: '50px', fontWeight: 700, fontSize: '1rem', border: 'none', cursor: submitted ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif', boxShadow: submitted ? 'none' : '0 4px 20px rgba(249,115,22,0.35)' }}>
              {submitted ? uploadProgress || 'Submitting...' : 'Submit Listing'}
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ background: 'var(--blue)', borderRadius: '20px', padding: '1.8rem' }}>
              <h4 style={{ fontWeight: 700, color: 'white', fontSize: '0.95rem', marginBottom: '1rem' }}>💡 Listing Tips</h4>
              {['Upload clear photos of the property', 'Use a clear descriptive title', 'Be honest about the distance from AFIT', 'List all available amenities', 'Write a detailed description', 'Set a fair competitive price'].map((tip, i) => (
                <div key={i} style={{ display: 'flex', gap: '0.6rem', marginBottom: '0.6rem', fontSize: '0.82rem', color: 'rgba(255,255,255,0.75)' }}>
                  <span style={{ color: 'var(--orange)', fontWeight: 700 }}>✓</span>{tip}
                </div>
              ))}
            </div>
            <div style={{ background: 'var(--card)', borderRadius: '20px', padding: '1.5rem', border: '1px solid var(--beige-dark)' }}>
              <h4 style={{ fontWeight: 700, color: 'var(--blue)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>📋 After Submitting</h4>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>Your listing will be reviewed and go live within 24 hours.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const labelStyle = { display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.5px' }
const inputStyle = { width: '100%', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid var(--beige-dark)', background: 'var(--card)', fontSize: '0.9rem', color: 'var(--text)', fontFamily: 'DM Sans, sans-serif', outline: 'none', boxSizing: 'border-box' }
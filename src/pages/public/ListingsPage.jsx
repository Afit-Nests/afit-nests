import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import Navbar from '../../components/common/Navbar'
import Footer from '../../components/common/Footer'
import { supabase } from '../../lib/supabase'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const ROOM_TYPES = ['All', 'Single Room', 'Self Contain', 'Mini Flat']

export default function ListingsPage() {
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedType, setSelectedType] = useState('All')
  const [maxPrice, setMaxPrice] = useState(150000)
  const [maxDistance, setMaxDistance] = useState(60)
  const [selectedId, setSelectedId] = useState(null)
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    fetchListings()
  }, [])

  const fetchListings = async () => {
    const { data, error } = await supabase
      .from('listings')
      .select(`*, profiles (full_name, verified)`)
      .eq('available', true)
      .order('created_at', { ascending: false })
    if (!error) setListings(data)
    setLoading(false)
  }

  const filtered = listings.filter(l => {
    const typeMatch = selectedType === 'All' || l.type === selectedType
    const priceMatch = l.price <= maxPrice
    const distanceMatch = !l.distance || l.distance <= maxDistance
    return typeMatch && priceMatch && distanceMatch
  })

  const resetFilters = () => {
    setSelectedType('All')
    setMaxPrice(150000)
    setMaxDistance(60)
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--beige)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.6rem', fontWeight: 900, color: 'var(--blue)', marginBottom: '1rem' }}>
            AFIT <span style={{ color: 'var(--orange)' }}>Nests</span>
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading listings...</div>
        </div>
      </div>
    )
  }

  const FiltersContent = () => (
    <>
      <h3 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--blue)', marginBottom: '1.5rem' }}>🔍 Filters</h3>

      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text)', display: 'block', marginBottom: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Room Type
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {ROOM_TYPES.map(type => (
            <button key={type} onClick={() => setSelectedType(type)} style={{
              background: selectedType === type ? 'var(--blue)' : 'transparent',
              color: selectedType === type ? 'white' : 'var(--text)',
              border: `1px solid ${selectedType === type ? 'var(--blue)' : 'var(--beige-dark)'}`,
              padding: '0.5rem 1rem', borderRadius: '50px', fontSize: '0.85rem',
              fontWeight: 500, cursor: 'pointer', textAlign: 'left',
              fontFamily: 'DM Sans, sans-serif', transition: 'all 0.2s',
            }}>
              {type}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text)', display: 'block', marginBottom: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Max Price
        </label>
        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--blue)', fontFamily: 'Playfair Display, serif', marginBottom: '0.6rem' }}>
          ₦{maxPrice.toLocaleString()}
        </div>
        <input type="range" min={20000} max={150000} step={5000} value={maxPrice} onChange={e => setMaxPrice(Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--orange)' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
          <span>₦20k</span><span>₦150k</span>
        </div>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text)', display: 'block', marginBottom: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Max Distance from AFIT
        </label>
        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--blue)', fontFamily: 'Playfair Display, serif', marginBottom: '0.6rem' }}>
          {maxDistance} mins walk
        </div>
        <input type="range" min={1} max={60} step={1} value={maxDistance} onChange={e => setMaxDistance(Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--orange)' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
          <span>1 min</span><span>60 mins</span>
        </div>
      </div>

      <button onClick={resetFilters} style={{
        width: '100%', background: 'transparent', color: 'var(--text-muted)',
        border: '1px solid var(--beige-dark)', padding: '0.6rem', borderRadius: '50px',
        fontSize: '0.82rem', fontWeight: 500, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
      }}>
        Reset Filters
      </button>
    </>
  )

  return (
    <div>
      <Navbar />
      <div style={{ paddingTop: '80px', minHeight: '100vh', background: 'var(--beige)' }}>

        {/* Page Header */}
        <div style={{ padding: '2rem 5% 1rem' }}>
          <div style={{ textTransform: 'uppercase', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '1.5px', color: 'var(--orange)', marginBottom: '0.4rem' }}>
            Barkallahu Area
          </div>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '2rem', fontWeight: 900, color: 'var(--blue-dark)' }}>
            Available Listings
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.3rem', flexWrap: 'wrap', gap: '0.8rem' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              {filtered.length} properties found
            </p>
            {/* Mobile filter toggle button */}
            <button
              className="mobile-filter-btn"
              onClick={() => setShowFilters(!showFilters)}
              style={{
                display: 'none',
                background: 'var(--blue)', color: 'white',
                border: 'none', padding: '0.5rem 1.2rem',
                borderRadius: '50px', fontSize: '0.82rem',
                fontWeight: 600, cursor: 'pointer',
                fontFamily: 'DM Sans, sans-serif',
              }}
            >
              🔍 {showFilters ? 'Hide Filters' : 'Filters'}
            </button>
          </div>
        </div>

        {/* Mobile Filters Panel */}
        {showFilters && (
          <div className="mobile-filters-panel" style={{
            margin: '0 5% 1rem',
            background: 'var(--card)', borderRadius: '20px',
            padding: '1.5rem', border: '1px solid var(--beige-dark)',
          }}>
            <FiltersContent />
          </div>
        )}

        {/* Main Layout */}
        <div className="listings-layout" style={{ display: 'grid', gridTemplateColumns: '260px 1fr 380px', gap: '1.5rem', padding: '1rem 5% 3rem', alignItems: 'start' }}>

          {/* FILTERS SIDEBAR - desktop only */}
          <div className="listings-filter" style={{ background: 'var(--card)', borderRadius: '20px', padding: '1.5rem', border: '1px solid var(--beige-dark)', position: 'sticky', top: '100px' }}>
            <FiltersContent />
          </div>

          {/* LISTINGS GRID */}
          <div>
            {filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏚️</div>
                <p style={{ fontWeight: 600 }}>No listings found</p>
                <p style={{ fontSize: '0.85rem', marginTop: '0.3rem' }}>Try adjusting your filters or check back later</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.2rem' }}>
                {filtered.map(listing => (
                  <div
                    key={listing.id}
                    onClick={() => setSelectedId(listing.id)}
                    style={{
                      background: 'var(--card)', borderRadius: '20px', overflow: 'hidden',
                      border: `2px solid ${selectedId === listing.id ? 'var(--orange)' : 'var(--beige-dark)'}`,
                      cursor: 'pointer', transition: 'all 0.2s',
                      boxShadow: selectedId === listing.id ? '0 8px 30px rgba(249,115,22,0.2)' : 'none',
                    }}
                  >
                    <div style={{
                      height: '160px',
                      background: 'linear-gradient(135deg, var(--blue) 0%, #2A5298 100%)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '3rem', position: 'relative',
                    }}>
                      🏠
                      <div style={{
                        position: 'absolute', top: '0.8rem', left: '0.8rem',
                        background: 'var(--orange)', color: 'white',
                        fontSize: '0.7rem', fontWeight: 700,
                        padding: '0.25rem 0.7rem', borderRadius: '50px',
                      }}>
                        Available
                      </div>
                    </div>

                    <div style={{ padding: '1.1rem' }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--orange)', marginBottom: '0.3rem' }}>
                        {listing.type}
                      </div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)', marginBottom: '0.3rem' }}>
                        {listing.title}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.8rem' }}>
                        📍 {listing.distance} mins from AFIT
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ fontFamily: 'Playfair Display, serif', fontWeight: 900, fontSize: '1.1rem', color: 'var(--blue)' }}>
                          ₦{listing.price.toLocaleString()}
                          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.7rem', fontWeight: 400, color: 'var(--text-muted)' }}> /yr</span>
                        </div>
                        <Link
                          to={`/listings/${listing.id}`}
                          onClick={e => e.stopPropagation()}
                          style={{
                            background: 'var(--blue)', color: 'white',
                            padding: '0.4rem 0.9rem', borderRadius: '50px',
                            fontSize: '0.75rem', fontWeight: 600, textDecoration: 'none',
                          }}
                        >
                          View
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* MAP */}
          <div className="map-container" style={{ position: 'sticky', top: '100px', borderRadius: '20px', overflow: 'hidden', border: '1px solid var(--beige-dark)', boxShadow: '0 8px 30px rgba(15,31,61,0.08)' }}>
            <MapContainer center={[10.3980, 7.3820]} zoom={15} style={{ height: '600px', width: '100%' }}>
              <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {filtered.map(listing => (
                listing.lat && listing.lng && (
                  <Marker key={listing.id} position={[listing.lat, listing.lng]}>
                    <Popup>
                      <div style={{ fontFamily: 'DM Sans, sans-serif', minWidth: '160px' }}>
                        <div style={{ fontWeight: 700, marginBottom: '0.3rem' }}>{listing.title}</div>
                        <div style={{ color: '#F97316', fontWeight: 700 }}>₦{listing.price.toLocaleString()}/yr</div>
                        <div style={{ fontSize: '0.78rem', color: '#6B7280', marginTop: '0.2rem' }}>{listing.distance} mins from AFIT</div>
                      </div>
                    </Popup>
                  </Marker>
                )
              ))}
            </MapContainer>
          </div>

        </div>
      </div>
      <Footer />
    </div>
  )
}
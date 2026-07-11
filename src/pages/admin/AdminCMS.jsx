/* eslint-disable react/prop-types */
import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  BadgeCheck,
  BookOpenText,
  Building2,
  CheckCircle,
  Clock,
  Database,
  FilePenLine,
  Home,
  LayoutDashboard,
  LogOut,
  Plus,
  Save,
  Search,
  Settings,
  ShieldCheck,
  UserPlus,
  Users,
} from 'lucide-react'
import MobileNav from '../../components/common/MobileNav'
import { useAuth } from '../../context/AuthContext'
import {
  getPersonalBackendOverview,
  listBackendCollections,
  listCmsPages,
  listPlatformSettings,
  saveAdminListing,
  saveAdminUser,
  saveCmsPage,
  savePlatformSetting,
  updateAdminListingStatus,
  updateAdminUserVerification,
} from '../../lib/personalBackend'

const SIDEBAR_LINKS = [
  { to: '/admin/dashboard', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
  { to: '/admin/cms', icon: <Database size={18} />, label: 'All-in-one CMS', active: true },
  { to: '/admin/verifications', icon: <BadgeCheck size={18} />, label: 'Verifications' },
  { to: '/admin/pending-allocations', icon: <Clock size={18} />, label: 'Pending Allocations' },
  { to: '/admin/disputes', icon: <AlertTriangle size={18} />, label: 'Disputes' },
  { to: '/listings', icon: <Home size={18} />, label: 'All Listings' },
]

const AMENITIES = ['Power', 'Water', 'Bathroom', 'Kitchen', 'Parking', 'Security', 'Shared Bathroom', 'Fence']
const emptyPage = { id: null, title: '', slug: '', status: 'draft', summary: '', body: '' }
const emptySetting = { id: null, key: '', label: '', value: '', type: 'text' }
const emptyUser = { id: null, role: 'landlord', full_name: '', email: '', phone: '', password: '', verified: true, matric_number: '', department: '', nin: '', address: '' }
const emptyListing = { id: null, landlord_id: '', title: '', type: 'Self Contain', price: '', distance: '', address: '', description: '', amenities: ['Power', 'Water'], status: 'available', lat: '', lng: '', photos: [] }

export default function AdminCMS() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [overview, setOverview] = useState(null)
  const [pages, setPages] = useState([])
  const [settings, setSettings] = useState([])
  const [collections, setCollections] = useState({ listings: [], users: [], payments: [], disputes: [] })
  const [selectedPage, setSelectedPage] = useState(emptyPage)
  const [selectedSetting, setSelectedSetting] = useState(emptySetting)
  const [selectedUser, setSelectedUser] = useState(emptyUser)
  const [selectedListing, setSelectedListing] = useState(emptyListing)
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)

  useEffect(() => { loadCms() }, [])

  const loadCms = async () => {
    setLoading(true)
    setError('')
    try {
      const [overviewData, pagesData, settingsData, collectionsData] = await Promise.all([
        getPersonalBackendOverview(),
        listCmsPages(),
        listPlatformSettings(),
        listBackendCollections(),
      ])
      setOverview(overviewData)
      setPages(pagesData)
      setSettings(settingsData)
      setCollections(collectionsData)
      setSelectedPage(pagesData[0] || emptyPage)
      setSelectedSetting(settingsData[0] || emptySetting)
      setSelectedUser(emptyUser)
      setSelectedListing({ ...emptyListing, landlord_id: collectionsData.users.find(user => user.role === 'landlord')?.id || '' })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const landlords = useMemo(() => collections.users.filter(user => user.role === 'landlord'), [collections.users])
  const students = useMemo(() => collections.users.filter(user => user.role === 'student'), [collections.users])
  const pendingLandlords = useMemo(() => landlords.filter(user => !user.verified), [landlords])
  const availableListings = useMemo(() => collections.listings.filter(item => item.status === 'available'), [collections.listings])

  const filteredPages = useMemo(() => {
    const term = deferredSearch.toLowerCase()
    return pages.filter(page => [page.title, page.slug, page.summary].join(' ').toLowerCase().includes(term)).slice(0, 60)
  }, [pages, deferredSearch])

  const filteredListings = useMemo(() => {
    const term = deferredSearch.toLowerCase()
    return collections.listings.filter(listing => [listing.title, listing.type, listing.address, listing.status].join(' ').toLowerCase().includes(term)).slice(0, 60)
  }, [collections.listings, deferredSearch])

  const filteredUsers = useMemo(() => {
    const term = deferredSearch.toLowerCase()
    return collections.users.filter(user => [user.full_name, user.role, user.phone, user.email].join(' ').toLowerCase().includes(term)).slice(0, 80)
  }, [collections.users, deferredSearch])

  const clearMessages = () => {
    setError('')
    setNotice('')
  }

  const reloadAfterSave = async (message) => {
    await loadCms()
    setNotice(message)
  }

  const handleSaveUser = async () => {
    clearMessages()
    if (!selectedUser.full_name || !selectedUser.phone) {
      setError('Name and phone are required.')
      return
    }
    if (selectedUser.role === 'student' && !selectedUser.email) {
      setError('Student email is required.')
      return
    }
    setSaving(true)
    try {
      await saveAdminUser(selectedUser)
      await reloadAfterSave(selectedUser.role === 'landlord' ? 'Landlord saved.' : 'User saved.')
      setSelectedUser(emptyUser)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveListing = async () => {
    clearMessages()
    if (!selectedListing.landlord_id || !selectedListing.title || !selectedListing.price || !selectedListing.address) {
      setError('Listing needs a landlord, title, price, and address.')
      return
    }
    setSaving(true)
    try {
      await saveAdminListing(selectedListing)
      await reloadAfterSave('Listing saved.')
      setSelectedListing({ ...emptyListing, landlord_id: landlords[0]?.id || '' })
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleListingStatus = async (id, status) => {
    clearMessages()
    const updated = await updateAdminListingStatus(id, status)
    setCollections(prev => ({
      ...prev,
      listings: prev.listings.map(listing => listing.id === id ? { ...listing, ...updated } : listing),
    }))
    setSelectedListing(prev => prev.id === id ? { ...prev, ...updated } : prev)
    setNotice('Listing status updated.')
  }

  const handleVerification = async (id, verified) => {
    clearMessages()
    const updated = await updateAdminUserVerification(id, verified)
    setCollections(prev => ({
      ...prev,
      users: prev.users.map(user => user.id === id ? { ...user, ...updated } : user),
    }))
    setSelectedUser(prev => prev.id === id ? { ...prev, ...updated, password: '' } : prev)
    setNotice(verified ? 'Landlord verified.' : 'Landlord moved to pending.')
  }

  const handleSavePage = async () => {
    clearMessages()
    if (!selectedPage.title || !selectedPage.slug) {
      setError('Title and slug are required.')
      return
    }
    setSaving(true)
    try {
      const saved = await saveCmsPage(selectedPage)
      setPages(prev => [saved, ...prev.filter(page => page.id !== saved.id)])
      setSelectedPage(saved)
      setNotice('Content saved.')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveSetting = async () => {
    clearMessages()
    if (!selectedSetting.key || !selectedSetting.label) {
      setError('Setting key and label are required.')
      return
    }
    setSaving(true)
    try {
      const saved = await savePlatformSetting(selectedSetting)
      setSettings(prev => [saved, ...prev.filter(setting => setting.id !== saved.id)].sort((a, b) => a.key.localeCompare(b.key)))
      setSelectedSetting(saved)
      setNotice('Setting saved.')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const statCards = [
    { label: 'Listings', value: overview?.listings || 0, icon: <Home size={22} /> },
    { label: 'Available', value: availableListings.length, icon: <CheckCircle size={22} /> },
    { label: 'Students', value: overview?.students || 0, icon: <Users size={22} /> },
    { label: 'Landlords', value: overview?.landlords || 0, icon: <ShieldCheck size={22} /> },
    { label: 'Pending Checks', value: pendingLandlords.length, icon: <BadgeCheck size={22} /> },
    { label: 'Open Disputes', value: overview?.openDisputes || 0, icon: <AlertTriangle size={22} /> },
  ]

  return (
    <div className="dashboard-layout" style={{ minHeight: '100vh', background: 'var(--beige)', display: 'grid', gridTemplateColumns: '240px 1fr' }}>
      <MobileNav links={SIDEBAR_LINKS} />
      <AdminSidebar profile={profile} signOut={signOut} navigate={navigate} />

      <main className="main-content" style={{ padding: '2.5rem', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.9rem', fontWeight: 900, color: 'var(--blue-dark)' }}>All-in-one CMS</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>Create landlords, publish listings, verify users, resolve work queues, and manage site content.</p>
          </div>
          <button onClick={loadCms} style={ghostButtonStyle}>Refresh</button>
        </div>

        {(notice || error) && (
          <div style={{ marginBottom: '1rem', padding: '0.9rem 1rem', borderRadius: '8px', background: error ? 'rgba(220,38,38,0.08)' : 'rgba(22,163,74,0.08)', border: `1px solid ${error ? 'rgba(220,38,38,0.18)' : 'rgba(22,163,74,0.18)'}`, color: error ? '#B91C1C' : '#15803D', fontWeight: 700, fontSize: '0.86rem' }}>
            {error || notice}
          </div>
        )}

        {loading ? (
          <div style={{ color: 'var(--text-muted)', padding: '3rem 0' }}>Loading CMS...</div>
        ) : (
          <>
            <div className="cms-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '0.9rem', marginBottom: '1.5rem' }}>
              {statCards.map(card => <StatCard key={card.label} card={card} />)}
            </div>

            <Tabs activeTab={activeTab} setActiveTab={setActiveTab} />

            {activeTab === 'overview' && (
              <Overview
                landlords={landlords}
                pendingLandlords={pendingLandlords}
                listings={collections.listings}
                setActiveTab={setActiveTab}
                setSelectedUser={setSelectedUser}
                setSelectedListing={setSelectedListing}
                handleVerification={handleVerification}
              />
            )}

            {activeTab === 'listings' && (
              <ListingsManager
                listings={filteredListings}
                landlords={landlords}
                selectedListing={selectedListing}
                setSelectedListing={setSelectedListing}
                search={search}
                setSearch={setSearch}
                handleSaveListing={handleSaveListing}
                handleListingStatus={handleListingStatus}
                saving={saving}
              />
            )}

            {activeTab === 'people' && (
              <PeopleManager
                users={filteredUsers}
                landlords={landlords}
                students={students}
                selectedUser={selectedUser}
                setSelectedUser={setSelectedUser}
                search={search}
                setSearch={setSearch}
                handleSaveUser={handleSaveUser}
                handleVerification={handleVerification}
                saving={saving}
              />
            )}

            {activeTab === 'content' && (
              <ContentManager
                pages={filteredPages}
                selectedPage={selectedPage}
                setSelectedPage={setSelectedPage}
                search={search}
                setSearch={setSearch}
                handleSavePage={handleSavePage}
                saving={saving}
              />
            )}

            {activeTab === 'records' && <Records collections={collections} />}

            {activeTab === 'settings' && (
              <SettingsManager
                settings={settings}
                selectedSetting={selectedSetting}
                setSelectedSetting={setSelectedSetting}
                handleSaveSetting={handleSaveSetting}
                saving={saving}
              />
            )}
          </>
        )}
      </main>
    </div>
  )
}

function AdminSidebar({ profile, signOut, navigate }) {
  return (
    <div className="desktop-sidebar" style={{ background: 'var(--blue-dark)', padding: '2rem 1.2rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', position: 'sticky', top: 0, height: '100vh' }}>
      <Link to="/" style={{ textDecoration: 'none', marginBottom: '2rem', display: 'block' }}>
        <span style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.4rem', fontWeight: 900, color: 'white' }}>AFIT <span style={{ color: 'var(--orange)' }}>Nests</span></span>
        <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.2rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Personal Backend</div>
      </Link>
      {SIDEBAR_LINKS.map(item => (
        <Link key={item.to} to={item.to} style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', padding: '0.75rem 1rem', borderRadius: '8px', textDecoration: 'none', background: item.active ? 'rgba(255,255,255,0.1)' : 'transparent', color: item.active ? 'white' : 'rgba(255,255,255,0.6)', fontSize: '0.88rem', fontWeight: item.active ? 700 : 500 }}>
          {item.icon} {item.label}
        </Link>
      ))}
      <div style={{ marginTop: 'auto', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'white', marginBottom: '0.5rem' }}>{profile?.full_name || 'Admin'}</div>
        <button onClick={async () => { await signOut(); navigate('/') }} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem', color: 'rgba(255,255,255,0.55)', fontFamily: 'DM Sans, sans-serif', padding: 0 }}>
          <LogOut size={14} /> Logout
        </button>
      </div>
    </div>
  )
}

function Tabs({ activeTab, setActiveTab }) {
  const tabs = [
    { key: 'overview', label: 'Overview', icon: <LayoutDashboard size={15} /> },
    { key: 'listings', label: 'Listings', icon: <Home size={15} /> },
    { key: 'people', label: 'People', icon: <Users size={15} /> },
    { key: 'content', label: 'Content', icon: <FilePenLine size={15} /> },
    { key: 'records', label: 'Records', icon: <Database size={15} /> },
    { key: 'settings', label: 'Settings', icon: <Settings size={15} /> },
  ]

  return (
    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.2rem', flexWrap: 'wrap' }}>
      {tabs.map(tab => (
        <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{ ...tabButtonStyle, background: activeTab === tab.key ? 'var(--blue)' : 'var(--card)', color: activeTab === tab.key ? 'white' : 'var(--text)' }}>
          {tab.icon} {tab.label}
        </button>
      ))}
    </div>
  )
}

function Overview({ landlords, pendingLandlords, listings, setActiveTab, setSelectedUser, setSelectedListing, handleVerification }) {
  return (
    <div className="cms-workspace-grid" style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '1rem', alignItems: 'start' }}>
      <section style={panelStyle}>
        <h2 style={panelTitleStyle}>Admin Shortcuts</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem', marginTop: '1rem' }}>
          <Shortcut icon={<UserPlus size={18} />} title="Add Landlord" text="Create a verified or pending landlord account." onClick={() => { setSelectedUser(emptyUser); setActiveTab('people') }} />
          <Shortcut icon={<Building2 size={18} />} title="Add Listing" text="Publish accommodation for any landlord." onClick={() => { setSelectedListing({ ...emptyListing, landlord_id: landlords[0]?.id || '' }); setActiveTab('listings') }} />
          <Shortcut icon={<BadgeCheck size={18} />} title="Verify Landlords" text={`${pendingLandlords.length} landlord checks waiting.`} onClick={() => setActiveTab('people')} />
          <Shortcut icon={<BookOpenText size={18} />} title="Edit Site Content" text="Update pages, announcements, and guides." onClick={() => setActiveTab('content')} />
        </div>
      </section>

      <section style={panelStyle}>
        <h2 style={panelTitleStyle}>Attention Queue</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem', marginTop: '1rem' }}>
          {pendingLandlords.slice(0, 4).map(landlord => (
            <div key={landlord.id} style={rowStyle}>
              <div>
                <div style={rowTitleStyle}>{landlord.full_name}</div>
                <div style={rowSubStyle}>{landlord.phone} - landlord verification</div>
              </div>
              <button onClick={() => handleVerification(landlord.id, true)} style={smallPrimaryButton}>Verify</button>
            </div>
          ))}
          {pendingLandlords.length === 0 && <Empty text="No pending landlord verifications." />}
        </div>
      </section>

      <section style={{ ...panelStyle, gridColumn: '1 / -1' }}>
        <h2 style={panelTitleStyle}>Latest Listings</h2>
        <DataTable
          rows={listings.slice(0, 6)}
          columns={[
            ['title', 'Listing'],
            ['type', 'Type'],
            ['price', 'Rent'],
            ['status', 'Status'],
          ]}
        />
      </section>
    </div>
  )
}

function ListingsManager({ listings, landlords, selectedListing, setSelectedListing, search, setSearch, handleSaveListing, handleListingStatus, saving }) {
  const toggleAmenity = (amenity) => {
    const current = selectedListing.amenities || []
    setSelectedListing({
      ...selectedListing,
      amenities: current.includes(amenity) ? current.filter(item => item !== amenity) : [...current, amenity],
    })
  }

  return (
    <section className="cms-workspace-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: '1rem', alignItems: 'start' }}>
      <div style={panelStyle}>
        <PanelHeader title="Listings" actionLabel="New Listing" onAction={() => setSelectedListing({ ...emptyListing, landlord_id: landlords[0]?.id || '' })} />
        <SearchBox value={search} onChange={setSearch} placeholder="Search listings" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem', marginTop: '1rem' }}>
          {listings.map(listing => (
            <div key={listing.id} style={rowStyle}>
              <div>
                <div style={rowTitleStyle}>{listing.title}</div>
                <div style={rowSubStyle}>{listing.type} - N{Number(listing.price || 0).toLocaleString()} - {listing.status}</div>
              </div>
              <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <button onClick={() => setSelectedListing({ ...listing, amenities: listing.amenities || [] })} style={smallGhostButton}>Edit</button>
                {listing.status !== 'available' && <button onClick={() => handleListingStatus(listing.id, 'available')} style={smallGhostButton}>Available</button>}
                {listing.status !== 'occupied' && <button onClick={() => handleListingStatus(listing.id, 'occupied')} style={smallDangerButton}>Occupied</button>}
              </div>
            </div>
          ))}
          {listings.length === 0 && <Empty text="No listings found." />}
        </div>
      </div>

      <div style={panelStyle}>
        <h2 style={panelTitleStyle}>{selectedListing.id ? 'Edit Listing' : 'Add Listing'}</h2>
        <div className="cms-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem', marginTop: '1rem' }}>
          <Field label="Landlord"><select value={selectedListing.landlord_id} onChange={e => setSelectedListing({ ...selectedListing, landlord_id: e.target.value })} style={inputStyle}><option value="">Select landlord</option>{landlords.map(item => <option key={item.id} value={item.id}>{item.full_name}</option>)}</select></Field>
          <Field label="Status"><select value={selectedListing.status} onChange={e => setSelectedListing({ ...selectedListing, status: e.target.value })} style={inputStyle}><option>available</option><option>pending_confirmation</option><option>occupied</option></select></Field>
        </div>
        <Field label="Title"><input value={selectedListing.title} onChange={e => setSelectedListing({ ...selectedListing, title: e.target.value })} style={inputStyle} /></Field>
        <div className="cms-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
          <Field label="Type"><select value={selectedListing.type} onChange={e => setSelectedListing({ ...selectedListing, type: e.target.value })} style={inputStyle}><option>Single Room</option><option>Self Contain</option><option>Mini Flat</option></select></Field>
          <Field label="Annual Rent"><input type="number" value={selectedListing.price} onChange={e => setSelectedListing({ ...selectedListing, price: e.target.value })} style={inputStyle} /></Field>
        </div>
        <div className="cms-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
          <Field label="Distance"><input type="number" value={selectedListing.distance} onChange={e => setSelectedListing({ ...selectedListing, distance: e.target.value })} style={inputStyle} /></Field>
          <Field label="Address"><input value={selectedListing.address} onChange={e => setSelectedListing({ ...selectedListing, address: e.target.value })} style={inputStyle} /></Field>
        </div>
        <Field label="Description"><textarea value={selectedListing.description} onChange={e => setSelectedListing({ ...selectedListing, description: e.target.value })} rows={4} style={textareaStyle} /></Field>
        <div style={{ marginBottom: '1rem' }}>
          <span style={labelStyle}>Amenities</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
            {AMENITIES.map(amenity => (
              <button key={amenity} onClick={() => toggleAmenity(amenity)} style={{ padding: '0.42rem 0.7rem', borderRadius: '8px', border: `1px solid ${(selectedListing.amenities || []).includes(amenity) ? 'var(--blue)' : 'var(--beige-dark)'}`, background: (selectedListing.amenities || []).includes(amenity) ? 'rgba(27,58,107,0.08)' : 'white', color: 'var(--text)', cursor: 'pointer', fontWeight: 700, fontSize: '0.78rem' }}>{amenity}</button>
            ))}
          </div>
        </div>
        <button onClick={handleSaveListing} disabled={saving} style={primaryButtonStyle}><Save size={16} /> {saving ? 'Saving...' : 'Save Listing'}</button>
      </div>
    </section>
  )
}

function PeopleManager({ users, landlords, students, selectedUser, setSelectedUser, search, setSearch, handleSaveUser, handleVerification, saving }) {
  return (
    <section className="cms-workspace-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: '1rem', alignItems: 'start' }}>
      <div style={panelStyle}>
        <PanelHeader title={`People (${landlords.length} landlords, ${students.length} students)`} actionLabel="New Landlord" onAction={() => setSelectedUser(emptyUser)} />
        <SearchBox value={search} onChange={setSearch} placeholder="Search people" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem', marginTop: '1rem' }}>
          {users.map(user => (
            <div key={user.id} style={rowStyle}>
              <div>
                <div style={rowTitleStyle}>{user.full_name || 'Unnamed user'}</div>
                <div style={rowSubStyle}>{user.role} - {user.phone || user.email || 'no contact'} {user.role === 'landlord' ? `- ${user.verified ? 'verified' : 'pending'}` : ''}</div>
              </div>
              <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <button onClick={() => setSelectedUser({ ...emptyUser, ...user, password: '' })} style={smallGhostButton}>Edit</button>
                {user.role === 'landlord' && <button onClick={() => handleVerification(user.id, !user.verified)} style={user.verified ? smallDangerButton : smallPrimaryButton}>{user.verified ? 'Unverify' : 'Verify'}</button>}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={panelStyle}>
        <h2 style={panelTitleStyle}>{selectedUser.id ? 'Edit Person' : 'Add Person'}</h2>
        <div className="cms-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem', marginTop: '1rem' }}>
          <Field label="Role"><select value={selectedUser.role} onChange={e => setSelectedUser({ ...selectedUser, role: e.target.value })} style={inputStyle}><option>landlord</option><option>student</option><option>admin</option></select></Field>
          <Field label="Verified"><select value={String(selectedUser.verified)} onChange={e => setSelectedUser({ ...selectedUser, verified: e.target.value === 'true' })} style={inputStyle}><option value="true">Verified</option><option value="false">Pending</option></select></Field>
        </div>
        <Field label="Full Name"><input value={selectedUser.full_name} onChange={e => setSelectedUser({ ...selectedUser, full_name: e.target.value })} style={inputStyle} /></Field>
        <div className="cms-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
          <Field label="Phone"><input value={selectedUser.phone} onChange={e => setSelectedUser({ ...selectedUser, phone: e.target.value })} style={inputStyle} /></Field>
          <Field label="Email"><input value={selectedUser.email || ''} onChange={e => setSelectedUser({ ...selectedUser, email: e.target.value })} placeholder={selectedUser.role === 'landlord' ? 'auto from phone' : ''} style={inputStyle} /></Field>
        </div>
        <Field label="Password"><input type="password" value={selectedUser.password || ''} onChange={e => setSelectedUser({ ...selectedUser, password: e.target.value })} placeholder={selectedUser.id ? 'Leave blank to keep current password' : '8+ chars, Aa, 0-9, symbol'} style={inputStyle} /></Field>
        {selectedUser.role === 'student' && (
          <div className="cms-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
            <Field label="Matric Number"><input value={selectedUser.matric_number || ''} onChange={e => setSelectedUser({ ...selectedUser, matric_number: e.target.value })} style={inputStyle} /></Field>
            <Field label="Department"><input value={selectedUser.department || ''} onChange={e => setSelectedUser({ ...selectedUser, department: e.target.value })} style={inputStyle} /></Field>
          </div>
        )}
        {selectedUser.role === 'landlord' && (
          <>
            <Field label="NIN"><input value={selectedUser.nin || ''} onChange={e => setSelectedUser({ ...selectedUser, nin: e.target.value })} style={inputStyle} /></Field>
            <Field label="Address"><textarea value={selectedUser.address || ''} onChange={e => setSelectedUser({ ...selectedUser, address: e.target.value })} rows={3} style={textareaStyle} /></Field>
          </>
        )}
        <button onClick={handleSaveUser} disabled={saving} style={primaryButtonStyle}><Save size={16} /> {saving ? 'Saving...' : 'Save Person'}</button>
      </div>
    </section>
  )
}

function ContentManager({ pages, selectedPage, setSelectedPage, search, setSearch, handleSavePage, saving }) {
  return (
    <section className="cms-workspace-grid" style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1rem', alignItems: 'start' }}>
      <div style={panelStyle}>
        <PanelHeader title="Content Library" actionLabel="New" onAction={() => setSelectedPage(emptyPage)} />
        <SearchBox value={search} onChange={setSearch} placeholder="Search pages" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', marginTop: '0.9rem' }}>
          {pages.map(page => (
            <button key={page.id} onClick={() => setSelectedPage(page)} style={{ textAlign: 'left', background: selectedPage?.id === page.id ? 'rgba(27,58,107,0.08)' : 'var(--beige)', border: `1px solid ${selectedPage?.id === page.id ? 'rgba(27,58,107,0.2)' : 'var(--beige-dark)'}`, borderRadius: '8px', padding: '0.8rem', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
              <div style={{ fontWeight: 800, color: 'var(--text)', fontSize: '0.88rem' }}>{page.title}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.76rem', marginTop: '0.2rem' }}>/{page.slug} - {page.status}</div>
            </button>
          ))}
          {pages.length === 0 && <Empty text="No pages yet." />}
        </div>
      </div>
      <div style={panelStyle}>
        <h2 style={panelTitleStyle}>{selectedPage.id ? 'Edit Page' : 'Create Page'}</h2>
        <div className="cms-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 180px', gap: '0.9rem', marginTop: '1rem' }}>
          <Field label="Title"><input value={selectedPage.title} onChange={e => setSelectedPage({ ...selectedPage, title: e.target.value })} style={inputStyle} /></Field>
          <Field label="Status"><select value={selectedPage.status} onChange={e => setSelectedPage({ ...selectedPage, status: e.target.value })} style={inputStyle}><option>draft</option><option>published</option><option>archived</option></select></Field>
        </div>
        <Field label="Slug"><input value={selectedPage.slug} onChange={e => setSelectedPage({ ...selectedPage, slug: e.target.value })} placeholder="privacy-policy" style={inputStyle} /></Field>
        <Field label="Summary"><textarea value={selectedPage.summary || ''} onChange={e => setSelectedPage({ ...selectedPage, summary: e.target.value })} rows={3} style={textareaStyle} /></Field>
        <Field label="Body"><textarea value={selectedPage.body || ''} onChange={e => setSelectedPage({ ...selectedPage, body: e.target.value })} rows={10} style={textareaStyle} /></Field>
        <button onClick={handleSavePage} disabled={saving} style={primaryButtonStyle}><Save size={16} /> {saving ? 'Saving...' : 'Save Content'}</button>
      </div>
    </section>
  )
}

function Records({ collections }) {
  const groups = [
    { key: 'payments', label: 'Payments', rows: collections.payments, columns: [['payment_reference', 'Reference'], ['amount', 'Amount'], ['status', 'Status']] },
    { key: 'disputes', label: 'Disputes', rows: collections.disputes, columns: [['issue', 'Issue'], ['status', 'Status']] },
    { key: 'viewings', label: 'Listing Snapshot', rows: collections.listings, columns: [['title', 'Listing'], ['status', 'Status'], ['price', 'Rent']] },
    { key: 'users', label: 'User Snapshot', rows: collections.users, columns: [['full_name', 'Name'], ['role', 'Role'], ['phone', 'Phone']] },
  ]

  return (
    <div className="cms-collections-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
      {groups.map(group => (
        <section key={group.key} style={panelStyle}>
          <h2 style={panelTitleStyle}>{group.label}</h2>
          <DataTable rows={group.rows} columns={group.columns} />
        </section>
      ))}
    </div>
  )
}

function SettingsManager({ settings, selectedSetting, setSelectedSetting, handleSaveSetting, saving }) {
  return (
    <section className="cms-workspace-grid" style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1rem', alignItems: 'start' }}>
      <div style={panelStyle}>
        <PanelHeader title="Platform Settings" actionLabel="New" onAction={() => setSelectedSetting(emptySetting)} />
        {settings.map(setting => (
          <button key={setting.id} onClick={() => setSelectedSetting(setting)} style={{ display: 'block', width: '100%', textAlign: 'left', background: selectedSetting?.id === setting.id ? 'rgba(27,58,107,0.08)' : 'var(--beige)', border: `1px solid ${selectedSetting?.id === setting.id ? 'rgba(27,58,107,0.2)' : 'var(--beige-dark)'}`, borderRadius: '8px', padding: '0.8rem', cursor: 'pointer', marginBottom: '0.55rem', fontFamily: 'DM Sans, sans-serif' }}>
            <div style={{ fontWeight: 800, color: 'var(--text)', fontSize: '0.88rem' }}>{setting.label}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.76rem', marginTop: '0.2rem' }}>{setting.key}</div>
          </button>
        ))}
      </div>
      <div style={panelStyle}>
        <h2 style={panelTitleStyle}>{selectedSetting.id ? 'Edit Setting' : 'Create Setting'}</h2>
        <div className="cms-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 180px', gap: '0.9rem', marginTop: '1rem' }}>
          <Field label="Label"><input value={selectedSetting.label} onChange={e => setSelectedSetting({ ...selectedSetting, label: e.target.value })} style={inputStyle} /></Field>
          <Field label="Type"><select value={selectedSetting.type} onChange={e => setSelectedSetting({ ...selectedSetting, type: e.target.value })} style={inputStyle}><option>text</option><option>number</option><option>boolean</option><option>url</option></select></Field>
        </div>
        <Field label="Key"><input value={selectedSetting.key} onChange={e => setSelectedSetting({ ...selectedSetting, key: e.target.value })} placeholder="support_phone" style={inputStyle} /></Field>
        <Field label="Value"><textarea value={selectedSetting.value || ''} onChange={e => setSelectedSetting({ ...selectedSetting, value: e.target.value })} rows={6} style={textareaStyle} /></Field>
        <button onClick={handleSaveSetting} disabled={saving} style={primaryButtonStyle}><Save size={16} /> {saving ? 'Saving...' : 'Save Setting'}</button>
      </div>
    </section>
  )
}

function Field({ label, children }) {
  return <label style={{ display: 'block', marginBottom: '0.9rem' }}><span style={labelStyle}>{label}</span>{children}</label>
}

function PanelHeader({ title, actionLabel, onAction }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.8rem', alignItems: 'center', marginBottom: '1rem' }}>
      <h2 style={panelTitleStyle}>{title}</h2>
      {onAction && <button onClick={onAction} style={smallPrimaryButton}><Plus size={14} /> {actionLabel}</button>}
    </div>
  )
}

function SearchBox({ value, onChange, placeholder }) {
  return (
    <div style={{ position: 'relative' }}>
      <Search size={15} style={{ position: 'absolute', left: '0.8rem', top: '0.78rem', color: 'var(--text-muted)' }} />
      <input value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} style={{ ...inputStyle, paddingLeft: '2.2rem' }} />
    </div>
  )
}

function StatCard({ card }) {
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--beige-dark)', borderRadius: '8px', padding: '1rem' }}>
      <div style={{ color: 'var(--blue)', marginBottom: '0.6rem' }}>{card.icon}</div>
      <div style={{ fontFamily: 'Playfair Display, serif', fontWeight: 900, fontSize: '1.45rem', color: 'var(--blue-dark)', lineHeight: 1 }}>{card.value}</div>
      <div style={{ marginTop: '0.25rem', fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{card.label}</div>
    </div>
  )
}

function Shortcut({ icon, title, text, onClick }) {
  return (
    <button onClick={onClick} style={{ textAlign: 'left', background: 'var(--beige)', border: '1px solid var(--beige-dark)', borderRadius: '8px', padding: '1rem', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ color: 'var(--blue)', marginBottom: '0.5rem' }}>{icon}</div>
      <div style={{ fontWeight: 900, color: 'var(--text)', fontSize: '0.92rem' }}>{title}</div>
      <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '0.25rem', lineHeight: 1.5 }}>{text}</div>
    </button>
  )
}

function DataTable({ rows, columns }) {
  return (
    <div style={{ overflowX: 'auto', marginTop: '0.9rem' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
        <tbody>
          {rows.map(row => (
            <tr key={row.id} style={{ borderTop: '1px solid var(--beige-dark)' }}>
              {columns.map(([column, label]) => (
                <td key={column} title={label} style={{ padding: '0.75rem 0.5rem', color: column === columns[0][0] ? 'var(--text)' : 'var(--text-muted)', fontWeight: column === columns[0][0] ? 800 : 600, maxWidth: '240px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {formatValue(row[column], column)}
                </td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && <tr><td style={{ padding: '1rem 0', color: 'var(--text-muted)' }}>No records found.</td></tr>}
        </tbody>
      </table>
    </div>
  )
}

function Empty({ text }) {
  return <div style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.86rem', background: 'var(--beige)', borderRadius: '8px', border: '1px solid var(--beige-dark)' }}>{text}</div>
}

const formatValue = (value, column) => {
  if (value === null || value === undefined || value === '') return 'none'
  if (column === 'price' || column === 'amount') return `N${Number(value || 0).toLocaleString()}`
  if (typeof value === 'boolean') return value ? 'yes' : 'no'
  return String(value)
}

const panelStyle = { background: 'var(--card)', border: '1px solid var(--beige-dark)', borderRadius: '8px', padding: '1.2rem' }
const panelTitleStyle = { margin: 0, fontSize: '1rem', fontWeight: 900, color: 'var(--blue-dark)' }
const labelStyle = { display: 'block', fontSize: '0.74rem', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.4rem' }
const inputStyle = { width: '100%', padding: '0.72rem 0.85rem', borderRadius: '8px', border: '1px solid var(--beige-dark)', background: 'white', fontSize: '0.88rem', color: 'var(--text)', fontFamily: 'DM Sans, sans-serif', outline: 'none' }
const textareaStyle = { ...inputStyle, resize: 'vertical', lineHeight: 1.55 }
const tabButtonStyle = { display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '0.62rem 1rem', borderRadius: '8px', border: '1px solid var(--beige-dark)', cursor: 'pointer', fontWeight: 900, fontSize: '0.84rem', fontFamily: 'DM Sans, sans-serif' }
const primaryButtonStyle = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: 'var(--orange)', color: 'white', padding: '0.82rem 1.2rem', borderRadius: '8px', fontWeight: 900, fontSize: '0.9rem', border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', width: '100%' }
const ghostButtonStyle = { background: 'var(--card)', color: 'var(--blue)', padding: '0.65rem 1rem', borderRadius: '8px', fontWeight: 900, fontSize: '0.84rem', border: '1px solid var(--beige-dark)', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }
const smallPrimaryButton = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', background: 'var(--blue)', color: 'white', padding: '0.45rem 0.75rem', borderRadius: '8px', fontWeight: 900, fontSize: '0.76rem', border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }
const smallGhostButton = { background: 'white', color: 'var(--blue)', padding: '0.45rem 0.75rem', borderRadius: '8px', fontWeight: 900, fontSize: '0.76rem', border: '1px solid var(--beige-dark)', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }
const smallDangerButton = { background: 'rgba(220,38,38,0.08)', color: '#B91C1C', padding: '0.45rem 0.75rem', borderRadius: '8px', fontWeight: 900, fontSize: '0.76rem', border: '1px solid rgba(220,38,38,0.18)', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }
const rowStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.9rem', padding: '0.9rem', background: 'var(--beige)', border: '1px solid var(--beige-dark)', borderRadius: '8px' }
const rowTitleStyle = { fontWeight: 900, color: 'var(--text)', fontSize: '0.9rem' }
const rowSubStyle = { color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '0.2rem' }

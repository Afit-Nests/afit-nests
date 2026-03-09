import { useState, useEffect } from 'react'
import { Link, useNavigate } from  'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import MobileNav from '../../components/common/MobileNav'

const SIDEBAR_LINKS = [
  { to: '/admin/dashboard', icon: '📊', label: 'Dashboard' },
  { to: '/admin/verifications', icon: '✅', label: 'Verifications' },
  { to: '/admin/disputes', icon: '⚠️', label: 'Disputes', active: true },
  { to: '/listings', icon: '🏠', label: 'All Listings' },
]

export default function Disputes() {
  const [disputes, setDisputes] = useState([])
  const [selected, setSelected] = useState(null)
  const [adminMessage, setAdminMessage] = useState('')
  const [tab, setTab] = useState('open')
  const [loading, setLoading] = useState(true)
  const { signOut } = useAuth()
  const navigate = useNavigate()

  useEffect(() => { fetchDisputes() }, [])

  const fetchDisputes = async () => {
    const { data, error } = await supabase
      .from('disputes')
      .select(`
        *,
        profiles!disputes_student_id_fkey (full_name, matric_number),
        landlord:profiles!disputes_landlord_id_fkey (full_name),
        listings (title)
      `)
      .order('created_at', { ascending: false })
    if (!error) setDisputes(data || [])
    setLoading(false)
  }

  const fetchMessages = async (disputeId) => {
    const { data } = await supabase
      .from('dispute_messages')
      .select('*')
      .eq('dispute_id', disputeId)
      .order('created_at', { ascending: true })
    return data || []
  }

  const handleSelect = async (dispute) => {
    const messages = await fetchMessages(dispute.id)
    setSelected({ ...dispute, messages })
  }

  const handleResolve = async (id) => {
    const { error } = await supabase.from('disputes').update({ status: 'resolved' }).eq('id', id)
    if (!error) {
      setDisputes(disputes.map(d => d.id === id ? { ...d, status: 'resolved' } : d))
      setSelected(prev => prev?.id === id ? { ...prev, status: 'resolved' } : prev)
    }
  }

  const handleSendMessage = async () => {
    if (!adminMessage.trim() || !selected) return
    const { error } = await supabase.from('dispute_messages').insert({
      dispute_id: selected.id,
      sender_id: null,
      sender_role: 'admin',
      text: adminMessage,
    })
    if (!error) {
      const messages = await fetchMessages(selected.id)
      setSelected(prev => ({ ...prev, messages }))
      setAdminMessage('')
    }
  }

  const filtered = disputes.filter(d => d.status === tab)

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
          <span style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.4rem', fontWeight: 900, color: 'white' }}>
            AFIT <span style={{ color: 'var(--orange)' }}>Nests</span>
          </span>
          <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.2rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Admin Panel</div>
        </Link>
        {SIDEBAR_LINKS.map(item => (
          <Link key={item.to} to={item.to} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0.75rem 1rem', borderRadius: '12px', textDecoration: 'none',
            background: item.active ? 'rgba(255,255,255,0.1)' : 'transparent',
            color: item.active ? 'white' : 'rgba(255,255,255,0.6)',
            fontSize: '0.88rem', fontWeight: item.active ? 600 : 400,
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>{item.icon} {item.label}</span>
          </Link>
        ))}
        <div style={{ marginTop: 'auto' }}>
          <button onClick={async () => { await signOut(); navigate('/') }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', fontFamily: 'DM Sans, sans-serif', padding: 0 }}>
            🚪 Logout
          </button>
        </div>
      </div>

      <div className="main-content" style={{ padding: '2.5rem', overflowY: 'auto' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.8rem', fontWeight: 900, color: 'var(--blue-dark)' }}>Disputes</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.2rem' }}>Mediate issues between students and landlords.</p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {[
            { key: 'open', label: `Open (${disputes.filter(d => d.status === 'open').length})` },
            { key: 'resolved', label: `Resolved (${disputes.filter(d => d.status === 'resolved').length})` },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding: '0.55rem 1.4rem', borderRadius: '50px', cursor: 'pointer',
              background: tab === t.key ? 'var(--blue)' : 'var(--card)',
              color: tab === t.key ? 'white' : 'var(--text-muted)',
              fontWeight: 600, fontSize: '0.88rem', fontFamily: 'DM Sans, sans-serif',
              border: tab === t.key ? 'none' : '1px solid var(--beige-dark)',
            }}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="admin-split-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '1.5rem', alignItems: 'start' }}>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
                <p style={{ fontWeight: 600 }}>No {tab} disputes</p>
              </div>
            )}
            {filtered.map(dispute => (
              <div key={dispute.id} onClick={() => handleSelect(dispute)} style={{
                background: 'var(--card)', borderRadius: '16px', padding: '1.4rem',
                border: `2px solid ${selected?.id === dispute.id ? 'var(--orange)' : 'var(--beige-dark)'}`,
                cursor: 'pointer', transition: 'all 0.2s',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.8rem' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)' }}>
                      {dispute.profiles?.full_name} vs {dispute.landlord?.full_name}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      {dispute.listings?.title} · {new Date(dispute.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={{
                    fontSize: '0.75rem', fontWeight: 700, padding: '0.25rem 0.8rem', borderRadius: '50px', flexShrink: 0,
                    background: dispute.status === 'open' ? 'rgba(249,115,22,0.1)' : 'rgba(22,163,74,0.1)',
                    color: dispute.status === 'open' ? 'var(--orange)' : '#16A34A',
                  }}>
                    {dispute.status === 'open' ? '🔴 Open' : '✅ Resolved'}
                  </div>
                </div>
                <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {dispute.issue}
                </p>
              </div>
            ))}
          </div>

          {selected ? (
            <div style={{ background: 'var(--card)', borderRadius: '20px', border: '1px solid var(--beige-dark)', overflow: 'hidden', position: 'sticky', top: '2rem' }}>
              <div style={{ padding: '1.4rem 1.6rem', borderBottom: '1px solid var(--beige-dark)' }}>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)', marginBottom: '0.2rem' }}>
                  {selected.profiles?.full_name} vs {selected.landlord?.full_name}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {selected.listings?.title} · {selected.profiles?.matric_number}
                </div>
              </div>

              <div style={{ padding: '1.2rem 1.6rem', background: 'rgba(249,115,22,0.05)', borderBottom: '1px solid var(--beige-dark)' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--orange)', marginBottom: '0.4rem' }}>Issue Reported</div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text)', lineHeight: 1.6 }}>{selected.issue}</p>
              </div>

              <div style={{ padding: '1.2rem 1.6rem', maxHeight: '240px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.8rem', borderBottom: '1px solid var(--beige-dark)' }}>
                {(selected.messages || []).length === 0 && (
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textAlign: 'center' }}>No messages yet</p>
                )}
                {(selected.messages || []).map((msg, i) => (
                  <div key={i} style={{
                    padding: '0.8rem', borderRadius: '12px',
                    background: msg.sender_role === 'admin' ? 'rgba(27,58,107,0.08)' : 'var(--beige)',
                    border: `1px solid ${msg.sender_role === 'admin' ? 'rgba(27,58,107,0.15)' : 'var(--beige-dark)'}`,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: msg.sender_role === 'admin' ? 'var(--blue)' : 'var(--text-muted)' }}>
                        {msg.sender_role === 'admin' ? '🛡️ Admin' : `🎓 ${msg.sender_role}`}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text)', lineHeight: 1.5 }}>{msg.text}</p>
                  </div>
                ))}
              </div>

              <div style={{ padding: '1.2rem 1.6rem', borderBottom: '1px solid var(--beige-dark)' }}>
                <textarea value={adminMessage} onChange={e => setAdminMessage(e.target.value)} placeholder="Write a message to both parties..." rows={3} style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1px solid var(--beige-dark)', background: 'var(--beige)', fontSize: '0.85rem', color: 'var(--text)', fontFamily: 'DM Sans, sans-serif', resize: 'none', outline: 'none', boxSizing: 'border-box' }} />
                <button onClick={handleSendMessage} style={{ marginTop: '0.6rem', width: '100%', background: 'var(--blue)', color: 'white', padding: '0.75rem', borderRadius: '50px', fontWeight: 600, fontSize: '0.88rem', border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                  Send Message
                </button>
              </div>

              {selected.status === 'open' && (
                <div style={{ padding: '1.2rem 1.6rem' }}>
                  <button onClick={() => handleResolve(selected.id)} style={{ width: '100%', background: '#16A34A', color: 'white', padding: '0.75rem', borderRadius: '50px', fontWeight: 600, fontSize: '0.88rem', border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                    ✅ Mark as Resolved
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div style={{ background: 'var(--card)', borderRadius: '20px', padding: '2rem', border: '1px solid var(--beige-dark)', textAlign: 'center', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.8rem' }}>👈</div>
              <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>Select a dispute to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
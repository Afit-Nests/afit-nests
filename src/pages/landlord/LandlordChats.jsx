import { useState, useEffect, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { LayoutDashboard, MessageSquare, Home, Plus, Calendar, User, LogOut, Send, Lock, BadgeCheck, Clock } from 'lucide-react'
import MobileNav from '../../components/common/MobileNav'

const SIDEBAR_LINKS = [
  { to: '/landlord/dashboard', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
  { to: '/landlord/chats', icon: <MessageSquare size={18} />, label: 'Chats', active: true },
  { to: '/landlord/listings', icon: <Home size={18} />, label: 'My Listings' },
  { to: '/landlord/listings/create', icon: <Plus size={18} />, label: 'Add Listing' },
  { to: '/landlord/viewings', icon: <Calendar size={18} />, label: 'Viewing Requests' },
  { to: '/landlord/profile', icon: <User size={18} />, label: 'Profile' },
]

export default function LandlordChats() {
  const { profile, signOut } = useAuth()
  const [chats, setChats] = useState([])
  const [selectedChat, setSelectedChat] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const messagesEndRef = useRef(null)
  const [searchParams] = useSearchParams()
  const [isTyping, setIsTyping] = useState(false)
  const typingTimeoutRef = useRef(null)
  const channelRef = useRef(null)

  useEffect(() => { if (profile) fetchChats() }, [profile])

  useEffect(() => {
    const chatId = searchParams.get('chat')
    if (chatId && chats.length > 0) {
      const chat = chats.find(c => c.id === chatId)
      if (chat) setSelectedChat(chat)
    }
  }, [searchParams, chats])

  useEffect(() => {
    if (selectedChat) {
      fetchMessages(selectedChat.id)
      channelRef.current = supabase
        .channel(`landlord_messages:${selectedChat.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${selectedChat.id}` }, payload => {
          setMessages(prev => [...prev, payload.new])
          setIsTyping(false)
        })
        .on('broadcast', { event: 'typing' }, ({ payload }) => {
          if (payload.sender_id !== profile.id) {
            setIsTyping(true)
            clearTimeout(typingTimeoutRef.current)
            typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 2000)
          }
        })
        .subscribe()
      return () => supabase.removeChannel(channelRef.current)
    }
  }, [selectedChat])

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const fetchChats = async () => {
    const { data, error } = await supabase
      .from('chats')
      .select(`*, listings (title, type), profiles!chats_student_id_fkey (full_name, matric_number)`)
      .eq('landlord_id', profile.id)
      .order('created_at', { ascending: false })
    if (!error) {
      setChats(data)
      if (data.length > 0 && !searchParams.get('chat')) setSelectedChat(data[0])
    }
    setLoading(false)
  }

  const fetchMessages = async (chatId) => {
    const { data, error } = await supabase.from('messages').select('*, profiles (full_name, role)').eq('chat_id', chatId).order('created_at', { ascending: true })
    if (!error) setMessages(data)
  }

  const handleTyping = () => {
    if (channelRef.current) {
      channelRef.current.send({ type: 'broadcast', event: 'typing', payload: { sender_id: profile.id } })
    }
  }

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedChat) return
    const { error } = await supabase.from('messages').insert({ chat_id: selectedChat.id, sender_id: profile.id, text: newMessage.trim() })
    if (!error) setNewMessage('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--beige)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'var(--text-muted)' }}>Loading chats...</div>
    </div>
  )

  return (
    <div className="dashboard-layout" style={{ minHeight: '100vh', background: 'var(--beige)', display: 'grid', gridTemplateColumns: '240px 1fr' }}>
      <MobileNav links={SIDEBAR_LINKS} />

      {/* SIDEBAR */}
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
              <div style={{ fontSize: '0.72rem', color: profile?.verified ? '#4ade80' : 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                {profile?.verified ? <><BadgeCheck size={12} /> Verified</> : <><Clock size={12} /> Pending</>}
              </div>
            </div>
          </div>
          <button onClick={async () => { await signOut(); window.location.href = '/' }} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', marginTop: '0.8rem', fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', fontFamily: 'DM Sans, sans-serif', padding: 0 }}>
            <LogOut size={14} /> Logout
          </button>
        </div>
      </div>

      {/* CHAT LAYOUT */}
      <div className="chat-layout" style={{ display: 'grid', gridTemplateColumns: '300px 1fr', height: '100vh', overflow: 'hidden' }}>
        <div style={{ borderRight: '1px solid var(--beige-dark)', overflowY: 'auto', background: 'var(--card)' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--beige-dark)' }}>
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.2rem', fontWeight: 900, color: 'var(--blue-dark)' }}>Student Chats</h2>
          </div>
          {chats.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <MessageSquare size={32} style={{ margin: '0 auto 0.8rem', opacity: 0.4 }} />
              <p style={{ fontSize: '0.85rem', fontWeight: 600 }}>No chats yet</p>
              <p style={{ fontSize: '0.78rem', marginTop: '0.3rem' }}>Students will message you once your listings are live</p>
            </div>
          ) : (
            chats.map(chat => (
              <div key={chat.id} onClick={() => setSelectedChat(chat)} style={{ padding: '1.2rem 1.4rem', cursor: 'pointer', background: selectedChat?.id === chat.id ? 'var(--beige)' : 'transparent', borderBottom: '1px solid var(--beige-dark)', borderLeft: `3px solid ${selectedChat?.id === chat.id ? 'var(--orange)' : 'transparent'}`, transition: 'all 0.2s' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.8rem' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontFamily: 'Playfair Display, serif', flexShrink: 0 }}>
                    {chat.profiles?.full_name?.charAt(0) || 'S'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text)', marginBottom: '0.2rem' }}>{chat.profiles?.full_name || 'Student'}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>{chat.profiles?.matric_number}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--orange)', fontWeight: 600 }}>{chat.listings?.title}</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {selectedChat ? (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
            <div style={{ padding: '1.2rem 1.6rem', background: 'var(--card)', borderBottom: '1px solid var(--beige-dark)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontFamily: 'Playfair Display, serif' }}>
                {selectedChat.profiles?.full_name?.charAt(0) || 'S'}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)' }}>{selectedChat.profiles?.full_name || 'Student'}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--orange)', fontWeight: 600 }}>{selectedChat.listings?.title}</div>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.8rem', background: 'var(--beige)' }}>
              {messages.length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '2rem' }}>
                  <MessageSquare size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.4 }} />
                  <p style={{ fontSize: '0.85rem' }}>Start the conversation!</p>
                </div>
              )}
              {messages.map((msg) => {
                const isMe = msg.sender_id === profile.id
                return (
                  <div key={msg.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                    <div style={{ maxWidth: '65%', padding: '0.75rem 1rem', borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px', background: isMe ? 'var(--blue)' : 'var(--card)', color: isMe ? 'white' : 'var(--text)', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                      <p style={{ fontSize: '0.88rem', lineHeight: 1.5, margin: 0 }}>{msg.text}</p>
                      <div style={{ fontSize: '0.68rem', marginTop: '0.3rem', opacity: 0.7, textAlign: isMe ? 'right' : 'left' }}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                )
              })}
              {isTyping && (
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div style={{ padding: '0.75rem 1rem', borderRadius: '18px 18px 18px 4px', background: 'var(--card)', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    {[0, 1, 2].map(i => (
                      <div key={i} style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--text-muted)', animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div style={{ padding: '0.6rem 1.6rem', background: 'rgba(27,58,107,0.05)', borderTop: '1px solid var(--beige-dark)', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
              <Lock size={12} /> Contact details shared only after viewing is confirmed
            </div>

            <div style={{ padding: '1rem 1.6rem', background: 'var(--card)', borderTop: '1px solid var(--beige-dark)', display: 'flex', gap: '0.8rem', alignItems: 'flex-end' }}>
              <textarea value={newMessage} onChange={e => { setNewMessage(e.target.value); handleTyping() }} onKeyDown={handleKeyDown} placeholder="Type a message... (Enter to send)" rows={1} style={{ flex: 1, padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid var(--beige-dark)', background: 'var(--beige)', fontSize: '0.88rem', color: 'var(--text)', fontFamily: 'DM Sans, sans-serif', resize: 'none', outline: 'none' }} />
              <button onClick={handleSend} style={{ background: 'var(--blue)', color: 'white', width: '42px', height: '42px', borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Send size={18} />
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            <div style={{ textAlign: 'center' }}>
              <MessageSquare size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
              <p style={{ fontWeight: 600 }}>Select a chat to reply</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
import { Link } from 'react-router-dom'
import Navbar from '../../components/common/Navbar'
import Footer from '../../components/common/Footer'

export default function LandingPage() {
  return (
    <div>
      <Navbar />

      {/* HERO */}
      <section className="hero-grid" style={{
        minHeight: '100vh',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        alignItems: 'center',
        padding: '7rem 5% 4rem',
        gap: '3rem',
      }}>

        {/* Left Side */}
        <div>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'var(--blue)',
            color: 'white',
            fontSize: '0.78rem',
            fontWeight: 600,
            padding: '0.4rem 1rem',
            borderRadius: '50px',
            marginBottom: '1.5rem',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            ✈️ Built for <span style={{ color: 'var(--orange)' }}>&nbsp;AFIT Students</span>
          </div>

          <h1 style={{
            fontFamily: 'Playfair Display, serif',
            fontSize: 'clamp(2.4rem, 4vw, 3.6rem)',
            fontWeight: 900,
            lineHeight: 1.1,
            color: 'var(--blue-dark)',
            marginBottom: '1.5rem',
          }}>
            Find Your <span style={{ color: 'var(--orange)' }}>Perfect</span><br />
            Home in Barkallahu and Agric Quarters.
          </h1>

          <p style={{
            color: 'var(--text-muted)',
            fontSize: '1.05rem',
            lineHeight: 1.7,
            maxWidth: '480px',
            marginBottom: '2.5rem',
          }}>
            No agent stress. No hidden fees. Connect directly with verified
            landlords and find your next home — all in one place.
          </p>

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <Link to="/listings" style={{
              background: 'var(--orange)',
              color: 'white',
              padding: '0.85rem 2rem',
              borderRadius: '50px',
              fontWeight: 600,
              fontSize: '0.95rem',
              textDecoration: 'none',
              boxShadow: '0 4px 20px rgba(249,115,22,0.35)',
            }}>
              🏠 Browse Listings
            </Link>
            <Link to="/landlord/signup" style={{
              background: 'transparent',
              color: 'var(--blue)',
              padding: '0.85rem 2rem',
              borderRadius: '50px',
              fontWeight: 600,
              fontSize: '0.95rem',
              textDecoration: 'none',
              border: '2px solid var(--blue)',
            }}>
              List Your Property
            </Link>
          </div>

          {/* Stats */}
          <div style={{
            display: 'flex',
            gap: '2rem',
            marginTop: '3rem',
            paddingTop: '2rem',
            borderTop: '1px solid var(--beige-dark)',
          }}>
            {[
              { number: '50+', label: 'Verified Listings' },
              { number: '30+', label: 'Landlords' },
              { number: '100%', label: 'Verified & Safe' },
            ].map((stat) => (
              <div key={stat.label}>
                <h3 style={{
                  fontFamily: 'Playfair Display, serif',
                  fontSize: '1.8rem',
                  fontWeight: 900,
                  color: 'var(--blue)',
                }}>
                  {stat.number}
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side - Hero Card */}
        <div style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
          <div style={{
            background: 'var(--card)',
            borderRadius: '24px',
            overflow: 'hidden',
            boxShadow: '0 24px 80px rgba(15,31,61,0.15)',
            width: '100%',
            maxWidth: '400px',
          }}>
            <div style={{
              height: '220px',
              background: 'linear-gradient(135deg, var(--blue) 0%, #2A5298 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '5rem',
              position: 'relative',
            }}>
              🏡
              <div style={{
                position: 'absolute',
                top: '1rem', left: '1rem',
                background: 'var(--orange)',
                color: 'white',
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '0.3rem 0.8rem',
                borderRadius: '50px',
                textTransform: 'uppercase',
              }}>
                Available Now
              </div>
            </div>
            <div style={{ padding: '1.4rem' }}>
              <div style={{
                fontFamily: 'Playfair Display, serif',
                fontSize: '1.5rem',
                fontWeight: 900,
                color: 'var(--blue)',
                marginBottom: '0.3rem',
              }}>
                ₦250,000 <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.85rem', fontWeight: 400, color: 'var(--text-muted)' }}>/ year</span>
              </div>
              <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.8rem' }}>
                2-Bedroom Self-Contain — Barkallahu
              </div>
              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <span>🛏️ 2 Rooms</span>
                <span>🚿 Bathroom</span>
                <span>⚡ Power</span>
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: '1.2rem',
                paddingTop: '1rem',
                borderTop: '1px solid var(--beige-dark)',
              }}>
                <span style={{ fontSize: '0.78rem', color: '#16A34A', fontWeight: 600 }}>✅ Verified Landlord</span>
                <Link to="/listings" style={{
                  background: 'var(--blue)',
                  color: 'white',
                  padding: '0.5rem 1.1rem',
                  borderRadius: '50px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  textDecoration: 'none',
                }}>
                  View Details
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" style={{ padding: '6rem 5%' }}>
        <div style={{ textTransform: 'uppercase', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '1.5px', color: 'var(--orange)', marginBottom: '0.8rem' }}>
          Simple Process
        </div>
        <h2 style={{
          fontFamily: 'Playfair Display, serif',
          fontSize: 'clamp(1.8rem, 3vw, 2.6rem)',
          fontWeight: 900,
          color: 'var(--blue-dark)',
          marginBottom: '1rem',
        }}>
          How AFIT Nests Works
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '1rem', lineHeight: 1.7, maxWidth: '480px', marginBottom: '3rem' }}>
          From browsing to moving in — we made it as simple as possible for every AFIT student.
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.5rem',
        }}>
          {[
            { number: '01', icon: '🔍', title: 'Browse Listings', desc: 'Filter by price, room type, and amenities. All listings are in the Barkallahu area — close to AFIT.' },
            { number: '02', icon: '💬', title: 'Chat with Landlord', desc: 'Message the landlord directly through the app. No agents. No commission. Just real conversation.' },
            { number: '03', icon: '📅', title: 'Book a Viewing', desc: 'Schedule a physical visit through the app. The landlord confirms and you get their contact details.' },
            { number: '04', icon: '🏠', title: 'Move In', desc: 'Agree on terms directly with your landlord and move into your new home. Simple as that.' },
          ].map((step) => (
            <div key={step.number} style={{
              background: 'var(--card)',
              borderRadius: '20px',
              padding: '2rem',
              border: '1px solid var(--beige-dark)',
            }}>
              <div style={{
                fontFamily: 'Playfair Display, serif',
                fontSize: '3rem',
                fontWeight: 900,
                color: 'var(--beige-dark)',
                lineHeight: 1,
                marginBottom: '1rem',
              }}>
                {step.number}
              </div>
              <div style={{ fontSize: '1.8rem', marginBottom: '0.8rem' }}>{step.icon}</div>
              <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.5rem' }}>{step.title}</div>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* WHY AFIT NESTS */}
      <section style={{ padding: '6rem 5%', background: 'var(--card)' }}>
        <div style={{ textTransform: 'uppercase', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '1.5px', color: 'var(--orange)', marginBottom: '0.8rem' }}>
          Why Us
        </div>
        <h2 style={{
          fontFamily: 'Playfair Display, serif',
          fontSize: 'clamp(1.8rem, 3vw, 2.6rem)',
          fontWeight: 900,
          color: 'var(--blue-dark)',
          marginBottom: '1rem',
        }}>
          Built Specifically for AFIT Students
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '1rem', lineHeight: 1.7, maxWidth: '480px', marginBottom: '3rem' }}>
          We understand the struggle of finding accommodation near AFIT. We built AFIT Nests to fix it.
        </p>

        <div className="why-grid" style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '1.2rem',
        }}>
          {[
            { icon: '✅', title: 'Verified Landlords', desc: 'Every landlord is physically verified by our team before they can list a property.' },
            { icon: '🚫', title: 'No Agent Wahala', desc: 'Connect directly with landlords. No agent commission. No unnecessary fees.' },
            { icon: '💬', title: 'In-App Chat', desc: 'All communication stays in the app. Dispute? We can review the chat history.' },
            { icon: '📅', title: 'Viewing Scheduler', desc: 'Book a physical viewing slot and get contact details only after confirmation.' },
          ].map((item) => (
            <div key={item.title} style={{
              background: 'var(--beige)',
              borderRadius: '16px',
              padding: '1.6rem',
              border: '1px solid var(--beige-dark)',
              display: 'flex',
              gap: '1rem',
              alignItems: 'flex-start',
            }}>
              <div style={{
                width: '44px', height: '44px',
                borderRadius: '12px',
                background: 'rgba(27,58,107,0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.3rem',
                flexShrink: 0,
              }}>
                {item.icon}
              </div>
              <div>
                <h4 style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.3rem' }}>{item.title}</h4>
                <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ margin: '4rem 5%' }}>
        <div className="cta-section" style={{
          background: 'var(--blue)',
          borderRadius: '28px',
          padding: '4rem',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <h2 style={{
            fontFamily: 'Playfair Display, serif',
            fontSize: 'clamp(1.8rem, 3vw, 2.4rem)',
            fontWeight: 900,
            color: 'white',
            marginBottom: '1rem',
            position: 'relative',
            zIndex: 1,
          }}>
            Ready to Find Your Home?
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '2rem', position: 'relative', zIndex: 1 }}>
            Join hundreds of AFIT students who found their accommodation stress-free.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
            <Link to="/listings" style={{
              background: 'white',
              color: 'var(--blue)',
              padding: '0.85rem 2rem',
              borderRadius: '50px',
              fontWeight: 700,
              fontSize: '0.95rem',
              textDecoration: 'none',
            }}>
              🏠 Browse Listings
            </Link>
            <Link to="/landlord/signup" style={{
              background: 'transparent',
              color: 'white',
              padding: '0.85rem 2rem',
              borderRadius: '50px',
              fontWeight: 600,
              fontSize: '0.95rem',
              textDecoration: 'none',
              border: '2px solid rgba(255,255,255,0.4)',
            }}>
              List Your Property
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
import { useState } from 'react'
import { ShieldCheck, ShieldAlert, Copy, Check } from 'lucide-react'
import { api } from '../../lib/apiClient'
import { useAuth } from '../../context/AuthContext'

// Two-factor (TOTP) enrollment card. Manual key entry is used instead of a rendered
// QR code so the shared secret is never sent to a third-party QR service.
export default function MfaCard() {
  const { profile, refreshUser } = useAuth()
  const enabled = Boolean(profile?.totp_enabled)

  const [setup, setSetup] = useState(null) // { secret, otpauthUrl }
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)

  const beginSetup = async () => {
    setError(null); setBusy(true)
    try {
      const result = await api.auth.mfaSetup()
      setSetup(result)
    } catch (e) {
      setError(e.message || 'Could not start MFA setup.')
    } finally {
      setBusy(false)
    }
  }

  const confirmEnable = async () => {
    if (!/^\d{6}$/.test(code)) { setError('Enter the 6-digit code from your app.'); return }
    setError(null); setBusy(true)
    try {
      await api.auth.mfaEnable(code)
      setSetup(null); setCode('')
      await refreshUser()
    } catch (e) {
      setError(e.message || 'Could not enable MFA.')
    } finally {
      setBusy(false)
    }
  }

  const disable = async () => {
    if (!/^\d{6}$/.test(code)) { setError('Enter a current 6-digit code to disable.'); return }
    setError(null); setBusy(true)
    try {
      await api.auth.mfaDisable(code)
      setCode('')
      await refreshUser()
    } catch (e) {
      setError(e.message || 'Could not disable MFA.')
    } finally {
      setBusy(false)
    }
  }

  const copySecret = async () => {
    try {
      await navigator.clipboard.writeText(setup.secret)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch { /* clipboard unavailable */ }
  }

  return (
    <div style={{ background: 'var(--card)', borderRadius: '20px', padding: '1.8rem', border: '1px solid var(--beige-dark)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
        {enabled
          ? <ShieldCheck size={20} color="#16A34A" />
          : <ShieldAlert size={20} color="var(--orange)" />}
        <h3 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--blue)' }}>Two-Factor Authentication</h3>
      </div>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>
        {enabled
          ? 'MFA is active. A code from your authenticator app is required at every login.'
          : 'Protect this account with a time-based one-time code (Google Authenticator, Authy, 1Password, etc.).'}
      </p>

      {error && (
        <div style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: '10px', padding: '0.6rem 0.9rem', marginBottom: '0.9rem', color: '#DC2626', fontSize: '0.82rem' }}>
          {error}
        </div>
      )}

      {!enabled && !setup && (
        <button onClick={beginSetup} disabled={busy} style={primaryBtn(busy)}>
          {busy ? 'Starting…' : 'Enable MFA'}
        </button>
      )}

      {!enabled && setup && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text)', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              1. Add this key to your authenticator app
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <code style={{ flex: 1, background: 'var(--beige)', border: '1px solid var(--beige-dark)', borderRadius: '10px', padding: '0.6rem 0.8rem', fontSize: '0.9rem', letterSpacing: '0.08em', wordBreak: 'break-all' }}>
                {setup.secret}
              </code>
              <button onClick={copySecret} title="Copy" style={{ background: 'var(--beige)', border: '1px solid var(--beige-dark)', borderRadius: '10px', padding: '0.55rem', cursor: 'pointer', display: 'flex' }}>
                {copied ? <Check size={16} color="#16A34A" /> : <Copy size={16} />}
              </button>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.35rem' }}>
              Issuer: AFIT Nests · Account: {profile?.email || profile?.full_name} · Type: Time-based
            </p>
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text)', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              2. Enter the 6-digit code it shows
            </div>
            <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} inputMode="numeric" maxLength={6} placeholder="123456" style={codeInput} />
          </div>
          <button onClick={confirmEnable} disabled={busy} style={primaryBtn(busy)}>
            {busy ? 'Verifying…' : 'Verify & Turn On'}
          </button>
        </div>
      )}

      {enabled && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
          <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} inputMode="numeric" maxLength={6} placeholder="Current code to disable" style={codeInput} />
          <button onClick={disable} disabled={busy} style={{ ...primaryBtn(busy), background: busy ? 'var(--text-muted)' : '#DC2626' }}>
            {busy ? 'Working…' : 'Disable MFA'}
          </button>
        </div>
      )}
    </div>
  )
}

const primaryBtn = (busy) => ({
  background: busy ? 'var(--text-muted)' : 'var(--blue)', color: 'white', padding: '0.8rem 1.2rem',
  borderRadius: '12px', fontWeight: 700, fontSize: '0.88rem', border: 'none',
  cursor: busy ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif',
})

const codeInput = {
  width: '100%', padding: '0.7rem 1rem', borderRadius: '12px', border: '1px solid var(--beige-dark)',
  background: 'var(--beige)', fontSize: '1rem', letterSpacing: '0.25em', textAlign: 'center',
  color: 'var(--text)', fontFamily: 'DM Sans, sans-serif', outline: 'none', boxSizing: 'border-box',
}

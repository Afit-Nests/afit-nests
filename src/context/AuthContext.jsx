import { createContext, useContext, useEffect, useState } from 'react'
import { api } from '../lib/apiClient'

const AuthContext = createContext({})

const toAuthState = (user) => ({
  user: user ?? null,
  profile: user ?? null,
})

const asAuthError = (error, fallback = 'Request failed. Please try again.') => ({
  error: { message: error?.message || fallback },
})

function apiBaseUrl() {
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api'
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const applyUser = (nextUser) => {
    const state = toAuthState(nextUser)
    setUser(state.user)
    setProfile(state.profile)
  }

  const refreshUser = async () => {
    try {
      const { user: sessionUser } = await api.auth.me()
      applyUser(sessionUser)
      return sessionUser
    } catch {
      return null
    }
  }

  useEffect(() => {
    let active = true

    api.auth.me()
      .then(({ user: sessionUser }) => {
        if (active) applyUser(sessionUser)
      })
      .catch(() => {
        if (active) applyUser(null)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const signUpStudent = async ({ email, password, fullName, matricNumber, department, phone }) => {
    try {
      const { user: createdUser } = await api.auth.registerStudent({
        email,
        password,
        fullName,
        matricNumber,
        department,
        phone,
      })
      applyUser(createdUser)
      return { error: null }
    } catch (error) {
      return asAuthError(error, 'Student signup failed.')
    }
  }

  const signUpLandlord = async ({ phone, password, fullName, nin, address }) => {
    try {
      const { user: createdUser } = await api.auth.registerLandlord({
        phone,
        password,
        fullName,
        nin,
        address,
      })
      applyUser(createdUser)
      return { error: null }
    } catch (error) {
      return asAuthError(error, 'Landlord signup failed.')
    }
  }

  const signInStudent = async ({ email, password }) => {
    try {
      const { user: signedInUser } = await api.auth.login({ email, password, role: 'student' })
      applyUser(signedInUser)
      return { error: null }
    } catch (error) {
      return asAuthError(error, 'Invalid email or password.')
    }
  }

  const signInLandlord = async ({ phone, password }) => {
    try {
      const { user: signedInUser } = await api.auth.login({ phone, password, role: 'landlord' })
      applyUser(signedInUser)
      return { error: null }
    } catch (error) {
      return asAuthError(error, 'Invalid phone number or password.')
    }
  }

  const signInAdmin = async ({ email, password, totpCode }) => {
    try {
      const body = { email, password, role: 'admin' }
      if (totpCode) body.totpCode = totpCode
      const { user: signedInUser, mfaRequired } = await api.auth.login(body)
      if (mfaRequired) return { error: null, mfaRequired: true }
      applyUser(signedInUser)
      return { error: null }
    } catch (error) {
      return asAuthError(error, 'Invalid admin credentials.')
    }
  }

  // Server-side OAuth redirect flow. The browser is sent to the backend's
  // /api/auth/google/start, which mints a PKCE challenge + state, stashes
  // them in a short-lived signed cookie, and 302s to Google's authorize
  // URL. Google bounces the user to /api/auth/google/callback, which
  // exchanges the code server-to-server, sets the session cookie, and
  // redirects back here. On landing, /student/dashboard's ProtectedRoute
  // sees the new session and the user is signed in.
  //
  // Returning { error: null } here would be misleading because the actual
  // sign-in completes on a different page. We signal success by NOT
  // returning an error — callers should `return` from the click handler
  // without further navigation. The browser will navigate itself.
  const signInWithGoogle = async () => {
    try {
      const base = apiBaseUrl()
      window.location.assign(`${base}/auth/google/start`)
      return { error: null }
    } catch (error) {
      return asAuthError(error, 'Google sign-in failed. Please try again.')
    }
  }

  const isGoogleAuthConfigured = async () => {
    // We do not know whether the server is configured for Google from
    // the SPA alone (no env leak). The server returns a redirect with
    // ?google=error=google_not_configured on a hit when it isn't, so the
    // best UX is to show the button always and let the server surface the
    // error. Returning true here keeps the button enabled in dev where
    // the env is set.
    return true
  }

  const unlinkGoogle = async (password) => {
    try {
      await api.auth.unlinkGoogle(password)
      // The session user object has google_sub = null now. Refresh from the
      // server so the UI reflects the new state without a full reload.
      await refreshUser()
      return { error: null }
    } catch (error) {
      return asAuthError(error, 'Could not unlink Google. Check your password and try again.')
    }
  }

  const signOut = async () => {
    await api.auth.logout().catch(() => null)
    applyUser(null)
  }

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      refreshUser,
      signUpStudent,
      signUpLandlord,
      signInStudent,
      signInLandlord,
      signInAdmin,
      signInWithGoogle,
      unlinkGoogle,
      isGoogleAuthConfigured,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

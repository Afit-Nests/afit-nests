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

  const signInWithGoogle = async () => ({
    error: { message: 'Google login is disabled until OAuth is implemented on the production backend.' },
  })

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
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

// Send confirmation email via Resend
const sendConfirmationEmail = async ({ email, fullName, matricNumber, department }) => {
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'AFIT Nests <onboarding@resend.dev>',
        to: email,
        subject: '🏠 Welcome to AFIT Nests!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #F5F0E8; padding: 2rem; border-radius: 16px;">
            
            <div style="text-align: center; margin-bottom: 2rem;">
              <h1 style="font-family: Georgia, serif; color: #1B3A6B; font-size: 2rem; margin: 0;">
                AFIT <span style="color: #F97316;">Nests</span>
              </h1>
              <p style="color: #6B7280; font-size: 0.9rem; margin-top: 0.3rem;">Student Housing Platform</p>
            </div>

            <div style="background: white; border-radius: 12px; padding: 2rem; margin-bottom: 1.5rem;">
              <h2 style="color: #0F1F3D; font-family: Georgia, serif; margin-top: 0;">Welcome, ${fullName}! 🎉</h2>
              <p style="color: #4B5563; line-height: 1.7;">
                Your AFIT Nests account has been created successfully. You can now browse verified listings, chat with landlords, and book viewings — all without agent fees.
              </p>
            </div>

            <div style="background: white; border-radius: 12px; padding: 2rem; margin-bottom: 1.5rem;">
              <h3 style="color: #1B3A6B; margin-top: 0; font-size: 1rem;">📋 Your Account Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 0.6rem 0; color: #6B7280; font-size: 0.85rem; border-bottom: 1px solid #F5F0E8;">Email</td>
                  <td style="padding: 0.6rem 0; color: #0F1F3D; font-weight: 600; font-size: 0.85rem; border-bottom: 1px solid #F5F0E8; text-align: right;">${email}</td>
                </tr>
                <tr>
                  <td style="padding: 0.6rem 0; color: #6B7280; font-size: 0.85rem; border-bottom: 1px solid #F5F0E8;">Matric Number</td>
                  <td style="padding: 0.6rem 0; color: #0F1F3D; font-weight: 600; font-size: 0.85rem; border-bottom: 1px solid #F5F0E8; text-align: right;">${matricNumber}</td>
                </tr>
                <tr>
                  <td style="padding: 0.6rem 0; color: #6B7280; font-size: 0.85rem;">Department</td>
                  <td style="padding: 0.6rem 0; color: #0F1F3D; font-weight: 600; font-size: 0.85rem; text-align: right;">${department}</td>
                </tr>
              </table>
            </div>

            <div style="text-align: center; margin-bottom: 1.5rem;">
              <a href="https://afitnests.com/listings" style="background: #F97316; color: white; padding: 0.85rem 2rem; border-radius: 50px; text-decoration: none; font-weight: 700; font-size: 0.95rem; display: inline-block;">
                🏠 Browse Listings Now
              </a>
            </div>

            <div style="background: rgba(27,58,107,0.06); border-radius: 12px; padding: 1.2rem; margin-bottom: 1.5rem;">
              <p style="color: #4B5563; font-size: 0.82rem; margin: 0; line-height: 1.6;">
                💡 <strong>Safety tip:</strong> Always book a viewing before making any payment. Never pay outside the agreed process. All landlords on AFIT Nests are physically verified.
              </p>
            </div>

            <p style="text-align: center; color: #9CA3AF; font-size: 0.78rem;">
              © 2025 AFIT Nests · Barkallahu, Kaduna<br/>
              Built for AFIT Students
            </p>
          </div>
        `,
      }),
    })
  } catch (err) {
    console.error('Email send failed:', err)
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
  setUser(session?.user ?? null)
  if (session?.user) {
    // Only run profile creation check for Google OAuth users
    if (event === 'SIGNED_IN' && session.user.app_metadata?.provider === 'google') {
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', session.user.id)
        .single()

      if (!existingProfile) {
        await supabase.from('profiles').insert({
          id: session.user.id,
          role: 'student',
          full_name: session.user.user_metadata?.full_name || '',
          phone: '',
          matric_number: '',
          department: '',
        })
      }
    }
    fetchProfile(session.user.id)
  } else {
    setProfile(null)
    setLoading(false)
  }
})

    return () => subscription.unsubscribe()
  }, [])

  const fetchProfile = async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (!error) setProfile(data)
    setLoading(false)
  }

  const signUpStudent = async ({ email, password, fullName, matricNumber, department, phone }) => {
    const { data, error } = await supabase.auth.signUp({ email, password })
if (error) return { error }

const userId = data.user?.id ?? data.session?.user?.id
if (!userId) return { error: { message: 'Signup failed. Please try again.' } }

const { error: profileError } = await supabase.from('profiles').insert({
  id: userId,
  role: 'student',
  full_name: fullName,
  matric_number: matricNumber,
  department,
  phone,
})

    if (!profileError) {
      // Send confirmation email
      await sendConfirmationEmail({ email, fullName, matricNumber, department })
    }

    return { error: profileError }
  }

  const signUpLandlord = async ({ phone, password, fullName, nin, address }) => {
    const email = `landlord_${phone}@afitnests.com`
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) return { error }

    const { error: profileError } = await supabase.from('profiles').insert({
      id: data.user.id,
      role: 'landlord',
      full_name: fullName,
      phone,
      nin,
      address,
      verified: false,
    })

    return { error: profileError }
  }

  const signInStudent = async ({ email, password }) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  const signInLandlord = async ({ phone, password }) => {
    const email = `landlord_${phone}@afitnests.com`
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/student/dashboard`,
      },
    })
    return { error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      signUpStudent,
      signUpLandlord,
      signInStudent,
      signInLandlord,
      signInWithGoogle,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
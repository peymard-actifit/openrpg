import { createContext, useContext, useState, useEffect } from 'react'
import * as api from '../lib/api'

const AuthContext = createContext({})

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Vérifier si déjà connecté
    if (api.isAuthenticated()) {
      fetchCurrentUser()
    } else {
      setLoading(false)
    }
  }, [])

  async function fetchCurrentUser() {
    try {
      const data = await api.getMe()
      setUser(data.user)
      setProfile(data.profile)
    } catch (err) {
      // Token invalide, déconnecter
      api.logout()
      setUser(null)
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }

  async function signUp(email, password) {
    try {
      const data = await api.register(email, password)
      setUser(data.user)
      return { data, error: null }
    } catch (err) {
      return { data: null, error: err }
    }
  }

  async function signIn(email, password) {
    try {
      const data = await api.login(email, password)
      setUser(data.user)
      // Récupérer le profil
      try {
        const profileData = await api.getProfile()
        setProfile(profileData)
      } catch {
        setProfile(null)
      }
      return { data, error: null }
    } catch (err) {
      return { data: null, error: err }
    }
  }

  async function signOut() {
    api.logout()
    setUser(null)
    setProfile(null)
    return { error: null }
  }

  async function createProfile(profileData) {
    try {
      const data = await api.createProfile(profileData)
      setProfile(data)
      return { data, error: null }
    } catch (err) {
      return { data: null, error: err }
    }
  }

  async function refreshProfile() {
    try {
      const data = await api.getProfile()
      setProfile(data)
    } catch {
      setProfile(null)
    }
  }

  const value = {
    user,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    createProfile,
    refreshProfile
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

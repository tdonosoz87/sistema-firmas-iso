import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../services/supabaseClient'
import { getUserProfile } from '../services/authService'

const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Verificar sesión inicial al cargar la página
    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setUser(session.user)
        try {
          const userProfile = await getUserProfile(session.user.id)
          setProfile(userProfile)
        } catch (err) {
          console.error("Error al obtener el perfil:", err)
        }
      }
      setLoading(false)
    }

    fetchSession()

    // Escuchar cambios en la autenticación (Login, Logout)
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user)
        const userProfile = await getUserProfile(session.user.id)
        setProfile(userProfile)
      } else {
        setUser(null)
        setProfile(null)
      }
      setLoading(false)
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)